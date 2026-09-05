import { describe, it, expect } from 'vitest';
import { Money } from '@/lib/finance';
import { TaxEngine } from '@/lib/finance/tax-engine';
import { calculatePricing, roundCurrency } from '@/lib/pricing/engine';
import { Prisma } from '@prisma/client';

describe('Financial Kernel & Precision Suite (MONEY-001, MONEY-002)', () => {
  it('prevents floating point arithmetic errors using Prisma Decimal', () => {
    // Classic JavaScript float bug: 0.1 + 0.2 !== 0.3
    const m1 = new Money('0.1', 'USD');
    const m2 = new Money('0.2', 'USD');
    const sum = m1.add(m2);

    expect(sum.toString()).toBe('0.3');
    expect(sum.toDecimal().equals(new Prisma.Decimal('0.3'))).toBe(true);
  });

  it('rejects cross-currency arithmetic without explicit conversion', () => {
    const irr = new Money('1000000', 'IRR');
    const usd = new Money('20', 'USD');

    expect(() => irr.add(usd)).toThrow(/currency mismatch/i);
    expect(() => irr.sub(usd)).toThrow(/currency mismatch/i);
  });

  it('handles zero, negative, and very large amounts accurately', () => {
    const zero = Money.zero('IRR');
    expect(zero.isZero()).toBe(true);
    expect(zero.isPositive()).toBe(false);

    const neg = new Money('-50000', 'IRR');
    expect(neg.isNegative()).toBe(true);

    const veryLarge = new Money('999999999999999999.99', 'IRR');
    const added = veryLarge.add(new Money('0.01', 'IRR'));
    expect(added.toString()).toBe('1000000000000000000');
  });

  it('preserves immutable historical FX conversion snapshots (MONEY-004)', () => {
    const amount = new Money('100', 'USD');
    const fxRate = new Prisma.Decimal('600000'); // 1 USD = 600,000 IRR
    const snapshot = amount.convert(fxRate, 'IRR', 'CENTRAL_BANK_NIMA');

    expect(snapshot.transactionCurrency).toBe('USD');
    expect(snapshot.baseCurrency).toBe('IRR');
    expect(snapshot.baseAmount.toString()).toBe('60000000');
    expect(snapshot.fxRate.toString()).toBe('600000');
    expect(snapshot.fxSource).toBe('CENTRAL_BANK_NIMA');
    expect(snapshot.fxTimestamp).toBeInstanceOf(Date);
  });

  it('rounds IRR to nearest 10,000 Rial increments deterministically', () => {
    const { rounded: r1 } = roundCurrency(1234567, 'IRR');
    expect(r1 % 10000).toBe(0);
    expect(r1).toBe(1230000);

    const { rounded: r2 } = roundCurrency(1238900, 'IRR');
    expect(r2 % 10000).toBe(0);
    expect(r2).toBe(1240000);
  });

  it('converts currencies via CurrencyService with zero floating-point error and preserves FX snapshot', async () => {
    const { defaultCurrencyService } = await import('@/domains/currency/CurrencyService');
    const usdtMoney = new Money('100', 'USDT');
    const { converted, snapshot } = defaultCurrencyService.convertMoney(usdtMoney, 'IRR');

    expect(converted.currency).toBe('IRR');
    expect(converted.toNumber()).toBe(55000000); // 100 * 550,000 = 55,000,000 IRR
    expect(snapshot.fxRate.toString()).toBe('550000');
    expect(snapshot.fxSource).toBe('CENTRAL_BANK_RATE');
  });
});

describe('Versioned Tax Engine Suite (MONEY-003)', () => {
  it('calculates standard domestic VAT for flight and hotel services', () => {
    const taxable = new Money('10000000', 'IRR');
    const resFlight = TaxEngine.calculateTax({
      taxableAmount: taxable,
      serviceType: 'FLIGHT',
      jurisdiction: 'IR',
    });

    expect(resFlight.taxRate.toString()).toBe('0.09');
    expect(resFlight.taxAmount.toString()).toBe('900000');
    expect(resFlight.totalWithTax.toString()).toBe('10900000');
    expect(resFlight.ruleVersion).toBeDefined();
  });

  it('exempts international and visa services according to jurisdiction policy', () => {
    const taxable = new Money('5000000', 'IRR');
    const resVisa = TaxEngine.calculateTax({
      taxableAmount: taxable,
      serviceType: 'VISA',
      jurisdiction: 'IR',
    });

    expect(resVisa.taxRate.toString()).toBe('0');
    expect(resVisa.taxAmount.toString()).toBe('0');
    expect(resVisa.totalWithTax.toString()).toBe('5000000');
  });

  it('applies foreign jurisdiction rates correctly (e.g. China 6%, UAE 5%)', () => {
    const taxable = new Money('1000', 'CNY');
    const resCn = TaxEngine.calculateTax({
      taxableAmount: taxable,
      jurisdiction: 'CN',
      serviceType: 'HOTEL',
      currency: 'CNY',
    });
    expect(resCn.taxRate.toString()).toBe('0.06');
    expect(resCn.taxAmount.toString()).toBe('60');

    const resAe = TaxEngine.calculateTax({
      taxableAmount: new Money('1000', 'AED'),
      jurisdiction: 'AE',
      serviceType: 'HOTEL',
      currency: 'AED',
    });
    expect(resAe.taxRate.toString()).toBe('0.05');
    expect(resAe.taxAmount.toString()).toBe('50');
  });
});

describe('Server-Side Pricing Engine Pipeline (PRICE-001, PRICE-002)', () => {
  it('executes the 12-stage pipeline and produces an immutable PriceSnapshot', () => {
    const baseCost = 20_000_000;
    const result = calculatePricing({
      userRole: 'CUSTOMER',
      productType: 'HOTEL',
      basePrice: baseCost,
      currency: 'IRR',
      isDomestic: true,
      promoDiscountPercent: 0.05, // 5% promo
    });

    expect(result.netCost).toBe(baseCost);
    expect(result.markupAmount).toBe(2_000_000); // 10% on hotel
    expect(result.taxAmount).toBeGreaterThan(0);
    expect(result.sellPrice).toBeGreaterThan(baseCost);
    expect(result.sellPrice % 10000).toBe(0); // IRR rounding

    // Verify snapshot fields
    const snap = result.snapshot;
    expect(snap.baseAmount.toNumber()).toBe(baseCost);
    expect(snap.markupAmount.toNumber()).toBe(2_000_000);
    expect(snap.sellPrice.toNumber()).toBe(result.sellPrice);
    expect(snap.currency).toBe('IRR');
    expect(snap.breakdownJson).toContain('HOTEL');
    expect(snap.breakdownJson).toContain('CUSTOMER');
  });

  it('applies B2B wholesale discounts over retail customer prices', () => {
    const baseCost = 15_000_000;
    const custPricing = calculatePricing({
      userRole: 'CUSTOMER',
      productType: 'FLIGHT',
      basePrice: baseCost,
      currency: 'IRR',
    });

    const b2bPricing = calculatePricing({
      userRole: 'B2B',
      productType: 'FLIGHT',
      basePrice: baseCost,
      currency: 'IRR',
    });

    expect(b2bPricing.markupAmount).toBeLessThan(custPricing.markupAmount);
    expect(b2bPricing.sellPrice).toBeLessThan(custPricing.sellPrice);
  });
});
