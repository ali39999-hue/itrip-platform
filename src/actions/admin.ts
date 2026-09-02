'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

// Helper to check permissions
async function checkPermission(requiredRoles: string[]) {
  const session = await auth();
  if (!session || !session.user) {
    throw new Error('Unauthorized');
  }
  
  if (!requiredRoles.includes(session.user.role)) {
    throw new Error('Forbidden: Insufficient permissions');
  }
  return session.user;
}

export async function getAdminFinanceStats() {
  try {
    await checkPermission(['SUPER_ADMIN', 'FINANCE']);

    // Get all ledger entries
    const entries = await prisma.ledgerEntry.findMany({
      include: {
        account: true,
      },
    });

    // We'll calculate balances per currency for customer accounts (IRR, USDT, AED, etc)
    const customerBalances: Record<string, number> = { IRR: 0, USDT: 0, AED: 0 };

    // We'll calculate inflows/outflows for platform
    let totalInflow = 0;
    let totalOutflow = 0;

    entries.forEach((entry) => {
      const amount = Number(entry.amount);

      // If it's a user account, update their total balances
      if (entry.account.ownerType === 'USER') {
        if (!customerBalances[entry.currency]) customerBalances[entry.currency] = 0;

        if (entry.direction === 'CREDIT') {
          customerBalances[entry.currency] += amount;
          // When users get credited (except for refunds), it's typically an inflow to the platform from external payment
          if (entry.referenceType === 'TOPUP') {
            totalInflow += amount;
          }
        } else {
          customerBalances[entry.currency] -= amount;
        }
      }

      // If it's an escrow account being credited from a booking, it's considered platform locked funds (outflow from user perspective)
      if (entry.account.ownerType === 'PLATFORM_ESCROW') {
        if (entry.direction === 'CREDIT' && entry.referenceType === 'BOOKING') {
          totalOutflow += amount;
        }
      }
    });

    const recentTransactions = await prisma.ledgerEntry.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { account: true },
    });

    return {
      success: true,
      balances: customerBalances,
      inflow: totalInflow,
      outflow: totalOutflow,
      recentTransactions,
    };
  } catch (err: unknown) {
    console.error('getAdminFinanceStats server error:', err);
    return { success: false, error: 'Failed to fetch financial stats' };
  }
}
export async function getAdminBookings() {
  try {
    await checkPermission(['SUPER_ADMIN', 'FINANCE', 'OPS']);

    const bookings = await prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        customer: { select: { name: true, email: true } },
        items: true,
      },
    });
    return { success: true, bookings };
  } catch (err: unknown) {
    console.error('getAdminBookings server error:', err);
    return { success: false, error: 'Failed to fetch admin bookings' };
  }
}

export async function refundBookingAdmin(bookingId: string) {
  try {
    const user = await checkPermission(['SUPER_ADMIN', 'FINANCE']);

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return { success: false, error: 'Booking not found' };
    if (booking.status !== 'CONFIRMED') return { success: false, error: 'Only confirmed bookings can be refunded' };

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Mark as CANCELLED (State Machine)
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });

      // 2. Double-Entry Ledger Refund Logic
      // Find or create customer account
      let customerAccount = await tx.account.findFirst({
        where: { ownerType: 'USER', ownerId: booking.customerId, currency: booking.currency },
      });

      if (!customerAccount) {
        customerAccount = await tx.account.create({
          data: { ownerType: 'USER', ownerId: booking.customerId, currency: booking.currency },
        });
      }

      // Find or create platform escrow account
      let escrowAccount = await tx.account.findFirst({
        where: { ownerType: 'PLATFORM_ESCROW', currency: booking.currency },
      });

      if (!escrowAccount) {
        escrowAccount = await tx.account.create({
          data: { ownerType: 'PLATFORM_ESCROW', currency: booking.currency },
        });
      }

      const idempotencyKey = `refund_${booking.id}_${Date.now()}`;

      // Debit Escrow (reduce platform hold)
      await tx.ledgerEntry.create({
        data: {
          groupId: idempotencyKey,
          accountId: escrowAccount.id,
          direction: 'DEBIT',
          amount: booking.totalAmount,
          currency: booking.currency,
          referenceType: 'REFUND',
          referenceId: booking.id,
        },
      });

      // Credit Customer (increase wallet)
      await tx.ledgerEntry.create({
        data: {
          groupId: idempotencyKey,
          accountId: customerAccount.id,
          direction: 'CREDIT',
          amount: booking.totalAmount,
          currency: booking.currency,
          referenceType: 'REFUND',
          referenceId: booking.id,
        },
      });

      // 3. Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'BOOKING_REFUNDED',
          resource: 'Booking',
          resourceId: booking.id,
        },
      });
    });

    revalidatePath('/admin/bookings');
    return { success: true };
  } catch (err: unknown) {
    console.error('refundBookingAdmin server error:', err);
    return { success: false, error: 'Refund processing failed' };
  }
}
