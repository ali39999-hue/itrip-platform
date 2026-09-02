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

import { BookingStateMachine, BookingState } from '@/domains/booking/state-machine';
import { GeneralLedgerService } from '@/domains/ledger/GeneralLedgerService';
import { v4 as uuidv4 } from 'uuid';

export async function refundBookingAdmin(bookingId: string) {
  try {
    const user = await checkPermission(['SUPER_ADMIN', 'FINANCE']);

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return { success: false, error: 'Booking not found' };
    if (booking.status !== 'CONFIRMED') return { success: false, error: 'Only confirmed bookings can be refunded' };

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Mark as CANCEL_REQUESTED (State Machine)
      BookingStateMachine.assertTransition(booking.status as BookingState, 'CANCEL_REQUESTED');
      BookingStateMachine.assertTransition('CANCEL_REQUESTED', 'CANCELLING');
      BookingStateMachine.assertTransition('CANCELLING', 'CANCELLED');
      BookingStateMachine.assertTransition('CANCELLED', 'REFUND_INITIATED');

      let history = [];
      try {
        if (booking.stateHistory) {
          history = JSON.parse(booking.stateHistory);
        }
      } catch (e) {
        if (e instanceof Error) {
            console.error(e);
        }
      }
      history.push('CANCEL_REQUESTED', 'CANCELLING', 'CANCELLED', 'REFUND_INITIATED');

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'REFUND_INITIATED', stateHistory: JSON.stringify(history), cancelledAt: new Date() },
      });

      // 2. Double-Entry Ledger Refund Logic via Domain Service
      const refundGroupId = uuidv4();
      
      await GeneralLedgerService.postRefund({
        groupId: refundGroupId,
        userId: booking.customerId,
        amount: booking.totalAmount.toNumber(),
        currency: booking.currency,
        referenceId: booking.id
      }, tx);

      BookingStateMachine.assertTransition('REFUND_INITIATED', 'REFUNDED');
      history.push('REFUNDED');

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'REFUNDED', stateHistory: JSON.stringify(history) },
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
