'use server';

import { prisma } from '@/lib/prisma';
import { bookingSchema } from '@/lib/validations';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';

export async function createBookingDraft(data: unknown, totalAmount: number, currency: string) {
  try {
    const session = await auth();
    if (!session || !session.user) throw new Error('Unauthorized');
    const userId = session.user.id;

    // 1. Validate data
    const parsed = bookingSchema.parse(data);

    // 2. Ensure user exists
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: session.user.email || 'user@firuzo.com',
          name: session.user.name || 'Firuzo User',
          passwordHash: 'dummy',
        }
      });
    }

    // Generate unique reference (e.g. ITR-Timestamp)
    const reference = `ITR-${Date.now()}`;

    // 3. Create Booking in DRAFT state
    const booking = await prisma.booking.create({
      data: {
        reference,
        customerId: userId,
        status: 'DRAFT',
        totalAmount,
        currency,
        items: {
          create: {
            type: parsed.type,
            netCost: totalAmount * 0.9, // mock 10% margin
            markup: totalAmount * 0.1,
            sellPrice: totalAmount,
            details: JSON.stringify(parsed)
          }
        }
      }
    });

    return { success: true, bookingId: booking.id };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'An error occurred';
    return { success: false, error };
  }
}

export async function payBooking(bookingId: string, method: 'wallet_irr' | 'gateway_shetab') {
  try {
    const session = await auth();
    if (!session || !session.user) throw new Error('Unauthorized');
    const userId = session.user.id;

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new Error('Booking not found');
    if (booking.customerId !== userId) throw new Error('Unauthorized');
    if (booking.status !== 'DRAFT') throw new Error('Booking already paid or cancelled');
    
    // Double-entry accounting
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      
      // Find or create Customer Account
      let customerAccount = await tx.account.findFirst({
        where: { ownerType: 'USER', ownerId: userId, currency: booking.currency }
      });
      
      if (!customerAccount) {
         // for demo purposes, assume we give them free money or they top up
         customerAccount = await tx.account.create({
            data: { ownerType: 'USER', ownerId: userId, currency: booking.currency }
         });
         
         // Demo: fund the customer account with initial balance
         await tx.ledgerEntry.create({
           data: {
             groupId: `demo_funding_${userId}`,
             accountId: customerAccount.id,
             direction: 'CREDIT',
             amount: 150000000,
             currency: booking.currency,
             referenceType: 'TOPUP',
           }
         });
      }

      // 1. Calculate customer balance from ledger
      const entries = await tx.ledgerEntry.findMany({
        where: { accountId: customerAccount.id }
      });
      const balance = entries.reduce((acc, entry) => {
        return entry.direction === 'CREDIT' ? acc + Number(entry.amount) : acc - Number(entry.amount);
      }, 0);

      if (method === 'wallet_irr') {
        if (balance < Number(booking.totalAmount)) {
          throw new Error('Insufficient wallet balance');
        }
        
        // Find or create Platform Escrow Account
        let escrowAccount = await tx.account.findFirst({
          where: { ownerType: 'PLATFORM_ESCROW', currency: booking.currency }
        });
        if (!escrowAccount) {
          escrowAccount = await tx.account.create({
            data: { ownerType: 'PLATFORM_ESCROW', currency: booking.currency }
          });
        }

        const idempotencyKey = `pay_${booking.id}_${Date.now()}`;

        // 2. Debit Customer
        await tx.ledgerEntry.create({
          data: {
            groupId: idempotencyKey,
            accountId: customerAccount.id,
            direction: 'DEBIT',
            amount: booking.totalAmount,
            currency: booking.currency,
            referenceType: 'BOOKING',
            referenceId: booking.id
          }
        });

        // 3. Credit Escrow
        await tx.ledgerEntry.create({
          data: {
            groupId: idempotencyKey,
            accountId: escrowAccount.id,
            direction: 'CREDIT',
            amount: booking.totalAmount,
            currency: booking.currency,
            referenceType: 'BOOKING',
            referenceId: booking.id
          }
        });
      }

      // 4. State Machine Transition: DRAFT -> CONFIRMED
      // (In real life, DRAFT -> PENDING_PAYMENT -> CONFIRMING_SUPPLIER -> CONFIRMED)
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'CONFIRMED' }
      });
      
      // 5. Outbox Event for async tasks (emails, ticketing)
      await tx.outboxEvent.create({
        data: {
          eventType: 'BOOKING_PAID',
          payload: JSON.stringify({ bookingId: booking.id })
        }
      });
      
      // 6. Audit log
      await tx.auditLog.create({
        data: {
          userId: userId,
          action: 'BOOKING_PAID',
          resource: 'Booking',
          resourceId: booking.id,
          newData: JSON.stringify({ method, amount: booking.totalAmount })
        }
      });
    });

    revalidatePath('/my-trips');
    return { success: true };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'An error occurred';
    return { success: false, error };
  }
}
