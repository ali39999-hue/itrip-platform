'use server';

import { prisma } from '@/lib/prisma';
import { safeAuth } from '@/auth';

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

  return { trips, independentBookings };
}
