import { prisma } from '@/lib/prisma';
import QRCode from 'qrcode';

export interface TravelerVoucherItem {
  fullName: string;
  nationalId?: string;
  passportNumber?: string;
  passportCountry?: string;
  seat?: string;
  room?: string;
  type: string;
}

export interface BookingVoucherData {
  bookingId: string;
  bookingReference: string;
  pnr?: string;
  status: string;
  paymentStatus: string;
  confirmedAt?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  service: {
    type: string;
    title: string;
    supplierName: string;
    travelDate?: string;
    returnDate?: string;
    origin?: string;
    destination?: string;
    flightNumber?: string;
    airline?: string;
    hotelName?: string;
    roomType?: string;
    baggage?: string;
    cancellationPolicy?: string;
  };
  travelers: TravelerVoucherItem[];
  pricing: {
    totalAmount: number;
    currency: string;
    isPaid: boolean;
  };
  qrCodeDataUrl: string;
  verificationUrl: string;
  issuedAt: string;
}

export class VoucherService {
  /**
   * Generates complete, verifiable booking voucher and e-ticket data (VOUCH-001)
   */
  static async generateVoucher(bookingIdOrRef: string): Promise<BookingVoucherData | null> {
    const booking = await prisma.booking.findFirst({
      where: {
        OR: [
          { id: bookingIdOrRef },
          { reference: bookingIdOrRef },
        ],
      },
      include: {
        customer: true,
        items: true,
      },
    });

    if (!booking) {
      return null;
    }

    // Extract first item or aggregated product details
    const firstItem = booking.items[0];
    let details: Record<string, unknown> = {};
    try {
      details = typeof firstItem?.details === 'string' ? JSON.parse(firstItem.details || '{}') : (firstItem?.details as Record<string, unknown> || {});
    } catch {
      details = {};
    }

    // Extract traveler list
    const rawPassengers = Array.isArray(details.passengers) ? (details.passengers as Array<Record<string, unknown>>) : [];
    const travelers: TravelerVoucherItem[] = rawPassengers.length > 0
      ? rawPassengers.map((p) => ({
          fullName: `${String(p.firstName || '')} ${String(p.lastName || '')}`.trim() || 'Passenger',
          nationalId: typeof p.nationalId === 'string' ? p.nationalId : undefined,
          passportNumber: typeof p.passportNumber === 'string' ? p.passportNumber : (typeof p.passportNo === 'string' ? p.passportNo : undefined),
          passportCountry: typeof p.passportCountry === 'string' ? p.passportCountry : undefined,
          seat: typeof p.seat === 'string' ? p.seat : 'Auto-assigned',
          room: typeof p.room === 'string' ? p.room : 'Standard Room',
          type: typeof p.type === 'string' ? p.type : 'ADULT',
        }))
      : [
          {
            fullName: booking.customer?.name || 'Guest Traveler',
            seat: 'Auto-assigned',
            room: 'Standard Room',
            type: 'ADULT',
          },
        ];

    // Determine PNR and titles
    const pnr = (typeof details.pnr === 'string' && details.pnr) || (typeof details.externalPnr === 'string' && details.externalPnr) || booking.externalPnr || undefined;
    const serviceType = firstItem?.type || 'TRAVEL';
    const origin = (typeof details.origin === 'string' && details.origin) || (typeof details.fromCity === 'string' && details.fromCity) || '';
    const destination = (typeof details.destination === 'string' && details.destination) || (typeof details.toCity === 'string' && details.toCity) || '';

    // Generate Verification URL & QR Code
    const verificationUrl = `https://firuzo.com/verify?ref=${encodeURIComponent(booking.reference)}${pnr ? `&pnr=${encodeURIComponent(pnr)}` : ''}`;
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 200,
      color: {
        dark: '#004D4A',
        light: '#FFFFFF',
      },
    });

    const isPaid = booking.paymentStatus === 'PAID' || booking.status === 'CONFIRMED';

    let supplierName = (typeof details.supplier === 'string' && details.supplier) || 'Official Partner';
    if (booking.supplierId) {
      const sup = await prisma.supplier.findUnique({ where: { id: booking.supplierId } }).catch(() => null);
      if (sup) supplierName = sup.name;
    }

    const hotelName = typeof details.hotelName === 'string' ? details.hotelName : undefined;
    const tourTitle = typeof details.tourTitle === 'string' ? details.tourTitle : undefined;
    const airline = typeof details.airline === 'string' ? details.airline : undefined;
    const flightNo = (typeof details.flightNo === 'string' && details.flightNo) || (typeof details.flightNumber === 'string' && details.flightNumber) || undefined;
    const roomType = typeof details.roomType === 'string' ? details.roomType : undefined;
    const baggage = typeof details.baggage === 'string' ? details.baggage : '20 kg checked, 7 kg cabin';
    const cancellationPolicy = typeof details.cancellationPolicy === 'string' ? details.cancellationPolicy : 'Standard non-refundable within 24h of departure. Free modification up to 48h prior.';

    const travelDate = (typeof details.departureDate === 'string' && details.departureDate) || (typeof details.checkIn === 'string' && details.checkIn) || booking.travelDate || '';
    const returnDate = (typeof details.returnDate === 'string' && details.returnDate) || (typeof details.checkOut === 'string' && details.checkOut) || '';

    return {
      bookingId: booking.id,
      bookingReference: booking.reference,
      pnr,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      confirmedAt: booking.updatedAt?.toISOString() || booking.createdAt.toISOString(),
      customer: {
        name: booking.customer?.name || 'Traveler',
        email: booking.customer?.email || '',
        phone: booking.customer?.phone || '',
      },
      service: {
        type: serviceType,
        title: hotelName || tourTitle || (airline ? `${airline} ${flightNo || ''}` : `${serviceType} Reservation`),
        supplierName,
        travelDate,
        returnDate,
        origin,
        destination,
        flightNumber: flightNo,
        airline,
        hotelName,
        roomType,
        baggage,
        cancellationPolicy,
      },
      travelers,
      pricing: {
        totalAmount: Number(booking.totalAmount),
        currency: booking.currency || 'IRR',
        isPaid,
      },
      qrCodeDataUrl,
      verificationUrl,
      issuedAt: new Date().toISOString(),
    };
  }
}
