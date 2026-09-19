import { prisma } from '@/lib/prisma';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { getAppBaseUrl } from '@/lib/runtime-url';
import { resolveAuthSigningSecret } from '@/lib/security/secrets';

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
  isValid: boolean;
  isRevoked?: boolean;
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
    cipDetails?: {
      airportCode: string;
      airportName: string;
      terminal: string;
      flightDirection: string;
      accompanyingGuests: number;
      suiteType?: string;
      transferVehicle?: string;
    };
    insuranceDetails?: {
      policyNumber: string;
      companyName: string;
      assistancePartner: string;
      assistancePhone: string;
      coverageEur: number;
      schengenApproved: boolean;
      zoneName: string;
      validityNotice: string;
    };
    itemsSummary?: Array<{
      type: string;
      title: string;
      amount: number;
    }>;
  };
  travelers: TravelerVoucherItem[];
  pricing: {
    totalAmount: number;
    currency: string;
    isPaid: boolean;
  };
  qrCodeDataUrl: string;
  verificationUrl: string;
  verificationToken: string;
  tokenExpiresAt: string;
  issuedAt: string;
}

export interface VoucherVerificationPayload {
  ref: string;
  bookingId: string;
  pnr?: string | null;
  exp: number;
}

export function signVoucherToken(ref: string, bookingId: string, pnr?: string): { token: string; expiresAt: string } {
  const secret = resolveAuthSigningSecret('voucher-hmac');
  if (!secret) {
    // Fail closed (SEC-014): without a real signing key a voucher token would be
    // forgeable by anyone reading the source. Never issue one.
    throw new Error('Voucher signing key unavailable: AUTH_SECRET is not configured.');
  }
  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 3600; // 30-day token
  const payloadStr = JSON.stringify({ ref, bookingId, pnr: pnr || null, exp });
  const b64Payload = Buffer.from(payloadStr).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(b64Payload).digest('base64url');
  return {
    token: `${b64Payload}.${signature}`,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

export function verifyVoucherToken(token: string): { valid: boolean; payload?: VoucherVerificationPayload; error?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return { valid: false, error: 'invalid_format' };
    const [b64Payload, sig] = parts;
    const secret = resolveAuthSigningSecret('voucher-hmac');
    if (!secret) return { valid: false, error: 'signing_key_unavailable' };
    const expectedSig = crypto.createHmac('sha256', secret).update(b64Payload).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    // timingSafeEqual throws on length mismatch — compare lengths first so the
    // failure mode is an explicit rejection rather than a thrown exception.
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false, error: 'invalid_signature' };
    }
    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8')) as VoucherVerificationPayload;
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return { valid: false, error: 'expired' };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'malformed_token' };
  }
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

    // Payment binding (VOUCH-02): a voucher is only valid when the payment was
    // actually captured. The canonical capture status is 'CAPTURED' (see
    // PAYMENT_STATUS_VALUES) — there is no 'PAID' value, so comparing against it
    // silently disabled this check, and OR-ing in `status === 'CONFIRMED'`
    // self-satisfied the invariant from booking status alone.
    const isPaid = booking.paymentStatus === 'CAPTURED' || booking.paymentStatus === 'PARTIALLY_REFUNDED';
    const isConfirmed = booking.status === 'CONFIRMED' || booking.status === 'ISSUED' || booking.status === 'COMPLETED';
    const isCancelled = booking.status === 'CANCELLED' || booking.status === 'REFUNDED';
    const isFailed = booking.status === 'FAILED';

    const isValid = isConfirmed && isPaid;
    const isRevoked = isCancelled;

    // Cryptographically signed verification token (VOUCH-SEC / §28)
    const { token: verificationToken, expiresAt: tokenExpiresAt } = signVoucherToken(
      booking.reference,
      booking.id,
      pnr
    );

    const siteUrl = getAppBaseUrl();
    const verificationUrl = `${siteUrl}/verify?token=${encodeURIComponent(verificationToken)}`;

    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 200,
      color: {
        dark: isValid ? '#004D4A' : '#7F1D1D',
        light: '#FFFFFF',
      },
    });

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

    // Multi-item summary for aggregated orders
    const itemsSummary = (booking.items || []).map((i) => {
      let d: Record<string, unknown> = {};
      try {
        d = typeof i.details === 'string' ? JSON.parse(i.details || '{}') : (i.details as Record<string, unknown> || {});
      } catch {}
      return {
        type: i.type.toUpperCase(),
        title: (typeof d.title === 'string' && d.title) || `${i.type} Service`,
        amount: Number(i.sellPrice),
      };
    });

    // CIP Item extraction
    const cipItem = booking.items.find((i) => i.type.toUpperCase() === 'CIP' || i.type.toUpperCase() === 'CIPS');
    let cipDetails: BookingVoucherData['service']['cipDetails'] | undefined = undefined;
    if (cipItem || serviceType === 'CIP' || serviceType === 'CIPS') {
      let cd: Record<string, unknown> = {};
      try {
        const itemObj = cipItem || firstItem;
        cd = typeof itemObj?.details === 'string' ? JSON.parse(itemObj.details || '{}') : (itemObj?.details as Record<string, unknown> || {});
      } catch {}
      cipDetails = {
        airportCode: String(cd.airportCode || 'IKA'),
        airportName: String(cd.airportName || 'فرودگاه بین‌المللی امام خمینی (ره)'),
        terminal: String(cd.terminal || 'ساختمان اختصاصی تشریفات CIP'),
        flightDirection: String(cd.flightDirection || 'DEPARTURE'),
        accompanyingGuests: Number(cd.accompanyingGuests || 0),
        suiteType: cd.suiteType ? String(cd.suiteType) : undefined,
        transferVehicle: cd.transferVehicle ? String(cd.transferVehicle) : undefined,
      };
    }

    // Insurance Item extraction
    const insItem = booking.items.find((i) => i.type.toUpperCase() === 'INSURANCE');
    let insuranceDetails: BookingVoucherData['service']['insuranceDetails'] | undefined = undefined;
    if (insItem || serviceType === 'INSURANCE' || details.addInsurance) {
      let id: Record<string, unknown> = {};
      try {
        const itemObj = insItem || firstItem;
        id = typeof itemObj?.details === 'string' ? JSON.parse(itemObj.details || '{}') : (itemObj?.details as Record<string, unknown> || {});
      } catch {}
      const coverageEur = Number(id.coverageEur || 50000);
      insuranceDetails = {
        policyNumber: `POL-IRN-2026-${booking.reference.replace(/[^A-Z0-9]/gi, '')}`,
        companyName: String(id.company || 'بیمه سامان (Saman)'),
        assistancePartner: String(id.assistance || 'Swiss Assist (سوئیس)'),
        assistancePhone: '+41 22 518 0244',
        coverageEur,
        schengenApproved: coverageEur >= 30000,
        zoneName: String(id.zone || 'حوزه شنگن و اتحادیه اروپا'),
        validityNotice: 'اعتبار بیمه‌نامه از زمان درج مهر خروج بر روی گذرنامه آغاز می‌گردد.',
      };
    }

    return {
      bookingId: booking.id,
      bookingReference: booking.reference,
      pnr,
      status: isCancelled ? 'REVOKED' : isFailed ? 'INVALID' : booking.status,
      paymentStatus: booking.paymentStatus,
      isValid,
      isRevoked,
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
        cipDetails,
        insuranceDetails,
        itemsSummary,
      },
      travelers,
      pricing: {
        totalAmount: Number(booking.totalAmount),
        currency: booking.currency || 'IRR',
        isPaid,
      },
      qrCodeDataUrl,
      verificationUrl,
      verificationToken,
      tokenExpiresAt,
      issuedAt: new Date().toISOString(),
    };
  }

  /**
   * Safe lookup for public verification page (BASE-006)
   */
  static async getBookingForVerification(queryRef?: string, queryId?: string) {
    if (!queryRef && !queryId) return null;
    return prisma.booking.findFirst({
      where: {
        OR: [
          ...(queryRef ? [{ reference: queryRef }] : []),
          ...(queryId ? [{ id: queryId }] : []),
        ],
      },
      include: {
        customer: { select: { name: true } },
        items: true,
      },
    });
  }
}
