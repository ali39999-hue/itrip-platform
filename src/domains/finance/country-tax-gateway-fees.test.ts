import { describe, it, expect } from 'vitest';
import { calculateCountryPricing, chargeContext } from '@/lib/money';
import { COUNTRIES, type CountryId } from '@/lib/countries';

describe('Country Tax and Gateway Fee Calculations', () => {
  const countryCases: Array<{
    id: CountryId;
    expectedTaxRate: number;
    expectedFeeRate: number;
    currency: string;
  }> = [
    { id: 'iran', expectedTaxRate: 0.09, expectedFeeRate: 0, currency: 'IRR' },
    { id: 'turkey', expectedTaxRate: 0.10, expectedFeeRate: 0.02, currency: 'TRY' },
    { id: 'uae', expectedTaxRate: 0.05, expectedFeeRate: 0.025, currency: 'AED' },
    { id: 'georgia', expectedTaxRate: 0.18, expectedFeeRate: 0.02, currency: 'GEL' },
    { id: 'russia', expectedTaxRate: 0.20, expectedFeeRate: 0.02, currency: 'RUB' },
    { id: 'oman', expectedTaxRate: 0.05, expectedFeeRate: 0.025, currency: 'OMR' },
    { id: 'china', expectedTaxRate: 0.06, expectedFeeRate: 0.015, currency: 'CNY' },
  ];

  it('verifies all 7 countries have accurate tax and gateway fee rates configured', () => {
    for (const c of countryCases) {
      const config = COUNTRIES[c.id];
      expect(config.taxRate).toBe(c.expectedTaxRate);
      expect(config.gatewayFeeRate).toBe(c.expectedFeeRate);
      expect(config.currency).toBe(c.currency);

      const ctx = chargeContext(c.id);
      expect(ctx.taxRate).toBe(c.expectedTaxRate);
      expect(ctx.gatewayFeeRate).toBe(c.expectedFeeRate);
    }
  });

  it('calculates checkout pricing for Iran (9% VAT + 0% Shetab fee)', () => {
    const res = calculateCountryPricing({
      subtotal: 10_000_000,
      countryId: 'iran',
      gateway: 'shetab',
    });

    expect(res.subtotal).toBe(10_000_000);
    expect(res.taxAmount).toBe(900_000); // 9%
    expect(res.gatewayFeeAmount).toBe(0); // 0% on Shetab
    expect(res.totalPayable).toBe(10_900_000);
  });

  it('calculates checkout pricing for UAE (5% VAT + 2.5% card gateway fee)', () => {
    const res = calculateCountryPricing({
      subtotal: 1_000,
      countryId: 'uae',
      gateway: 'gateway_ecardo',
    });

    expect(res.subtotal).toBe(1_000);
    expect(res.taxAmount).toBe(50); // 5% of 1,000 = 50
    // Gateway fee: 2.5% of (1,000 + 50) = 26.25
    expect(res.gatewayFeeAmount).toBe(26.25);
    expect(res.totalPayable).toBe(1076.25);
  });

  it('calculates checkout pricing for Turkey (10% VAT + 2% gateway fee)', () => {
    const res = calculateCountryPricing({
      subtotal: 5_000,
      countryId: 'turkey',
      gateway: 'gateway_ecardo',
    });

    expect(res.taxAmount).toBe(500); // 10%
    // Gateway fee: 2% of 5,500 = 110
    expect(res.gatewayFeeAmount).toBe(110);
    expect(res.totalPayable).toBe(5_610);
  });

  it('treats wallet top-up as tax-exempt while retaining gateway processing fee', () => {
    const res = calculateCountryPricing({
      subtotal: 100,
      countryId: 'uae',
      gateway: 'ecardo',
      isWalletTopUp: true,
    });

    expect(res.taxRate).toBe(0);
    expect(res.taxAmount).toBe(0); // Top-up balance is exempt from VAT
    expect(res.gatewayFeeAmount).toBe(2.5); // 2.5% gateway card fee
    expect(res.totalPayable).toBe(102.5);
  });
});
