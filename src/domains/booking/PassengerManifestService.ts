import { prisma } from '@/lib/prisma';

export interface ManifestPassenger {
  index: number;
  bookingRef: string;
  fullName: string;
  nationalId: string;
  passportNo: string;
  birthDate: string;
  gender: string;
  nationality: string;
  seat: string;
  status: string;
  contactPhone: string;
  serviceType: string;
}

export class PassengerManifestService {
  /**
   * Generates a structured list of passengers from confirmed bookings on a date
   */
  static async getManifestForDate(params: {
    travelDate: string; // YYYY-MM-DD
    serviceType?: string;
  }): Promise<ManifestPassenger[]> {
    const bookings = await prisma.booking.findMany({
      where: {
        travelDate: params.travelDate,
        status: { in: ['CONFIRMED', 'PAYMENT_CONFIRMED'] },
      },
      include: {
        items: true,
        customer: { select: { phone: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const list: ManifestPassenger[] = [];
    let idx = 1;

    for (const b of bookings) {
      for (const item of b.items) {
        if (params.serviceType && item.type.toUpperCase() !== params.serviceType.toUpperCase()) {
          continue;
        }

        let details: Record<string, unknown> = {};
        try {
          details = item.details ? JSON.parse(item.details) : {};
        } catch {
          details = {};
        }

        const passengers = Array.isArray(details.passengers) ? details.passengers : [];

        if (passengers.length === 0) {
          list.push({
            index: idx++,
            bookingRef: b.reference,
            fullName: 'Guest Traveler',
            nationalId: '-',
            passportNo: '-',
            birthDate: '-',
            gender: '-',
            nationality: 'IR',
            seat: 'Auto',
            status: b.status,
            contactPhone: b.customer?.phone || '-',
            serviceType: item.type,
          });
        } else {
          for (const p of passengers) {
            list.push({
              index: idx++,
              bookingRef: b.reference,
              fullName: `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Passenger',
              nationalId: p.nationalId || '-',
              passportNo: p.passportNo || '-',
              birthDate: p.birthDate || '-',
              gender: p.gender || '-',
              nationality: p.nationality || 'IR',
              seat: p.seat || 'Auto',
              status: b.status,
              contactPhone: b.customer?.phone || (details.contactPhone as string) || '-',
              serviceType: item.type,
            });
          }
        }
      }
    }

    return list;
  }

  /**
   * Generates CSV format for Excel/Airline export (ToursAndTravelsManagement pattern)
   */
  static generateCsv(passengers: ManifestPassenger[]): string {
    const headers = [
      'Index',
      'Booking Reference',
      'Full Name',
      'National ID',
      'Passport No',
      'Birth Date',
      'Gender',
      'Nationality',
      'Seat',
      'Status',
      'Phone',
      'Service',
    ];

    const rows = passengers.map((p) => [
      p.index,
      `"${p.bookingRef}"`,
      `"${p.fullName}"`,
      `"${p.nationalId}"`,
      `"${p.passportNo}"`,
      `"${p.birthDate}"`,
      `"${p.gender}"`,
      `"${p.nationality}"`,
      `"${p.seat}"`,
      `"${p.status}"`,
      `"${p.contactPhone}"`,
      `"${p.serviceType}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
