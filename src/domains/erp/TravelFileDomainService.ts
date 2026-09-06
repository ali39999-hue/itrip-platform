import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class TravelFileDomainService {
  /**
   * Assigns a booking to an active Trip container (Travel File dossier) for the customer (ERP-001).
   * If the customer has an open PLANNING/BOOKED trip within the last 3 days, groups it;
   * otherwise creates a fresh Trip dossier.
   */
  static async assignBookingToTrip(
    userId: string,
    bookingId: string,
    productType: string,
    tx?: Prisma.TransactionClient
  ): Promise<{ tripId: string; reference: string }> {
    const client = tx || prisma;

    // Check if there is an existing open trip for this user created recently (last 3 days)
    const recentCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const existingTrip = await client.trip.findFirst({
      where: {
        userId,
        status: { in: ['PLANNING', 'BOOKED'] },
        createdAt: { gte: recentCutoff },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingTrip) {
      await client.booking.update({
        where: { id: bookingId },
        data: { tripId: existingTrip.id },
      });
      return { tripId: existingTrip.id, reference: existingTrip.reference };
    }

    // Create a new Trip dossier
    const reference = `TRP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const tripTitle = `${productType.toUpperCase()} Journey`;

    const newTrip = await client.trip.create({
      data: {
        reference,
        userId,
        title: tripTitle,
        status: 'PLANNING',
        bookings: {
          connect: { id: bookingId },
        },
      },
    });

    return { tripId: newTrip.id, reference: newTrip.reference };
  }

  /**
   * Progresses Trip status when a member booking is confirmed (ERP-001, ERP-007)
   */
  static async onBookingConfirmed(
    bookingId: string,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const client = tx || prisma;
    const booking = await client.booking.findUnique({
      where: { id: bookingId },
      select: { tripId: true },
    });

    if (!booking?.tripId) return;

    await client.trip.update({
      where: { id: booking.tripId },
      data: { status: 'BOOKED' },
    });
  }
}
