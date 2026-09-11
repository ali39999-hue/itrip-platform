'use server';

import { prisma } from '@/lib/prisma';
import { safeAuth } from '@/auth';
import { toPlain } from '@/lib/serialize';

export async function getUserTripsData() {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return { trips: [], independentBookings: [] };
  }

  const userId = session.user.id;

  const [trips, independentBookings] = await Promise.all([
    prisma.trip.findMany({
      where: { userId },
      include: {
        bookings: {
          include: {
            items: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.booking.findMany({
      where: {
        customerId: userId,
        tripId: null,
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return toPlain({ trips, independentBookings });
}

export async function findBookingByReference(reference: string, phoneOrEmail?: string) {
  if (!reference || reference.trim().length < 3) {
    return { success: false, error: 'INVALID_REFERENCE' };
  }
  const cleanRef = reference.trim().toUpperCase();
  const booking = await prisma.booking.findFirst({
    where: {
      OR: [
        { reference: cleanRef },
        { id: cleanRef },
      ],
    },
    include: {
      items: true,
      customer: {
        select: { id: true, name: true, phone: true, email: true },
      },
    },
  });

  if (!booking) {
    return { success: false, error: 'NOT_FOUND' };
  }

  // Security guard: verify matching phone or email if provided
  if (phoneOrEmail && phoneOrEmail.trim()) {
    const contact = phoneOrEmail.trim().toLowerCase();
    const customerEmail = (booking.customer?.email || '').toLowerCase();
    const customerPhone = (booking.customer?.phone || '').replace(/\D/g, '');
    const cleanInput = contact.replace(/\D/g, '');
    const matchesEmail = customerEmail && customerEmail === contact;
    const matchesPhone = cleanInput && customerPhone.endsWith(cleanInput.slice(-8));
    if (!matchesEmail && !matchesPhone) {
      return { success: false, error: 'CONTACT_MISMATCH' };
    }
  }

  return {
    success: true,
    booking: {
      id: booking.id,
      reference: booking.reference,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      totalAmount: Number(booking.totalAmount),
      currency: booking.currency,
      createdAt: booking.createdAt,
      items: booking.items.map((item) => ({
        id: item.id,
        serviceType: item.type,
        title: item.details || item.type,
        unitPrice: Number(item.sellPrice),
      })),
    },
  };
}
