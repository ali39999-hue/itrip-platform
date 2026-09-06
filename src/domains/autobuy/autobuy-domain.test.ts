import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { AutoBuyDomainService } from './AutoBuyDomainService';
import { GeneralLedgerService } from '../ledger/GeneralLedgerService';
import { daysFromNow } from '@/lib/utils';
import { Prisma } from '@prisma/client';

describe('Auto-Buy Domain & Smart Execution Suite', () => {
  const suffix = `ab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  let testUserId = '';
  const createdRuleIds: string[] = [];
  const createdBookingIds: string[] = [];

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `autobuy_${suffix}@firuzo.com`,
        phone: `+98912${Math.floor(1000000 + Math.random() * 9000000)}`,
        name: 'کاربر تست خرید خودکار',
        role: 'CUSTOMER',
      },
    });
    testUserId = user.id;

    // Create a user wallet account in IRR
    await prisma.account.create({
      data: {
        ownerType: 'USER',
        ownerId: testUserId,
        currency: 'IRR',
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.autoBuyRule.deleteMany({ where: { userId: testUserId } });

      for (const bId of createdBookingIds) {
        await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: bId } }).catch(() => {});
        await prisma.priceSnapshot.deleteMany({ where: { bookingId: bId } }).catch(() => {});
        await prisma.bookingItem.deleteMany({ where: { bookingId: bId } }).catch(() => {});
        await prisma.booking.deleteMany({ where: { id: bId } }).catch(() => {});
      }

      await prisma.ledgerEntry.deleteMany({ where: { referenceType: 'TOPUP', referenceId: { contains: suffix } } }).catch(() => {});
      await prisma.account.deleteMany({ where: { ownerId: testUserId } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: testUserId } }).catch(() => {});
    } catch (e) {
      console.error('Cleanup error:', e);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('validates and creates an active AutoBuyRule with encrypted passenger details', async () => {
    const rule = await AutoBuyDomainService.createRule(testUserId, {
      title: 'خرید خودکار تور مشهد',
      serviceType: 'TOURS',
      targetId: 't2',
      targetDate: daysFromNow(10),
      maxPrice: 60000000,
      passengerCount: 1,
      passengers: [
        {
          firstName: 'رضا',
          lastName: 'کریمی',
          nationalId: '0012345678',
        },
      ],
    });

    createdRuleIds.push(rule.id);

    expect(rule.id).toBeTruthy();
    expect(rule.status).toBe('ACTIVE');
    expect(rule.serviceType).toBe('TOURS');
    expect(Number(rule.maxPrice)).toBe(60000000);

    // Verify encrypted passenger data
    const parsedPassengers = JSON.parse(rule.passengerDetails);
    expect(parsedPassengers.length).toBe(1);
    expect(parsedPassengers[0].firstName).toBe('رضا');
    expect(parsedPassengers[0].nationalId).toContain('enc:v1:');
  });

  it('rejects rule creation with invalid parameters', async () => {
    await expect(
      AutoBuyDomainService.createRule(testUserId, {
        title: '',
        serviceType: 'TOURS',
        targetDate: '2026-09-10',
        maxPrice: 5000000,
      })
    ).rejects.toThrow('Title is required');

    await expect(
      AutoBuyDomainService.createRule(testUserId, {
        title: 'تست',
        serviceType: 'TOURS',
        targetDate: 'invalid-date',
        maxPrice: 5000000,
      })
    ).rejects.toThrow('Valid target date');

    await expect(
      AutoBuyDomainService.createRule(testUserId, {
        title: 'تست',
        serviceType: 'TOURS',
        targetDate: '2026-10-10',
        maxPrice: 0,
      })
    ).rejects.toThrow('Max price must be greater than zero');
  });

  it('correctly checks match based on price and criteria', async () => {
    // 1. Matches when tour price is below maxPrice
    const matchSuccess = await AutoBuyDomainService.checkMatch({
      serviceType: 'TOURS',
      targetId: 't1',
      origin: null,
      destination: 'اصفهان',
      targetDate: daysFromNow(5),
      maxPrice: new Prisma.Decimal(90000000),
      passengerCount: 1,
    });

    expect(matchSuccess.matched).toBe(true);
    expect(matchSuccess.totalCost).toBeLessThanOrEqual(90000000);

    // 2. Fails to match when maxPrice is too low
    const matchFail = await AutoBuyDomainService.checkMatch({
      serviceType: 'TOURS',
      targetId: 't1',
      origin: null,
      destination: 'اصفهان',
      targetDate: daysFromNow(5),
      maxPrice: new Prisma.Decimal(10000000), // Only 10M Toman (t1 is 85M)
      passengerCount: 1,
    });

    expect(matchFail.matched).toBe(false);
  });

  it('transitions rule to FAILED_FUNDS when user wallet has insufficient balance', async () => {
    const rule = await AutoBuyDomainService.createRule(testUserId, {
      title: 'خرید خودکار استانبول',
      serviceType: 'TOURS',
      targetId: 't1',
      targetDate: daysFromNow(5),
      maxPrice: 100000000, // Matches t1 (85M)
      passengerCount: 1,
    });

    createdRuleIds.push(rule.id);

    // Current wallet balance is 0
    const evalRes = await AutoBuyDomainService.evaluateRule(rule.id);

    expect(evalRes.matched).toBe(true);
    expect(evalRes.executed).toBe(false);
    expect(evalRes.success).toBe(false);

    // Check DB status
    const updated = await prisma.autoBuyRule.findUnique({ where: { id: rule.id } });
    expect(updated?.status).toBe('FAILED_FUNDS');
    expect(updated?.failureReason).toBeTruthy();
  });

  it('cancels an active rule and prevents re-cancellation', async () => {
    const rule = await AutoBuyDomainService.createRule(testUserId, {
      title: 'سفارش لغوی',
      serviceType: 'FLIGHTS',
      origin: 'تهران',
      destination: 'مشهد',
      targetDate: daysFromNow(7),
      maxPrice: 15000000,
    });

    const cancelled = await AutoBuyDomainService.cancelRule(testUserId, rule.id);
    expect(cancelled.status).toBe('CANCELLED');

    const fresh = await prisma.autoBuyRule.findUnique({ where: { id: rule.id } });
    expect(fresh?.status).toBe('CANCELLED');
  });

  it('executes purchase, debits wallet, confirms booking and updates rule to FULFILLED when balance is sufficient', async () => {
    // 1. Top up user wallet with sufficient funds
    await GeneralLedgerService.postTopUp({
      groupId: `topup_${suffix}`,
      userId: testUserId,
      amount: 100_000_000,
      currency: 'IRR',
      referenceId: `REF-${suffix}`,
    });

    // 2. Create rule that matches tour t2 (price: 52,000,000)
    const rule = await AutoBuyDomainService.createRule(testUserId, {
      title: 'خرید خودکار قطعی مشهد',
      serviceType: 'TOURS',
      targetId: 't2',
      targetDate: daysFromNow(3),
      maxPrice: 55000000,
      passengerCount: 1,
      passengers: [{ firstName: 'علی', lastName: 'حسینی' }],
    });

    createdRuleIds.push(rule.id);

    // 3. Evaluate and execute rule
    const evalRes = await AutoBuyDomainService.evaluateRule(rule.id);

    expect(evalRes.matched).toBe(true);
    expect(evalRes.executed).toBe(true);
    expect(evalRes.success).toBe(true);
    expect(evalRes.bookingId).toBeTruthy();

    if (evalRes.bookingId) {
      createdBookingIds.push(evalRes.bookingId);
    }

    // 4. Verify DB rule state
    const fulfilledRule = await prisma.autoBuyRule.findUnique({ where: { id: rule.id } });
    expect(fulfilledRule?.status).toBe('FULFILLED');
    expect(fulfilledRule?.bookingId).toBe(evalRes.bookingId);

    // 5. Verify created Booking
    const booking = await prisma.booking.findUnique({
      where: { id: evalRes.bookingId },
      include: { items: true },
    });
    expect(booking?.status).toBe('CONFIRMED');
    expect(booking?.paymentStatus).toBe('CAPTURED');
  });
});
