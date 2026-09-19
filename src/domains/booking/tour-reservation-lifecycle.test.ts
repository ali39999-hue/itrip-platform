import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { BookingApplicationService } from './BookingApplicationService';
import { BookingDomainService } from './BookingDomainService';
import { VoucherService, verifyVoucherToken, signVoucherToken } from './VoucherService';

describe('Tour Reservation Lifecycle & Unpaid Booking Cart Invariants (§13–§16, §22–§26)', () => {
  const suffix = `tour_life_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  let testUserId = '';
  let testTourId = '';
  const createdBookingIds: string[] = [];

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `traveler_${suffix}@firuzo.com`,
        name: 'مسافر تست تور',
        role: 'CUSTOMER',
      },
    });
    testUserId = user.id;

    const tour = await prisma.tour.create({
      data: {
        id: `tour_${suffix}`,
        title: `تور لوکس شیراز ${suffix}`,
        titleEn: `Luxury Shiraz Tour ${suffix}`,
        city: 'شیراز',
        price: 45_000_000,
        currency: 'IRR',
        durationDays: 4,
        durationNights: 3,
        isPublished: true,
      },
    });
    testTourId = tour.id;
  });

  afterAll(async () => {
    try {
      if (createdBookingIds.length > 0) {
        await prisma.invoice.deleteMany({ where: { bookingId: { in: createdBookingIds } } });
        await prisma.priceSnapshot.deleteMany({ where: { bookingId: { in: createdBookingIds } } });
        await prisma.bookingItem.deleteMany({ where: { bookingId: { in: createdBookingIds } } });
        await prisma.booking.deleteMany({ where: { id: { in: createdBookingIds } } });
      }
      if (testTourId) {
        await prisma.tour.deleteMany({ where: { id: testTourId } });
      }
      if (testUserId) {
        await prisma.user.deleteMany({ where: { id: testUserId } });
      }
    } catch (e) {
      console.error('Lifecycle test cleanup error:', e);
    }
  });

  it('1. Creates an UNPAID Tour Reservation Draft with HELD status and valid expiration deadline', async () => {
    const draftRes = await BookingApplicationService.createDraft({
      actorId: testUserId,
      type: 'TOUR',
      itemId: testTourId,
      count: 2,
      travelDate: '2026-11-25',
      passengers: [
        { firstName: 'علی', lastName: 'کریمی', nationalId: '0012345678', gender: 'MALE' },
        { firstName: 'مریم', lastName: 'حسینی', nationalId: '0023456789', gender: 'FEMALE' },
      ],
    });

    expect(draftRes.success).toBe(true);
    expect(draftRes.bookingId).toBeDefined();
    createdBookingIds.push(draftRes.bookingId!);

    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: draftRes.bookingId },
    });

    // Invariant: Unpaid reservation MUST NOT be CONFIRMED or TICKETED
    expect(['DRAFT', 'HELD']).toContain(booking.status);
    expect(booking.paymentStatus).toBe('INITIATED');
    expect(booking.expiresAt).toBeDefined();
    expect(booking.expiresAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it('2. Enforces explicit reservation expiry: expired reservations cannot resume as valid', async () => {
    // Create an expired draft manually with past expiresAt
    const pastDate = new Date(Date.now() - 30 * 60 * 1000); // 30 mins in past
    const expiredBooking = await prisma.booking.create({
      data: {
        reference: `FZ-EXP-${suffix}`,
        customerId: testUserId,
        totalAmount: 45_000_000,
        currency: 'IRR',
        status: 'HELD',
        paymentStatus: 'INITIATED',
        expiresAt: pastDate,
        items: {
          create: {
            type: 'TOUR',
            netCost: 40_000_000,
            markup: 5_000_000,
            sellPrice: 45_000_000,
            details: JSON.stringify({ title: 'تور تست شیراز' }),
          },
        },
      },
    });
    createdBookingIds.push(expiredBooking.id);

    // Run sweep logic
    const expiredCount = await BookingDomainService.expireStaleBookings();
    expect(expiredCount).toBeGreaterThanOrEqual(1);

    const reloaded = await prisma.booking.findUniqueOrThrow({
      where: { id: expiredBooking.id },
    });
    expect(reloaded.status).toBe('EXPIRED');
  });

  it('3. Voucher Invariant: CANCELLED or FAILED bookings produce INVALID or REVOKED voucher', async () => {
    const cancelledBooking = await prisma.booking.create({
      data: {
        reference: `FZ-CANC-${suffix}`,
        customerId: testUserId,
        totalAmount: 45_000_000,
        currency: 'IRR',
        status: 'CANCELLED',
        paymentStatus: 'INITIATED',
        items: {
          create: {
            type: 'TOUR',
            netCost: 40_000_000,
            markup: 5_000_000,
            sellPrice: 45_000_000,
            details: JSON.stringify({ title: 'تور تست لغو شده' }),
          },
        },
      },
    });
    createdBookingIds.push(cancelledBooking.id);

    const voucher = await VoucherService.generateVoucher(cancelledBooking.id);
    expect(voucher).not.toBeNull();
    // Invariant: Cancelled booking cannot have a valid voucher
    expect(voucher?.isValid).toBe(false);
    expect(voucher?.isRevoked).toBe(true);
    expect(voucher?.status).toBe('REVOKED');
  });

  it('4. Cryptographically signs voucher verification token with HMAC-SHA256 and detects tampering', () => {
    const ref = `FZ-TEST-${suffix}`;
    const bookingId = `bk_${suffix}`;
    const { token, expiresAt } = signVoucherToken(ref, bookingId);

    expect(token).toBeDefined();
    expect(expiresAt).toBeDefined();

    // Verify valid token
    const verification = verifyVoucherToken(token);
    expect(verification.valid).toBe(true);
    expect(verification.payload?.ref).toBe(ref);
    expect(verification.payload?.bookingId).toBe(bookingId);

    // Tampered token must fail
    const tampered = token.slice(0, -4) + 'abcd';
    const tamperedVerification = verifyVoucherToken(tampered);
    expect(tamperedVerification.valid).toBe(false);
  });

  it('5. Invariant: EXPIRED or CANCELLED booking cannot be paid via confirmPayment', async () => {
    // 5a. Expired booking
    const expiredBooking = await prisma.booking.create({
      data: {
        reference: `FZ-EXP-PAY-${suffix}`,
        customerId: testUserId,
        totalAmount: 10_000_000,
        currency: 'IRR',
        status: 'EXPIRED',
        paymentStatus: 'INITIATED',
      },
    });
    createdBookingIds.push(expiredBooking.id);

    await expect(
      BookingApplicationService.confirmPayment({
        bookingId: expiredBooking.id,
        actorId: testUserId,
        paymentMethod: 'wallet_irr',
        idempotencyKey: `idem_exp_${suffix}`,
      })
    ).rejects.toThrow(/not payable in its current state: EXPIRED/i);

    // 5b. Cancelled booking
    const cancelledBooking = await prisma.booking.create({
      data: {
        reference: `FZ-CANC-PAY-${suffix}`,
        customerId: testUserId,
        totalAmount: 10_000_000,
        currency: 'IRR',
        status: 'CANCELLED',
        paymentStatus: 'INITIATED',
      },
    });
    createdBookingIds.push(cancelledBooking.id);

    await expect(
      BookingApplicationService.confirmPayment({
        bookingId: cancelledBooking.id,
        actorId: testUserId,
        paymentMethod: 'wallet_irr',
        idempotencyKey: `idem_canc_${suffix}`,
      })
    ).rejects.toThrow(/not payable in its current state: CANCELLED/i);
  });
});
