'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getAdminBookings() {
  try {
    const bookings = await prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      // include: { user: true } // If we wanted user info
    });
    return { success: true, bookings };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function refundBookingAdmin(bookingId: string) {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new Error('Bookinng not found');
    if (booking.status !== 'CONFIRMED') throw new Error('Only Confirmed bookings can be refunded');

    await prisma.$transaction(async (tx) => {
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
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
