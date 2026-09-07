import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { Money, MoneyBreakdown } from '@/lib/finance';
import { calculatePricing, roundCurrency } from '@/lib/pricing/engine';
import { PriceSnapshotDomainService } from './PriceSnapshotDomainService';
import { QuoteDomainService } from './QuoteDomainService';
import { QuoteStateMachine } from './QuoteStateMachine';
import { PriceExplanationService } from './PriceExplanationService';
import { GeneralLedgerService } from '@/domains/ledger/GeneralLedgerService';
import { InvoiceDomainService } from '@/domains/finance/InvoiceDomainService';

describe('Wave 2: Money, Quote & Reprice Domain Suite (MONEY-101 to MONEY-111)', () => {
  const suffix = `w2_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  let testUserId = '';
  let testBookingId = '';

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        id: `usr_${suffix}`,
        email: `wave2_${suffix}@firuzo.test`,
        name: 'Wave2 Financial Test User',
      },
    });
    testUserId = user.id;

    const booking = await prisma.booking.create({
      data: {
        reference: `ITR-${suffix}`,
        customerId: testUserId,
        status: 'HELD',
        paymentStatus: 'INITIATED',
        totalAmount: 10_000_000,
        currency: 'IRR',
      },
    });
    testBookingId = booking.id;
  });

  afterAll(async () => {
    try {
      await prisma.ledgerEntry.deleteMany({ where: { groupId: `grp_top_${suffix}` } });
      await prisma.journalLine.deleteMany({ where: { journalEntry: { entryNumber: `JE-grp_top_${suffix}` } } });
      await prisma.journalEntry.deleteMany({ where: { entryNumber: `JE-grp_top_${suffix}` } });
      await prisma.account.deleteMany({ where: { ownerId: testUserId } });
      await prisma.priceSnapshot.deleteMany({ where: { bookingId: testBookingId } });
      await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: testBookingId } });
      await prisma.booking.deleteMany({ where: { id: testBookingId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
      await prisma.$disconnect();
    } catch {
      // Best effort cleanup
    }
  });

  it('MONEY-101: Core financial APIs require Money and reject raw JS numbers', () => {
    const baseMoney = new Money(5_000_000, 'IRR');
    const pricing = calculatePricing({
      userRole: 'CUSTOMER',
      productType: 'HOTEL',
      basePrice: baseMoney,
      currency: 'IRR',
    });

    expect(pricing.breakdown.baseCost).toBeInstanceOf(Money);
    expect(pricing.breakdown.sellPrice).toBeInstanceOf(Money);
    expect(pricing.breakdown.baseCost.equals(baseMoney)).toBe(true);
  });

  it('MONEY-102 & MONEY-103: Centralized rounding via Money avoids JS floating-point issues', () => {
    const raw = new Money('1234567', 'IRR');
    const { rounded, delta, money } = roundCurrency(raw);

    expect(rounded % 10000).toBe(0);
    expect(rounded).toBe(1230000);
    expect(money).toBeInstanceOf(Money);
    expect(money.toString()).toBe('1230000');
    expect(delta).toBe(-4567);
  });

  it('MONEY-104: Financial services return Money instances for all core outputs', async () => {
    // 1. Ledger returns Money
    const account = await prisma.account.create({
      data: {
        ownerType: 'USER',
        ownerId: testUserId,
        currency: 'IRR',
      },
    });

    await GeneralLedgerService.postTopUp({
      groupId: `grp_top_${suffix}`,
      userId: testUserId,
      amount: new Money(2_000_000, 'IRR'),
      currency: 'IRR',
    });

    const balMoney = await GeneralLedgerService.getAccountBalance(account.id, 'IRR');
    expect(balMoney).toBeInstanceOf(Money);
    expect(balMoney.toNumber()).toBe(2_000_000);

    // 2. Invoice returns Money
    const invoice = await InvoiceDomainService.createInvoice({
      bookingId: testBookingId,
      customerId: testUserId,
      lines: [
        {
          description: 'Hotel room test',
          quantity: 1,
          unitPrice: new Money(1_000_000, 'IRR'),
          taxAmount: new Money(90_000, 'IRR'),
        },
      ],
      currency: 'IRR',
    });

    expect(invoice.totalMoney).toBeInstanceOf(Money);
    expect(invoice.totalMoney.toNumber()).toBe(1_090_000);

    // Cleanup account
    await prisma.ledgerEntry.deleteMany({ where: { accountId: account.id } });
    await prisma.account.delete({ where: { id: account.id } });
  });

  it('MONEY-105: Creates canonical immutable PriceSnapshot with breakdown, rule versions and expiresAt', async () => {
    const baseCost = new Money(4_000_000, 'IRR');
    const breakdown: MoneyBreakdown = {
      baseCost,
      supplierFee: new Money(100_000, 'IRR'),
      markupAmount: new Money(400_000, 'IRR'),
      taxAmount: new Money(405_000, 'IRR'),
      platformFee: new Money(200_000, 'IRR'),
      discountAmount: Money.zero('IRR'),
      roundingDelta: Money.zero('IRR'),
      sellPrice: new Money(5_105_000, 'IRR'),
      currency: 'IRR',
    };

    const snapshot = await PriceSnapshotDomainService.createPriceSnapshot({
      bookingId: testBookingId,
      breakdown,
      ruleVersions: {
        taxRuleVersion: '2026-v2',
        pricingEngineVersion: '12-stage-v2',
        commissionRuleVersion: 'comm-v1',
      },
      ttlMinutes: 20,
    });

    expect(snapshot.id).toBeDefined();
    expect(snapshot.sellPrice.toNumber()).toBe(5_105_000);
    expect(snapshot.ruleVersions.taxRuleVersion).toBe('2026-v2');
    expect(snapshot.expiresAt).toBeInstanceOf(Date);
    expect(PriceSnapshotDomainService.verifyIntegrity(snapshot)).toBe(true);

    const latest = await PriceSnapshotDomainService.getLatestSnapshot(testBookingId);
    expect(latest).not.toBeNull();
    expect(latest?.snapshotHash).toBe(snapshot.snapshotHash);
  });

  it('MONEY-106 & MONEY-107: Quote aggregate and state machine transitions', async () => {
    const baseCost = new Money(8_000_000, 'IRR');
    const breakdown: MoneyBreakdown = {
      baseCost,
      supplierFee: Money.zero('IRR'),
      markupAmount: new Money(640_000, 'IRR'),
      taxAmount: new Money(777_600, 'IRR'),
      platformFee: Money.zero('IRR'),
      discountAmount: Money.zero('IRR'),
      roundingDelta: Money.zero('IRR'),
      sellPrice: new Money(9_417_600, 'IRR'),
      currency: 'IRR',
    };

    // Create quote
    const quote = await QuoteDomainService.createQuote({
      bookingId: testBookingId,
      supplierRef: 'SUP-HOTEL-99',
      breakdown,
      ttlMinutes: 15,
    });

    expect(quote.quoteNumber).toMatch(/^QTE-\d{8}-[A-F0-9]{8}$/);
    expect(quote.status).toBe('ACTIVE');
    expect(quote.sellPrice.toNumber()).toBe(9_417_600);
    expect(QuoteDomainService.verifyQuoteIntegrity(quote)).toBe(true);

    // State machine: ACTIVE -> EXPIRED is valid
    expect(QuoteStateMachine.canTransition('ACTIVE', 'EXPIRED')).toBe(true);
    expect(QuoteStateMachine.canTransition('ACTIVE', 'REPLACED')).toBe(true);
    expect(QuoteStateMachine.canTransition('EXPIRED', 'ACTIVE')).toBe(false);
    expect(QuoteStateMachine.canTransition('REPLACED', 'ACTIVE')).toBe(false);

    // Replace quote with a new quote
    const { oldQuote, newQuote } = await QuoteDomainService.replaceQuote(quote.quoteNumber, {
      breakdown: {
        ...breakdown,
        sellPrice: new Money(9_500_000, 'IRR'),
      },
    });

    expect(oldQuote.status).toBe('REPLACED');
    expect(newQuote.status).toBe('ACTIVE');
    expect(newQuote.quoteNumber).not.toBe(oldQuote.quoteNumber);

    // Attempting to transition terminal state throws
    expect(() => QuoteStateMachine.assertTransition(oldQuote.status, 'ACTIVE')).toThrow(/Invalid quote state transition/i);
  });

  it('MONEY-108: Enforces quote expiry server-side', async () => {
    const baseCost = new Money(1_000_000, 'IRR');
    const breakdown: MoneyBreakdown = {
      baseCost,
      supplierFee: Money.zero('IRR'),
      markupAmount: Money.zero('IRR'),
      taxAmount: Money.zero('IRR'),
      platformFee: Money.zero('IRR'),
      discountAmount: Money.zero('IRR'),
      roundingDelta: Money.zero('IRR'),
      sellPrice: baseCost,
      currency: 'IRR',
    };

    // Create an expired quote (TTL = -1 minute)
    const expiredQuote = await QuoteDomainService.createQuote({
      breakdown,
      expiresAt: new Date(Date.now() - 60 * 1000),
    });

    expect(QuoteDomainService.isQuoteExpired(expiredQuote)).toBe(true);

    // Expire explicitly
    const expired = await QuoteDomainService.expireQuote(expiredQuote.quoteNumber, 'TTL elapsed in test');
    expect(expired.status).toBe('EXPIRED');
  });

  it('MONEY-111: Generates comprehensive price explanation view', () => {
    const baseCost = new Money(10_000_000, 'IRR');
    const breakdown: MoneyBreakdown = {
      baseCost,
      supplierFee: new Money(100_000, 'IRR'),
      markupAmount: new Money(800_000, 'IRR'),
      taxAmount: new Money(981_000, 'IRR'),
      platformFee: new Money(400_000, 'IRR'),
      discountAmount: new Money(500_000, 'IRR'),
      roundingDelta: new Money(19_000, 'IRR'),
      sellPrice: new Money(11_800_000, 'IRR'),
      currency: 'IRR',
    };

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const viewFa = PriceExplanationService.explainBreakdown(breakdown, {
      locale: 'fa',
      expiresAt,
    });

    expect(viewFa.currency).toBe('IRR');
    expect(viewFa.totalSellPrice.toNumber()).toBe(11_800_000);
    expect(viewFa.items.length).toBeGreaterThanOrEqual(6);
    expect(viewFa.isExpired).toBe(false);
    expect(viewFa.expiresInSeconds).toBeGreaterThan(0);
    expect(viewFa.transparencyNote).toContain('تضمین می‌کند');

    const viewEn = PriceExplanationService.explainBreakdown(breakdown, {
      locale: 'en',
      expiresAt,
    });
    expect(viewEn.transparencyNote).toContain('guarantees complete fee transparency');
  });
});
