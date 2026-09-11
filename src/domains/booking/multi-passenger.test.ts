import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { bookingSchema, passengerSchema } from '@/lib/validations';
import { BookingApplicationService } from '@/domains/booking/BookingApplicationService';
import { decryptSensitive } from '@/lib/security/crypto-vault';

describe('Multi-Passenger Checkout & Allocation Suite', () => {
  const suffix = `mpax_${Date.now().toString(36)}_${randomBytes(3).toString('hex')}`;
  let userId = '';
  const createdBookingIds: string[] = [];

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        id: `usr_${suffix}`,
        email: `mpax_${suffix}@firuzo.com`,
        phone: `+98912${Math.floor(1000000 + Math.random() * 9000000)}`,
        name: 'علی حسینی',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    try {
      if (createdBookingIds.length > 0) {
        await prisma.bookingItem.deleteMany({ where: { bookingId: { in: createdBookingIds } } });
        await prisma.priceSnapshot.deleteMany({ where: { bookingId: { in: createdBookingIds } } });
        await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: { in: createdBookingIds } } });
        await prisma.booking.deleteMany({ where: { id: { in: createdBookingIds } } });
      }
      if (userId) {
        await prisma.user.deleteMany({ where: { id: userId } });
      }
    } catch {
      // Best effort
    }
  });

  it('validates distinct individual passengers via passengerSchema', () => {
    const p1 = {
      firstName: 'ALI',
      lastName: 'HOSSEINI',
      nationalId: '0012345678',
      passportNo: 'A12345678',
      passportExpiryDate: '2028-10-15',
      birthDate: '1990-05-12',
      gender: 'MALE' as const,
    };
    const p2 = {
      firstName: 'MARYAM',
      lastName: 'HOSSEINI',
      nationalId: '0098765432',
      passportNo: 'B87654321',
      passportExpiryDate: '2029-01-20',
      birthDate: '1994-08-25',
      gender: 'FEMALE' as const,
    };

    expect(passengerSchema.safeParse(p1).success).toBe(true);
    expect(passengerSchema.safeParse(p2).success).toBe(true);
  });

  it('validates a multi-passenger booking payload via bookingSchema', () => {
    const payload = {
      type: 'FLIGHT',
      itemId: 'fl-101',
      itemTitle: 'پرواز تهران - استانبول',
      count: 2,
      passengers: [
        {
          firstName: 'ALI',
          lastName: 'HOSSEINI',
          nationalId: '0012345678',
          passportNo: 'A12345678',
          passportExpiryDate: '2028-10-15',
          birthDate: '1990-05-12',
          gender: 'MALE',
        },
        {
          firstName: 'MARYAM',
          lastName: 'HOSSEINI',
          nationalId: '0098765432',
          passportNo: 'B87654321',
          passportExpiryDate: '2029-01-20',
          birthDate: '1994-08-25',
          gender: 'FEMALE',
        },
      ],
      contactEmail: 'ali@example.com',
      contactPhone: '09121234567',
    };

    const res = bookingSchema.safeParse(payload);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.passengers.length).toBe(2);
      expect(res.data.passengers[0].firstName).toBe('ALI');
      expect(res.data.passengers[1].firstName).toBe('MARYAM');
    }
  });

  it('rejects bookingSchema when passenger 2 is missing mandatory fields', () => {
    const invalidPayload = {
      type: 'FLIGHT',
      count: 2,
      passengers: [
        {
          firstName: 'ALI',
          lastName: 'HOSSEINI',
          passportNo: 'A12345678',
          birthDate: '1990-05-12',
          gender: 'MALE',
        },
        {
          firstName: '', // Missing name
          lastName: 'HOSSEINI',
          passportNo: 'B87654321',
          birthDate: '1994-08-25',
          gender: 'FEMALE',
        },
      ],
      contactEmail: 'ali@example.com',
      contactPhone: '09121234567',
    };

    const res = bookingSchema.safeParse(invalidPayload);
    expect(res.success).toBe(false);
  });

  it('creates draft booking with multiple unique passengers and properly encrypted PII', async () => {
    const passengers = [
      {
        firstName: 'Ali',
        lastName: 'Hosseini',
        nationalId: '0012345678',
        passportNo: 'A12345678',
        passportExpiryDate: '2028-10-15',
        birthDate: '1990-05-12',
        gender: 'MALE' as const,
      },
      {
        firstName: 'Maryam',
        lastName: 'Hosseini',
        nationalId: '0098765432',
        passportNo: 'B87654321',
        passportExpiryDate: '2029-01-20',
        birthDate: '1994-08-25',
        gender: 'FEMALE' as const,
      },
    ];

    const draft = await BookingApplicationService.createDraft({
      actorId: userId,
      type: 'HOTEL',
      itemId: 'h1',
      itemTitle: 'هتل اسپیناس پالاس تهران',
      count: 2,
      nights: 2,
      passengers,
      contactEmail: `mpax_${suffix}@firuzo.com`,
      contactPhone: '09121234567',
    });

    expect(draft).toBeDefined();
    expect(draft.bookingId).toBeDefined();
    createdBookingIds.push(draft.bookingId);

    // Verify stored booking item details
    const booking = await prisma.booking.findUnique({
      where: { id: draft.bookingId },
      include: { items: true },
    });

    expect(booking).toBeDefined();
    expect(booking?.status).toBe('DRAFT');
    expect(booking?.items.length).toBeGreaterThanOrEqual(1);

    const itemDetails = JSON.parse(booking!.items[0].details);
    expect(itemDetails.passengers).toBeDefined();
    expect(itemDetails.passengers.length).toBe(2);

    // Verify individual passengers are distinct
    const p1 = itemDetails.passengers[0];
    const p2 = itemDetails.passengers[1];
    expect(p1.firstName).toBe('Ali');
    expect(p2.firstName).toBe('Maryam');

    // Verify PII is encrypted
    expect(p1.passportNo).toMatch(/^enc:v1:/);
    expect(p2.passportNo).toMatch(/^enc:v1:/);
    expect(decryptSensitive(p1.passportNo)).toBe('A12345678');
    expect(decryptSensitive(p2.passportNo)).toBe('B87654321');
  });
});
