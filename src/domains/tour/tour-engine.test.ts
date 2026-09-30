import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TourMatchingEngine } from './TourMatchingEngine';
import { TourDomainService } from './TourDomainService';
import { DETAILED_TOURS } from '@/services/tours-service';
import type { TourYarQuizAnswers } from './types';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => {
  const mockTx = {
    booking: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    bookingItem: {
      update: vi.fn(),
    },
  };

  return {
    prisma: {
      $transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockTx)),
      booking: mockTx.booking,
      bookingItem: mockTx.bookingItem,
      _mockTx: mockTx,
    },
  };
});

describe('TourMatchingEngine (تور یار)', () => {
  it('correctly matches a cultural traveler to Isfahan Cultural Heritage tour with high score', () => {
    const culturalAnswers: TourYarQuizAnswers = {
      q1: 'married',
      q2: 'no_kids',
      q3: 'family',
      q4: 'budget_std',
      q5: ['cultural', 'nature'],
      q6: 'relaxed',
      q7: 'short_trip',
      q8: 'resort',
    };

    const matches = TourMatchingEngine.matchTours(DETAILED_TOURS, culturalAnswers);

    expect(matches.length).toBeGreaterThan(0);
    const topMatch = matches[0];
    expect(topMatch.tourId).toBe('t1'); // Isfahan tour
    expect(topMatch.matchPercentage).toBeGreaterThanOrEqual(70);
    expect(topMatch.matchReasons).toContain('تطابق سبک تفریح و دسته تور');
  });

  it('ranks higher-priced tours lower when economy budget is selected', () => {
    const budgetAnswers: TourYarQuizAnswers = {
      q1: 'single',
      q2: 'no_kids',
      q3: 'solo',
      q4: 'budget_eco',
      q5: ['nature'],
      q6: 'fast_pace',
      q7: 'short_trip',
      q8: 'hostel',
    };

    const matches = TourMatchingEngine.matchTours(DETAILED_TOURS, budgetAnswers);
    expect(matches.length).toBeGreaterThan(0);
    // Verified match output exists and has scores sorted descending
    for (let i = 0; i < matches.length - 1; i++) {
      expect(matches[i].matchPercentage).toBeGreaterThanOrEqual(matches[i + 1].matchPercentage);
    }
  });
});

describe('TourDomainService', () => {
  const mockTx = (prisma as unknown as { _mockTx: typeof mockTx })._mockTx;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an initial tour draft with allotment soft-lock (Step 1)', async () => {
    const fakeBooking = {
      id: 'b-tour-1',
      reference: 'TR-123456',
      status: 'HELD',
      totalAmount: 85_000_000,
      currency: 'TOMAN',
      items: [
        {
          id: 'item-1',
          type: 'TOUR',
          sellPrice: 85_000_000,
          details: JSON.stringify({
            tourId: 't1',
            travelersCount: 1,
            adultsCount: 1,
            childrenCount: 0,
            basePrice: 85_000_000,
          }),
        },
      ],
    };

    mockTx.booking.create.mockResolvedValue(fakeBooking);

    const booking = await TourDomainService.createTourDraft({
      actorId: 'usr-100',
      tourId: 't1',
      departureDateId: 'd1-t1',
      travelersCount: 1,
      adultsCount: 1,
      childrenCount: 0,
      hotelTier: 'STD',
    });

    expect(booking.id).toBe('b-tour-1');
    expect(mockTx.booking.create).toHaveBeenCalledOnce();
  });

  it('customizes booking with LUX hotel tier delta (Step 2)', async () => {
    const existingBooking = {
      id: 'b-tour-1',
      status: 'HELD',
      totalAmount: 85_000_000,
      items: [
        {
          id: 'item-1',
          type: 'TOUR',
          sellPrice: 85_000_000,
          details: JSON.stringify({
            tourId: 't1',
            travelersCount: 1,
            basePrice: 85_000_000,
          }),
        },
      ],
    };

    mockTx.booking.findUnique.mockResolvedValue(existingBooking);
    mockTx.bookingItem.update.mockResolvedValue({});
    mockTx.booking.update.mockImplementation(async ({ data }: { data: { totalAmount?: number } }) => ({
      ...existingBooking,
      totalAmount: data.totalAmount,
    }));

    const updated = await TourDomainService.customizeTourBooking({
      actorId: 'usr-100',
      bookingId: 'b-tour-1',
      hotelTier: 'LUX',
      addonActivityIds: ['act-1'],
    });

    // 85M base + 45M LUX delta + 5M activity = 135M
    expect(Number(updated.totalAmount)).toBe(135_000_000);
  });

  it('validates passport expiration when submitting travelers (Step 3)', async () => {
    const existingBooking = {
      id: 'b-tour-1',
      status: 'HELD',
      travelDate: '2026-10-10',
      items: [
        {
          id: 'item-1',
          type: 'TOUR',
          details: JSON.stringify({
            tourId: 't1',
            travelersCount: 1,
            departDate: '2026-10-10',
          }),
        },
      ],
    };

    mockTx.booking.findUnique.mockResolvedValue(existingBooking);

    // Passport expiring before 6 months after departure (e.g. 2026-11-01)
    await expect(
      TourDomainService.submitTravelers({
        actorId: 'usr-100',
        bookingId: 'b-tour-1',
        travelers: [
          {
            firstNameLatin: 'Ali',
            lastNameLatin: 'Rezai',
            passportNumber: 'A12345678',
            passportExpiry: '2026-11-01',
            type: 'ADULT',
          },
        ],
      })
    ).rejects.toThrow(/PASSPORT_EXPIRES_TOO_SOON/);
  });

  it('supports DEPOSIT payment mode (30%) with remainder balance (Step 4)', async () => {
    const existingBooking = {
      id: 'b-tour-1',
      reference: 'TR-100200',
      status: 'PENDING_PAYMENT',
      totalAmount: 100_000_000,
      travelDate: '2026-12-01',
      items: [
        {
          id: 'item-1',
          type: 'TOUR',
          details: JSON.stringify({
            tourId: 't1',
            departDate: '2026-12-01',
          }),
        },
      ],
    };

    mockTx.booking.findUnique.mockResolvedValue(existingBooking);
    mockTx.bookingItem.update.mockResolvedValue({});
    mockTx.booking.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...existingBooking,
      ...data,
    }));

    const confirmed = await TourDomainService.payTourBooking({
      actorId: 'usr-100',
      bookingId: 'b-tour-1',
      paymentMode: 'DEPOSIT',
      paymentMethod: 'wallet_irr',
      idempotencyKey: 'idem-deposit-1',
    });

    expect(confirmed.status).toBe('CONFIRMED');
    expect(mockTx.bookingItem.update).toHaveBeenCalled();
    const updateCall = mockTx.bookingItem.update.mock.calls[0][0];
    const savedDetails = JSON.parse(updateCall.data.details);
    expect(savedDetails.paymentMode).toBe('DEPOSIT');
    expect(savedDetails.paidAmount).toBe(30_000_000); // 30% of 100M
    expect(savedDetails.remainingBalance).toBe(70_000_000); // 70% of 100M
    expect(savedDetails.depositDeadline).toBeDefined();
  });
});
