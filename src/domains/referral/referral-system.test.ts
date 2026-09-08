import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { ReferralDomainService } from './ReferralDomainService';
import { calculatePricing } from '@/lib/pricing/engine';
import { REFERRAL_CONFIG } from '@/lib/referral/config';
import { Money } from '@/lib/finance';
import { BookingApplicationService } from '../booking/BookingApplicationService';

describe('Referral & Group Leader System Suite (Phase 2 & 3 Requirements)', () => {
  const suffix = `ref_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  let leaderUserId = '';
  let customer1Id = '';
  let customer2Id = '';
  let referralCodeId = '';
  const testCode = `TESTLEADER_${suffix.toUpperCase()}`;

  beforeAll(async () => {
    // 1. Create leader user
    const leader = await prisma.user.create({
      data: {
        id: `usr_leader_${suffix}`,
        name: 'Leader Ali',
        email: `leader_${suffix}@firuzo.com`,
        phone: `+98912${Math.floor(1000000 + Math.random() * 9000000)}`,
      },
    });
    leaderUserId = leader.id;

    // 2. Create customer users
    const customer1 = await prisma.user.create({
      data: {
        id: `usr_cust1_${suffix}`,
        name: 'Customer Reza',
        email: `cust1_${suffix}@firuzo.com`,
        phone: `+98913${Math.floor(1000000 + Math.random() * 9000000)}`,
      },
    });
    customer1Id = customer1.id;

    const customer2 = await prisma.user.create({
      data: {
        id: `usr_cust2_${suffix}`,
        name: 'Customer Sara',
        email: `cust2_${suffix}@firuzo.com`,
        phone: `+98914${Math.floor(1000000 + Math.random() * 9000000)}`,
      },
    });
    customer2Id = customer2.id;

    // 3. Create referral code for leader
    const refCode = await prisma.referralCode.create({
      data: {
        code: testCode,
        leaderId: leaderUserId,
      },
    });
    referralCodeId = refCode.id;
  });

  afterAll(async () => {
    try {
      await prisma.leaderSettlement.deleteMany({ where: { referralCodeId } });
      await prisma.bookingReferral.deleteMany({ where: { referralCodeId } });
      await prisma.bookingReferral.deleteMany({ where: { rawCode: { contains: suffix } } });
      await prisma.referralCode.deleteMany({ where: { id: referralCodeId } });
      await prisma.bookingStatusHistory.deleteMany({ where: { booking: { customerId: { in: [customer1Id, customer2Id, leaderUserId] } } } });
      await prisma.priceSnapshot.deleteMany({ where: { booking: { customerId: { in: [customer1Id, customer2Id, leaderUserId] } } } });
      await prisma.bookingItem.deleteMany({ where: { booking: { customerId: { in: [customer1Id, customer2Id, leaderUserId] } } } });
      await prisma.booking.deleteMany({ where: { customerId: { in: [customer1Id, customer2Id, leaderUserId] } } });
      await prisma.user.deleteMany({ where: { id: { in: [leaderUserId, customer1Id, customer2Id] } } });
    } catch (err) {
      console.error('Referral test cleanup error:', err);
    }
  });

  describe('1. Code Normalization & Validation Rules', () => {
    it('normalizes code by trimming whitespace and converting to uppercase', () => {
      expect(ReferralDomainService.normalizeCode('  damavand_100  ')).toBe('DAMAVAND_100');
      expect(ReferralDomainService.normalizeCode('kooh')).toBe('KOOH');
      expect(ReferralDomainService.normalizeCode(null)).toBe('');
    });

    it('validates active code successfully for a standard customer', async () => {
      const res = await ReferralDomainService.validateCode(testCode.toLowerCase(), customer1Id);
      expect(res.valid).toBe(true);
      expect(res.status).toBe('VALID');
      expect(res.discountPercent).toBe(REFERRAL_CONFIG.referralDiscountPercent);
      expect(res.leaderId).toBe(leaderUserId);
      expect(res.leaderName).toBe('Leader Ali');
    });

    it('marks unregistered/invalid codes as UNMATCHED without throwing errors', async () => {
      const res = await ReferralDomainService.validateCode('NON_EXISTENT_CODE_XYZ', customer1Id);
      expect(res.valid).toBe(false);
      expect(res.status).toBe('UNMATCHED');
      expect(res.reason).toBe('NOT_FOUND');
    });

    it('enforces self-referral rule: leader entering their own code gets rejected for discount', async () => {
      const res = await ReferralDomainService.validateCode(testCode, leaderUserId);
      expect(res.valid).toBe(false);
      expect(res.status).toBe('SELF_REFERRAL');
      expect(res.reason).toBe('SELF_REFERRAL');
    });
  });

  describe('2. Pricing Engine 5% Referral Discount & Stacking Logic', () => {
    it('calculates 5% referral discount strictly on baseCost', () => {
      const basePrice = new Money(10_000_000, 'IRR');
      const pricing = calculatePricing({
        userRole: 'CUSTOMER',
        productType: 'TOUR',
        basePrice,
        currency: 'IRR',
        referralDiscountPercent: 0.05,
      });

      // 5% of 10,000,000 = 500,000
      expect(pricing.breakdown.discountAmount.toNumber()).toBe(500_000);
      expect(pricing.snapshot.discountAmount.toString()).toBe('500000');
    });

    it('resolves coupon vs referral conflict by choosing the highest customer benefit', () => {
      const basePrice = new Money(10_000_000, 'IRR');

      // Scenario A: Coupon is 10% (higher than 5% referral) -> Coupon should win
      const pricingWithHigherCoupon = calculatePricing({
        userRole: 'CUSTOMER',
        productType: 'TOUR',
        basePrice,
        currency: 'IRR',
        referralDiscountPercent: 0.05,
        promoDiscountPercent: 0.10,
      });
      // 10% promo on subtotal wins over 5% on base
      expect(pricingWithHigherCoupon.breakdown.discountAmount.toNumber()).toBeGreaterThan(500_000);

      // Scenario B: Coupon is 2% (lower than 5% referral) -> Referral should win
      const pricingWithLowerCoupon = calculatePricing({
        userRole: 'CUSTOMER',
        productType: 'TOUR',
        basePrice,
        currency: 'IRR',
        referralDiscountPercent: 0.05,
        promoDiscountPercent: 0.02,
      });
      expect(pricingWithLowerCoupon.breakdown.discountAmount.toNumber()).toBe(500_000);
    });

    it('enforces maximum discount cap if configured', () => {
      const hugeBasePrice = new Money(2_000_000_000, 'IRR'); // 2 Billion IRR
      const pricing = calculatePricing({
        userRole: 'CUSTOMER',
        productType: 'TOUR',
        basePrice: hugeBasePrice,
        currency: 'IRR',
        referralDiscountPercent: 0.05, // 5% would be 100M IRR, cap is 50M
      });

      if (REFERRAL_CONFIG.maxDiscountCapIrr !== null) {
        expect(pricing.breakdown.discountAmount.toNumber()).toBe(REFERRAL_CONFIG.maxDiscountCapIrr);
      }
    });
  });

  describe('3. Passenger (Pax) Counting and Reward Tiers', () => {
    it('accurately counts pax for single and multi-passenger bookings', () => {
      expect(ReferralDomainService.extractPaxCount(JSON.stringify({ passengers: [{}, {}, {}] }))).toBe(3);
      expect(ReferralDomainService.extractPaxCount(JSON.stringify({ count: 4 }))).toBe(4);
      expect(ReferralDomainService.extractPaxCount(null, 2)).toBe(2);
    });

    it('maps confirmed pax count to correct reward tier and remaining distance', () => {
      // 0 - 4 pax: 0% reward, distance to tier 1 (5)
      const tier0 = ReferralDomainService.getTierForPax(3);
      expect(tier0.rewardPercent).toBe(0);
      expect(tier0.nextTierDistance).toBe(2);

      // 5 - 9 pax: 25% reward, distance to tier 2 (10)
      const tier1 = ReferralDomainService.getTierForPax(6);
      expect(tier1.rewardPercent).toBe(0.25);
      expect(tier1.nextTierDistance).toBe(4);

      // 10 - 14 pax: 50% reward, distance to tier 3 (15)
      const tier2 = ReferralDomainService.getTierForPax(12);
      expect(tier2.rewardPercent).toBe(0.50);
      expect(tier2.nextTierDistance).toBe(3);

      // 15+ pax: 100% reward, max tier reached
      const tier3 = ReferralDomainService.getTierForPax(16);
      expect(tier3.rewardPercent).toBe(1.00);
      expect(tier3.nextTierDistance).toBe(0);
    });
  });

  describe('4. Dynamic Leader Reward Calculation & Cancellation Rollback', () => {
    it('calculates leader reward dynamically and rolls back tiers when a booking is cancelled', async () => {
      // 1. Create a confirmed booking for the leader themselves (so they have trip cost to refund)
      await prisma.booking.create({
        data: {
          id: `bkg_leader_${suffix}`,
          reference: `ITR-LDR-${suffix.toUpperCase()}`,
          customerId: leaderUserId,
          status: 'CONFIRMED',
          totalAmount: 20_000_000, // 20M IRR trip cost
          currency: 'IRR',
        },
      });

      // 2. Customer 1 creates a booking for 3 passengers under this referral code
      await prisma.booking.create({
        data: {
          id: `bkg_cust1_${suffix}`,
          reference: `ITR-C1-${suffix.toUpperCase()}`,
          customerId: customer1Id,
          status: 'CONFIRMED',
          totalAmount: 15_000_000,
          currency: 'IRR',
          referral: {
            create: {
              referralCodeId,
              rawCode: testCode,
              status: 'VALID',
              paxCount: 3,
              discountAmount: 750_000,
            },
          },
        },
      });

      // 3. Customer 2 creates a booking for 3 passengers under this referral code (Total: 6 pax -> Tier 1: 25%)
      const booking2 = await prisma.booking.create({
        data: {
          id: `bkg_cust2_${suffix}`,
          reference: `ITR-C2-${suffix.toUpperCase()}`,
          customerId: customer2Id,
          status: 'CONFIRMED',
          totalAmount: 15_000_000,
          currency: 'IRR',
          referral: {
            create: {
              referralCodeId,
              rawCode: testCode,
              status: 'VALID',
              paxCount: 3,
              discountAmount: 750_000,
            },
          },
        },
      });

      // Check stats: 3 + 3 = 6 confirmed pax -> 25% tier
      let stats = await ReferralDomainService.calculateLeaderStats(referralCodeId);
      expect(stats).not.toBeNull();
      expect(stats!.confirmedPax).toBe(6);
      expect(stats!.rewardPercent).toBe(0.25);
      // 25% of leader's 20,000,000 = 5,000,000 IRR
      expect(stats!.estimatedRewardAmount).toBe(5_000_000);

      // 4. Booking 2 gets cancelled (e.g. customer cancels or requests refund)
      await prisma.booking.update({
        where: { id: booking2.id },
        data: { status: 'CANCELLED' },
      });

      // Check stats again: Confirmed pax drops to 3, cancelledPax becomes 3!
      // Tier drops to 0% (< 5 pax) and estimatedRewardAmount rolls back to 0!
      stats = await ReferralDomainService.calculateLeaderStats(referralCodeId);
      expect(stats!.confirmedPax).toBe(3);
      expect(stats!.cancelledPax).toBe(3);
      expect(stats!.rewardPercent).toBe(0);
      expect(stats!.estimatedRewardAmount).toBe(0);
      expect(stats!.nextTierDistance).toBe(2); // 2 more to reach 5
    });
  });

  describe('5. End-to-End Booking Creation with Referral Integration', () => {
    it('creates booking draft with 5% discount when valid code is entered', async () => {
      const draft = await BookingApplicationService.createDraft({
        actorId: customer1Id,
        type: 'FLIGHT',
        itemId: 'f1',
        count: 2,
        referralCode: testCode,
        source: 'WEB',
      });

      expect(draft.success).toBe(true);
      expect(draft.referralStatus).toBe('VALID');
      expect(draft.discountAmount).toBeGreaterThan(0);

      const refRecord = await prisma.bookingReferral.findUnique({
        where: { bookingId: draft.bookingId },
      });
      expect(refRecord).not.toBeNull();
      expect(refRecord!.status).toBe('VALID');
      expect(refRecord!.referralCodeId).toBe(referralCodeId);
      expect(refRecord!.applied).toBe(true);
    });

    it('creates booking draft without failing when an invalid code is entered (unmatched handling)', async () => {
      const draft = await BookingApplicationService.createDraft({
        actorId: customer2Id,
        type: 'FLIGHT',
        itemId: 'f1',
        count: 1,
        referralCode: 'INVALID_CODE_123',
        source: 'WEB',
      });

      // Booking NEVER fails because of bad code!
      expect(draft.success).toBe(true);
      expect(draft.referralStatus).toBe('UNMATCHED');
      expect(draft.discountAmount).toBe(0);

      const refRecord = await prisma.bookingReferral.findUnique({
        where: { bookingId: draft.bookingId },
      });
      expect(refRecord).not.toBeNull();
      expect(refRecord!.status).toBe('UNMATCHED');
      expect(refRecord!.referralCodeId).toBeNull();
      expect(refRecord!.rawCode).toBe('INVALID_CODE_123');
      expect(refRecord!.applied).toBe(false);
    });
  });
});
