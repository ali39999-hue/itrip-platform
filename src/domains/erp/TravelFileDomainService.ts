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

  /**
   * Generates a synchronized tour/traveler passenger manifest (ERP-008).
   * Aggregates all travelers across flight, hotel, and tour booking items linked to this trip.
   */
  static async getTripManifest(
    tripId: string,
    tx?: Prisma.TransactionClient
  ): Promise<{
    tripReference: string;
    tripTitle: string;
    totalBookings: number;
    totalTravelers: number;
    manifest: Array<{
      bookingReference: string;
      productType: string;
      status: string;
      travelerName: string;
      nationalId?: string;
      passportNumber?: string;
      phone?: string;
    }>;
  }> {
    const client = tx || prisma;
    const trip = await client.trip.findUnique({
      where: { id: tripId },
      include: {
        bookings: {
          include: {
            items: true,
            customer: true,
          },
        },
      },
    });

    if (!trip) {
      throw new Error(`Trip ${tripId} not found for manifest generation`);
    }

    const manifest: Array<{
      bookingReference: string;
      productType: string;
      status: string;
      travelerName: string;
      nationalId?: string;
      passportNumber?: string;
      phone?: string;
    }> = [];

    for (const bkg of trip.bookings) {
      for (const item of bkg.items) {
        let details: Record<string, unknown> = {};
        try {
          details = typeof item.details === 'string' ? JSON.parse(item.details) : ((item.details as unknown as Record<string, unknown>) || {});
        } catch {
          details = {};
        }
        const passengers = Array.isArray(details.passengers) ? (details.passengers as Array<Record<string, unknown>>) : [];

        if (passengers.length > 0) {
          for (const p of passengers) {
            manifest.push({
              bookingReference: bkg.reference,
              productType: item.type,
              status: bkg.status,
              travelerName: `${String(p.firstName || '')} ${String(p.lastName || '')}`.trim() || bkg.customer?.name || 'Guest',
              nationalId: typeof p.nationalId === 'string' ? p.nationalId : undefined,
              passportNumber: typeof p.passportNumber === 'string' ? p.passportNumber : (typeof p.passportNo === 'string' ? p.passportNo : undefined),
              phone: typeof p.phone === 'string' ? p.phone : (bkg.customer?.phone || undefined),
            });
          }
        } else {
          // Fallback to customer level traveler
          manifest.push({
            bookingReference: bkg.reference,
            productType: item.type,
            status: bkg.status,
            travelerName: bkg.customer?.name || 'Guest',
            phone: bkg.customer?.phone || undefined,
          });
        }
      }
    }

    return {
      tripReference: trip.reference,
      tripTitle: trip.title,
      totalBookings: trip.bookings.length,
      totalTravelers: manifest.length,
      manifest,
    };
  }
}
