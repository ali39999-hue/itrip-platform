'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

export async function getAdminBookings() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    const bookings = await prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { success: true, bookings };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'An error occurred';
    return { success: false, error };
  }
}

export async function refundBookingAdmin(bookingId: string) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new Error('Booking not found');
    if (booking.status !== 'CONFIRMED') throw new Error('Only Confirmed bookings can be refunded');

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Mark as REFUNDED
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'REFUNDED' }
      });

      // 2. Refund to Wallet (V1 assumption: all refunds go to wallet)
      const wallet = await tx.wallet.findFirst({ where: { userId: booking.userId } });
      if (wallet) {
        const balances = JSON.parse(wallet.balances);
        balances[booking.currency] = (balances[booking.currency] || 0) + Number(booking.totalAmount);
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balances: JSON.stringify(balances) }
        });
        // Log refund transaction
        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            bookingId: booking.id,
            type: 'REFUND',
            amount: booking.totalAmount,
            currency: booking.currency,
            description: `Refund for cancelled booking ${booking.id}`,
            idempotencyKey: `refund_${booking.id}`
          }
        });
      }

      await tx.auditLog.create({
        data: {
          userId: booking.userId,
          action: 'booking_refunded',
          entity: 'Booking',
          entityId: booking.id,
        }
      });
    });

    revalidatePath('/admin/bookings');
    return { success: true };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'An error occurred';
    return { success: false, error };
  }
}
