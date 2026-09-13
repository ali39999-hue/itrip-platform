import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { Customer360Service } from './Customer360Service';

describe('Customer360Service - Domain Architecture Suite', () => {
  const suffix = `c360_${Date.now().toString(36)}_${randomBytes(3).toString('hex')}`;
  let userId = '';
  let profileId = '';
  let docId = '';
  let tripId = '';
  let bookingId = '';

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `c360_${suffix}@firuzo.com`,
        phone: `+98912${Math.floor(1000000 + Math.random() * 9000000)}`,
        name: 'رضا صبوری',
        firstNameFa: 'رضا',
        lastNameFa: 'صبوری',
        nationalId: '0076543210',
        passportNo: 'A88776655',
      },
    });
    userId = user.id;

    const profile = await prisma.travelerProfile.create({
      data: {
        userId,
        firstName: 'مریم',
        lastName: 'صبوری',
        nationalId: '0098765432',
        gender: 'FEMALE',
      },
    });
    profileId = profile.id;

    const doc = await prisma.travelDocument.create({
      data: {
        travelerProfileId: profileId,
        type: 'PASSPORT',
        documentNumber: 'P12345678',
        expiresAt: '2028-06-20',
      },
    });
    docId = doc.id;

    const trip = await prisma.trip.create({
      data: {
        userId,
        reference: `TRP-${suffix}`,
        title: 'سفر استانبول تابستان',
        status: 'BOOKED',
      },
    });
    tripId = trip.id;

    const booking = await prisma.booking.create({
      data: {
        customerId: userId,
        tripId,
        reference: `BKG-${suffix}`,
        status: 'CONFIRMED',
        totalAmount: 45_000_000,
        currency: 'IRR',
        items: {
          create: [
            {
              type: 'FLIGHT',
              netCost: 40_000_000,
              markup: 5_000_000,
              sellPrice: 45_000_000,
              details: JSON.stringify({ title: 'پرواز تهران استانبول' }),
            },
          ],
        },
      },
    });
    bookingId = booking.id;
  });

  afterAll(async () => {
    try {
      if (bookingId) {
        await prisma.bookingItem.deleteMany({ where: { bookingId } });
        await prisma.booking.deleteMany({ where: { id: bookingId } });
      }
      if (tripId) await prisma.trip.deleteMany({ where: { id: tripId } });
      if (docId) await prisma.travelDocument.deleteMany({ where: { id: docId } });
      if (profileId) await prisma.travelerProfile.deleteMany({ where: { id: profileId } });
      if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    } catch {
      // Ignore
    }
  });

  it('should synthesize Customer 360 data with masked PII when caller lacks permission', async () => {
    const data = await Customer360Service.getCustomer360(userId, false);
    expect(data).toBeDefined();
    expect(data?.user.id).toBe(userId);
    expect(data?.user.name).toBe('رضا صبوری');

    // PII should be masked
    expect(data?.user.nationalId).toContain('****');
    expect(data?.user.passportNo).toContain('****');

    // Travelers
    expect(data?.travelers.length).toBe(1);
    expect(data?.travelers[0].firstName).toBe('مریم');
    expect(data?.travelers[0].nationalId).toContain('****');
    expect(data?.travelers[0].documents[0].documentNumber).toContain('****');

    // Financials & Metrics
    expect(data?.metrics.totalBookings).toBe(1);
    expect(data?.metrics.confirmedBookings).toBe(1);
    expect(data?.financials.totalSpendIRR).toBe(45_000_000);
    expect(data?.trips.length).toBe(1);
    expect(data?.trips[0].reference).toBe(`TRP-${suffix}`);
  });

  it('should reveal unmasked PII when caller holds traveler:pii:view permission', async () => {
    const data = await Customer360Service.getCustomer360(userId, true);
    expect(data).toBeDefined();

    // PII should be clear
    expect(data?.user.nationalId).toBe('0076543210');
    expect(data?.user.passportNo).toBe('A88776655');
    expect(data?.travelers[0].documents[0].documentNumber).toBe('P12345678');
    expect(data?.travelers[0].documents[0].validity?.isValidForTravel).toBe(true);
  });

  it('should return null for a non-existent user ID when called by trusted staff', async () => {
    const data = await Customer360Service.getCustomer360('non_existent_id', true);
    expect(data).toBeNull();
  });

  it('should deny access when no operator context is provided (server-side enforcement)', async () => {
    await expect(Customer360Service.getCustomer360('non_existent_id')).rejects.toThrow(
      /Unauthorized|Forbidden/
    );
  });
});
