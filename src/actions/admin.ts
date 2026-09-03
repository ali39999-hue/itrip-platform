'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/domains/identity/permission-service';

export async function getAdminFinanceStats() {
  try {
    await requirePermission('finance:reports:view');

    // Customer wallet balances per currency — computed in SQL, not in JS memory.
    const userAccounts = await prisma.account.findMany({
      where: { ownerType: 'USER' },
      select: { id: true, currency: true },
    });

    const balances: Record<string, number> = { IRR: 0, USDT: 0, AED: 0 };
    if (userAccounts.length > 0) {
      const sums = await prisma.ledgerEntry.groupBy({
        by: ['accountId', 'direction'],
        where: { accountId: { in: userAccounts.map((a) => a.id) } },
        _sum: { amount: true },
      });
      const accountCurrency = new Map(userAccounts.map((a) => [a.id, a.currency]));
      for (const row of sums) {
        const currency = accountCurrency.get(row.accountId);
        if (!currency) continue;
        const delta = Number(row._sum.amount || 0) * (row.direction === 'CREDIT' ? 1 : -1);
        balances[currency] = (balances[currency] ?? 0) + delta;
      }
    }

    // Platform funds: inflow = money collected into escrow,
    // outflow = refunds paid out of escrow. Per currency in SQL.
    const escrowAccounts = await prisma.account.findMany({
      where: { ownerType: 'PLATFORM_ESCROW' },
      select: { id: true, currency: true },
    });
    const inflowByCurrency: Record<string, number> = {};
    const outflowByCurrency: Record<string, number> = {};
    if (escrowAccounts.length > 0) {
      const escrowEntries = await prisma.ledgerEntry.groupBy({
        by: ['accountId', 'direction', 'referenceType'],
        where: { accountId: { in: escrowAccounts.map((a) => a.id) } },
        _sum: { amount: true },
      });
      const escrowCurrency = new Map(escrowAccounts.map((a) => [a.id, a.currency]));
      for (const row of escrowEntries) {
        const currency = escrowCurrency.get(row.accountId);
        if (!currency) continue;
        const amount = Number(row._sum.amount || 0);
        if (row.direction === 'CREDIT') {
          inflowByCurrency[currency] = (inflowByCurrency[currency] ?? 0) + amount;
        } else if (row.referenceType === 'REFUND') {
          outflowByCurrency[currency] = (outflowByCurrency[currency] ?? 0) + amount;
        }
      }
    }

    // Headline figures in IRR (the platform's base currency).
    const totalInflow = inflowByCurrency['IRR'] ?? 0;
    const totalOutflow = outflowByCurrency['IRR'] ?? 0;

    const recentTransactions = await prisma.ledgerEntry.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { account: true },
    });

    // Serialize to plain objects: Prisma Decimal instances cannot cross the
    // server->client component boundary.
    const recentPlain = recentTransactions.map((t) => ({
      id: t.id,
      groupId: t.groupId,
      direction: t.direction,
      amount: Number(t.amount),
      currency: t.currency,
      referenceType: t.referenceType,
      referenceId: t.referenceId,
      createdAt: t.createdAt.toISOString(),
      account: {
        ownerType: t.account.ownerType,
        ownerId: t.account.ownerId,
        currency: t.account.currency,
      },
    }));

    return {
      success: true,
      balances,
      inflow: totalInflow,
      outflow: totalOutflow,
      inflowByCurrency,
      outflowByCurrency,
      recentTransactions: recentPlain,
    };
  } catch (err: unknown) {
    console.error('getAdminFinanceStats server error:', err);
    return { success: false, error: 'Failed to fetch financial stats' };
  }
}

export async function getAdminBookings() {
  try {
    await requirePermission('booking:view:all');

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

interface HistoryEntry {
  from: string;
  to: string;
  at: string;
}

function parseHistory(raw: string | null): HistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) =>
      typeof item === 'string'
        ? { from: 'UNKNOWN', to: item, at: new Date(0).toISOString() }
        : (item as HistoryEntry)
    );
  } catch {
    return [];
  }
}

export async function refundBookingAdmin(bookingId: string) {
  try {
    const user = await requirePermission('booking:refund:approve');

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { items: true },
    });
    if (!booking) return { success: false, error: 'Booking not found' };
    if (booking.status !== 'CONFIRMED') return { success: false, error: 'Only confirmed bookings can be refunded' };

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Walk the state machine through the refund chain.
      BookingStateMachine.assertTransition(booking.status as BookingState, 'CANCEL_REQUESTED');
      BookingStateMachine.assertTransition('CANCEL_REQUESTED', 'CANCELLING');
      BookingStateMachine.assertTransition('CANCELLING', 'CANCELLED');
      BookingStateMachine.assertTransition('CANCELLED', 'REFUND_INITIATED');

      const history = parseHistory(booking.stateHistory);
      const now = new Date().toISOString();
      history.push(
        { from: booking.status, to: 'CANCEL_REQUESTED', at: now },
        { from: 'CANCEL_REQUESTED', to: 'CANCELLING', at: now },
        { from: 'CANCELLING', to: 'CANCELLED', at: now },
        { from: 'CANCELLED', to: 'REFUND_INITIATED', at: now }
      );

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
      history.push({ from: 'REFUND_INITIATED', to: 'REFUNDED', at: new Date().toISOString() });

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'REFUNDED', stateHistory: JSON.stringify(history) },
      });

      // 3. Release inventory so refunded bookings stop consuming capacity.
      // A captured hold means allotment.booked was incremented at payment.
      if (booking.holdToken) {
        const hold = await tx.inventoryHold.findUnique({ where: { token: booking.holdToken } });
        if (hold) {
          if (hold.status === 'CAPTURED') {
            await tx.allotment.updateMany({
              where: { inventoryItemId: hold.inventoryItemId, date: hold.allotmentDate },
              data: { booked: { decrement: hold.quantity } },
            });
          }
          await tx.inventoryHold.updateMany({
            where: { token: booking.holdToken, status: { in: ['ACTIVE', 'CAPTURED'] } },
            data: { status: 'RELEASED' },
          });
        }
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'BOOKING_REFUNDED',
          resource: 'Booking',
          resourceId: booking.id,
          newData: JSON.stringify({ status: 'REFUNDED', amount: booking.totalAmount, currency: booking.currency }),
        },
      });
    });

    revalidatePath('/admin/bookings');
    return { success: true };
  } catch (err: unknown) {
    console.error('refundBookingAdmin server error:', err);
    const message = err instanceof Error ? err.message : '';
    if (message.startsWith('Unauthorized') || message.startsWith('Forbidden')) {
      return { success: false, error: message };
    }
    return { success: false, error: 'Refund processing failed' };
  }
}
