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

    // 2. Ensure user and wallet exist
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: session.user.email || 'user@firuzo.com',
          name: session.user.name || 'Firuzo User',
          passwordHash: 'dummy',
          wallet: {
            create: { balances: JSON.stringify({ IRR: 150000000, USDT: 250 }) }
          }
        }
      });
    }

    // 3. Create Booking in DRAFT state
    const booking = await prisma.booking.create({
      data: {
        userId: userId,
        type: parsed.type,
        status: 'DRAFT',
        totalAmount,
        currency,
        details: JSON.stringify(parsed),
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
    if (booking.userId !== userId) throw new Error('Unauthorized');
    if (booking.status !== 'DRAFT') throw new Error('Booking already paid or cancelled');

    const wallet = await prisma.wallet.findUnique({ where: { userId: userId } });
    if (!wallet) throw new Error('Wallet not found');

    const balances = JSON.parse(wallet.balances);
    
    // Begin Transaction
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (method === 'wallet_irr') {
        if ((balances[booking.currency] || 0) < Number(booking.totalAmount)) {
          throw new Error('Insufficient wallet balance');
        }
        balances[booking.currency] -= Number(booking.totalAmount);
        
        // Update Wallet
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balances: JSON.stringify(balances) }
        });

        // Create Wallet Transaction
        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            bookingId: booking.id,
            type: 'PAYMENT',
            amount: booking.totalAmount,
            currency: booking.currency,
            description: `Payment for booking ${booking.id}`,
            idempotencyKey: `pay_${booking.id}`
          }
        });
      }

      // Mark Booking as Confirmed
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'CONFIRMED' }
      });
      
      // Audit log
      await tx.auditLog.create({
        data: {
          userId: userId,
          action: 'booking_paid',
          entity: 'Booking',
          entityId: booking.id,
          diff: JSON.stringify({ method, amount: booking.totalAmount })
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
