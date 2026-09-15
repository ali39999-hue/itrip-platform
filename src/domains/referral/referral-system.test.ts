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
      await prisma.bookingReferral.deleteMany({ where: { rawCode: { contains: suffix.toUpperCase(), mode: 'insensitive' } } });
      await prisma.referralCode.deleteMany({ where: { id: referralCodeId } });
      await prisma.referralCode.deleteMany({ where: { code: { contains: suffix.toUpperCase() } } });
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

  describe('6. Registration & Lifecycle Regression Fixes', () => {
    const inactiveCode = `INACT_${suffix.toUpperCase()}`;

    it('persists INACTIVE codes end-to-end (domain → booking row, no discount)', async () => {
      await prisma.referralCode.create({
        data: { code: inactiveCode, leaderId: leaderUserId, isActive: false },
      });

      const validation = await ReferralDomainService.validateCode(inactiveCode, customer1Id);
      expect(validation.valid).toBe(false);
      expect(validation.status).toBe('INACTIVE');
      expect(validation.reason).toBe('INACTIVE');

      const draft = await BookingApplicationService.createDraft({
        actorId: customer1Id,
        type: 'FLIGHT',
        itemId: 'f1',
        count: 1,
        referralCode: inactiveCode,
        source: 'WEB',
      });
      expect(draft.success).toBe(true);
      expect(draft.referralStatus).toBe('INACTIVE');
      expect(draft.referralDiscountAmount).toBe(0);

      const refRecord = await prisma.bookingReferral.findUnique({
        where: { bookingId: draft.bookingId },
      });
      expect(refRecord!.status).toBe('INACTIVE');
      expect(refRecord!.applied).toBe(false);
      expect(Number(refRecord!.discountAmount)).toBe(0);
    });

    it('stores rawCode normalized (trimmed + uppercase, per schema contract)', async () => {
      const draft = await BookingApplicationService.createDraft({
        actorId: customer1Id,
        type: 'FLIGHT',
        itemId: 'f1',
        count: 1,
        referralCode: `  ${testCode.toLowerCase()}  `,
        source: 'WEB',
      });
      expect(draft.success).toBe(true);
      expect(draft.referralStatus).toBe('VALID');

      const refRecord = await prisma.bookingReferral.findUnique({
        where: { bookingId: draft.bookingId },
      });
      expect(refRecord!.rawCode).toBe(testCode);
      // Attribution holds the referral-only portion (never promo money).
      expect(Number(refRecord!.discountAmount)).toBe(draft.referralDiscountAmount);
      expect(Number(refRecord!.discountAmount)).toBeGreaterThan(0);
    });

    it('reprice preserves an attached referral discount instead of wiping it', async () => {
      const draft = await BookingApplicationService.createDraft({
        actorId: customer1Id,
        type: 'FLIGHT',
        itemId: 'f1',
        count: 2,
        referralCode: testCode,
        source: 'WEB',
      });
      expect(draft.success).toBe(true);
      const before = Number(
        (await prisma.bookingReferral.findUnique({ where: { bookingId: draft.bookingId } }))!.discountAmount
      );
      expect(before).toBeGreaterThan(0);

      const repriced = await BookingApplicationService.repriceBooking({
        bookingId: draft.bookingId,
        actorId: customer1Id,
        acceptPriceChange: true,
      });
      expect(repriced.success).toBe(true);

      const after = await prisma.bookingReferral.findUnique({
        where: { bookingId: draft.bookingId },
      });
      expect(after!.status).toBe('VALID');
      expect(after!.applied).toBe(true);
      expect(Number(after!.discountAmount)).toBeGreaterThan(0);
    });

    it('cancellation revokes the referral benefit (no phantom applied=true)', async () => {
      const draft = await BookingApplicationService.createDraft({
        actorId: customer2Id,
        type: 'FLIGHT',
        itemId: 'f1',
        count: 1,
        referralCode: testCode,
        source: 'WEB',
      });
      expect(draft.success).toBe(true);

      // Walk the legal chain to CONFIRMED first (DRAFT→CANCEL_REQUESTED is
      // illegal by design; only confirmed trips are cancellable).
      await prisma.booking.update({
        where: { id: draft.bookingId },
        data: { status: 'CONFIRMED' },
      });

      await BookingApplicationService.cancelBooking({
        bookingId: draft.bookingId,
        actorId: customer2Id,
        reason: 'test cancellation revokes referral',
      });

      const refRecord = await prisma.bookingReferral.findUnique({
        where: { bookingId: draft.bookingId },
      });
      expect(refRecord!.applied).toBe(false);
    });

    it('buckets EXPIRED and FAILED bookings as cancelled pax (nothing vanishes)', async () => {
      const isoLeader = await prisma.user.create({
        data: {
          id: `usr_iso_leader_${suffix}`,
          name: 'Iso Leader',
          email: `iso_leader_${suffix}@firuzo.com`,
        },
      });
      const isoCustomer = await prisma.user.create({
        data: {
          id: `usr_iso_cust_${suffix}`,
          name: 'Iso Customer',
          email: `iso_cust_${suffix}@firuzo.com`,
        },
      });
      const isoCode = await prisma.referralCode.create({
        data: { code: `ISO_${suffix.toUpperCase()}`, leaderId: isoLeader.id },
      });

      const mkDraft = (count: number) =>
        BookingApplicationService.createDraft({
          actorId: isoCustomer.id,
          type: 'FLIGHT',
          itemId: 'f1',
          count,
          referralCode: isoCode.code,
          source: 'WEB',
        });
      const d1 = await mkDraft(2);
      const d2 = await mkDraft(3);
      expect(d1.success).toBe(true);
      expect(d2.success).toBe(true);

      await prisma.booking.update({ where: { id: d1.bookingId }, data: { status: 'EXPIRED' } });
      await prisma.booking.update({ where: { id: d2.bookingId }, data: { status: 'FAILED' } });

      const stats = await ReferralDomainService.calculateLeaderStats(isoCode.id);
      expect(stats!.confirmedPax).toBe(0);
      expect(stats!.pendingPax).toBe(0);
      expect(stats!.cancelledPax).toBe(5);

      await prisma.bookingReferral.deleteMany({ where: { booking: { customerId: isoCustomer.id } } });
      await prisma.bookingStatusHistory.deleteMany({ where: { booking: { customerId: isoCustomer.id } } });
      await prisma.bookingItem.deleteMany({ where: { booking: { customerId: isoCustomer.id } } });
      await prisma.booking.deleteMany({ where: { customerId: isoCustomer.id } });
      await prisma.referralCode.deleteMany({ where: { id: isoCode.id } });
      await prisma.user.deleteMany({ where: { id: { in: [isoLeader.id, isoCustomer.id] } } });
    });

    it('resolves UNMATCHED bookings when the code is registered later', async () => {
      const lateCode = `LATE_${suffix.toUpperCase()}`;
      const draft = await BookingApplicationService.createDraft({
        actorId: customer2Id,
        type: 'FLIGHT',
        itemId: 'f1',
        count: 1,
        referralCode: lateCode.toLowerCase(),
        source: 'WEB',
      });
      expect(draft.success).toBe(true);
      expect(draft.referralStatus).toBe('UNMATCHED');

      const created = await prisma.referralCode.create({
        data: { code: lateCode, leaderId: leaderUserId },
      });
      const resolved = await ReferralDomainService.resolveUnmatchedForCode(created.id, lateCode);
      expect(resolved).toBeGreaterThanOrEqual(1);

      const refRecord = await prisma.bookingReferral.findUnique({
        where: { bookingId: draft.bookingId },
      });
      expect(refRecord!.status).toBe('VALID');
      expect(refRecord!.referralCodeId).toBe(created.id);
      expect(refRecord!.rawCode).toBe(lateCode);

      await prisma.referralCode.deleteMany({ where: { id: created.id } });
    });
  });

  describe('7. Per-Code Variables Configuration (Discount, Cap, Max Uses Quota)', () => {
    const customConfigCode = `CONFIG_${suffix.toUpperCase()}`;
    const quotaCode = `QUOTA_${suffix.toUpperCase()}`;

    it('enforces custom discount percent and custom cap per code', async () => {
      // Create code with 15% discount and 20,000,000 IRR cap
      const refCode = await prisma.referralCode.create({
        data: {
          code: customConfigCode,
          leaderId: leaderUserId,
          customTierConfig: JSON.stringify({
            discountPercent: 0.15,
            maxDiscountCapIrr: 20_000_000,
          }),
        },
      });

      const validation = await ReferralDomainService.validateCode(customConfigCode, customer1Id);
      expect(validation.valid).toBe(true);
      expect(validation.status).toBe('VALID');
      expect(validation.discountPercent).toBe(0.15);
      expect(validation.discountCapIrr).toBe(20_000_000);

      // Verify custom discount calculation with cap enforcement
      const calc1 = ReferralDomainService.calculateDiscount(100_000_000, 0.15, 20_000_000);
      // 15% of 100M is 15M, which is under 20M cap
      expect(calc1.discountAmount).toBe(15_000_000);

      const calc2 = ReferralDomainService.calculateDiscount(200_000_000, 0.15, 20_000_000);
      // 15% of 200M is 30M, which exceeds 20M cap -> capped at 20M
      expect(calc2.discountAmount).toBe(20_000_000);

      await prisma.referralCode.deleteMany({ where: { id: refCode.id } });
    });

    it('enforces maxUses capacity limit and rejects bookings when quota is exhausted', async () => {
      // Create code with maxUses: 1 (valid for exactly one active booking)
      const refCode = await prisma.referralCode.create({
        data: {
          code: quotaCode,
          leaderId: leaderUserId,
          customTierConfig: JSON.stringify({
            discountPercent: 0.10,
            maxUses: 1,
          }),
        },
      });

      // 1. Initial check -> Valid
      const initialValidation = await ReferralDomainService.validateCode(quotaCode, customer1Id);
      expect(initialValidation.valid).toBe(true);
      expect(initialValidation.status).toBe('VALID');
      expect(initialValidation.maxUses).toBe(1);

      // 2. Customer 1 uses the code (fills the quota)
      const draft1 = await BookingApplicationService.createDraft({
        actorId: customer1Id,
        type: 'FLIGHT',
        itemId: 'f1',
        count: 1,
        referralCode: quotaCode,
        source: 'WEB',
      });
      expect(draft1.success).toBe(true);
      expect(draft1.referralStatus).toBe('VALID');
      expect(draft1.referralDiscountAmount).toBeGreaterThan(0);

      // 3. Customer 2 tries to use the same code -> Quota reached!
      const postQuotaValidation = await ReferralDomainService.validateCode(quotaCode, customer2Id);
      expect(postQuotaValidation.valid).toBe(false);
      expect(postQuotaValidation.status).toBe('USAGE_LIMIT_EXCEEDED');
      expect(postQuotaValidation.reason).toBe('USAGE_LIMIT_EXCEEDED');

      // 4. Booking creation with exhausted code succeeds without discount
      const draft2 = await BookingApplicationService.createDraft({
        actorId: customer2Id,
        type: 'FLIGHT',
        itemId: 'f1',
        count: 1,
        referralCode: quotaCode,
        source: 'WEB',
      });
      expect(draft2.success).toBe(true);
      expect(draft2.referralStatus).toBe('USAGE_LIMIT_EXCEEDED');
      expect(draft2.referralDiscountAmount).toBe(0);

      // Cleanup
      await prisma.bookingReferral.deleteMany({ where: { referralCodeId: refCode.id } });
      await prisma.bookingReferral.deleteMany({ where: { rawCode: quotaCode } });
      await prisma.bookingStatusHistory.deleteMany({ where: { booking: { id: { in: [draft1.bookingId, draft2.bookingId] } } } });
      await prisma.priceSnapshot.deleteMany({ where: { booking: { id: { in: [draft1.bookingId, draft2.bookingId] } } } });
      await prisma.bookingItem.deleteMany({ where: { booking: { id: { in: [draft1.bookingId, draft2.bookingId] } } } });
      await prisma.booking.deleteMany({ where: { id: { in: [draft1.bookingId, draft2.bookingId] } } });
      await prisma.referralCode.deleteMany({ where: { id: refCode.id } });
    });
  });
});
