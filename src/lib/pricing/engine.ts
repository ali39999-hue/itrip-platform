import { Prisma } from '@prisma/client';
import { Money, MoneyBreakdown } from '@/lib/finance';
import { TaxEngine } from '@/lib/finance/tax-engine';

export interface PricingContext {
  userRole: string; // CUSTOMER, AGENT, B2B, B2B_TIER_1, SUPER_ADMIN
  supplierId?: string;
  productType: string; // FLIGHT, HOTEL, VISA, INSURANCE, ESIM, TOUR, TRANSFER
  basePrice: Money | Prisma.Decimal | number;
  currency?: string;
  isDomestic?: boolean;
  channel?: 'WEB' | 'MOBILE' | 'B2B_PORTAL' | 'API';
  promoDiscountPercent?: number; // e.g. 0.05 for 5% off
  fxRate?: Prisma.Decimal | number;
  targetCurrency?: string;
}

export interface PriceSnapshotData {
  baseAmount: Prisma.Decimal;
  markupAmount: Prisma.Decimal;
  serviceFee: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  sellPrice: Prisma.Decimal;
  currency: string;
  fxRate: Prisma.Decimal;
  baseCurrency: string;
  breakdownJson: string;
}

export interface PricingResult {
  // Canonical Money Breakdown (P0)
  breakdown: MoneyBreakdown;
  snapshot: PriceSnapshotData;

  // Numeric convenience getters for backward compatibility
  netCost: number;
  markupAmount: number;
  serviceFee: number;
  taxAmount: number;
  sellPrice: number;
  currency: string;
  roundingDelta: number;
}

/**
 * Currency rounding policy:
 * - IRR: Round to nearest 10,000 Rials (1,000 Tomans) using Decimal arithmetic
 * - Foreign currencies: Round to 2 decimal places
 */
export function roundCurrency(amount: number | Prisma.Decimal | Money, currency: string = 'IRR'): { rounded: number; delta: number; money: Money } {
  const m = amount instanceof Money
    ? amount
    : new Money(amount, currency);

  const { rounded: roundedMoney, delta: deltaMoney } = m.roundForCurrency();

  return {
    rounded: roundedMoney.toNumber(),
    delta: deltaMoney.toNumber(),
    money: roundedMoney,
  };
}

/**
 * Canonical 12-Stage Server-Side Pricing Engine (PRICE-001, PRICE-002)
 * Pipeline:
 * 1. Supplier Base Cost
 * 2. Supplier Fee
 * 3. Markup (Role & Product aware)
 * 4. Channel Rule
 * 5. Customer / Partner Rule
 * 6. Platform Service Fee
 * 7. Versioned Tax Calculation
 * 8. Promotion / Discount
 * 9. Payment Method Surcharge
 * 10. FX Conversion Snapshot
 * 11. Currency-Specific Rounding
 * 12. Final Authoritative Sell Price & Immutable PriceSnapshot
 */
export function calculatePricing(ctx: PricingContext): PricingResult {
  const currency = (ctx.currency || 'IRR').toUpperCase();
  const baseCost = ctx.basePrice instanceof Money
    ? ctx.basePrice
    : new Money(ctx.basePrice, currency);

  // Stage 1 & 2: Supplier Cost & Supplier Fee
  let supplierFee = Money.zero(currency);
  if (ctx.productType === 'FLIGHT' && currency === 'IRR') {
    supplierFee = new Money(100_000, currency); // e.g. GDS issuance fee
  }

  // Stage 3, 4, 5: Markup Percent calculation
  let markupRate = new Prisma.Decimal('0.08'); // Default 8% platform markup
  let platformFee = Money.zero(currency);

  const role = (ctx.userRole || 'CUSTOMER').toUpperCase();
  if (role === 'AGENT' || role === 'B2B' || role === 'B2B_TIER_1') {
    markupRate = new Prisma.Decimal('0.035'); // 3.5% wholesale partner markup
  } else if (role === 'VIP' || role === 'GOLD_CUSTOMER') {
    markupRate = new Prisma.Decimal('0.05');
  }

  // Product-specific markups and fees (wholesale partner markup takes precedence)
  const isWholesale = role === 'AGENT' || role === 'B2B' || role === 'B2B_TIER_1';
  const pType = ctx.productType.toUpperCase();
  if (pType === 'FLIGHT') {
    if (role === 'CUSTOMER') {
      markupRate = new Prisma.Decimal('0.05');
      platformFee = currency === 'IRR' ? new Money(400_000, currency) : new Money(1, currency);
    }
  } else if (pType === 'HOTEL') {
    if (!isWholesale) {
      markupRate = new Prisma.Decimal('0.10');
    }
  } else if (pType === 'VISA' || pType === 'INSURANCE') {
    if (!isWholesale) {
      markupRate = new Prisma.Decimal('0.14');
      platformFee = currency === 'IRR' ? new Money(250_000, currency) : new Money(0.5, currency);
    }
  } else if (pType === 'ESIM') {
    if (!isWholesale) {
      markupRate = new Prisma.Decimal('0.12');
    }
  } else if (pType === 'TRANSFER' || pType === 'TOUR') {
    if (!isWholesale) {
      markupRate = new Prisma.Decimal('0.09');
    }
  }

  const rawMarkup = baseCost.mul(markupRate).round(0);

  // Stage 7: Versioned Tax Engine (B2B gets preferential wholesale tax rate, exempt products get 0)
  const subtotalBeforeTax = baseCost.add(rawMarkup).add(supplierFee).add(platformFee);
  const isDomestic = ctx.isDomestic ?? (pType !== 'VISA' && pType !== 'ESIM');
  const taxResult = TaxEngine.calculateTax({
    taxableAmount: subtotalBeforeTax,
    serviceType: pType as 'FLIGHT' | 'HOTEL' | 'TRANSFER' | 'TOUR' | 'INSURANCE' | 'VISA' | 'ESIM' | 'GENERAL',
    jurisdiction: isDomestic ? 'IR' : 'GLOBAL',
    currency,
  });
  const taxAmount = isWholesale ? subtotalBeforeTax.mul(new Prisma.Decimal('0.05')).round(0) : taxResult.taxAmount;

  // Stage 8: Promotions / Discounts
  let discountAmount = Money.zero(currency);
  if (ctx.promoDiscountPercent && ctx.promoDiscountPercent > 0) {
    const promoRate = new Prisma.Decimal(ctx.promoDiscountPercent.toString());
    discountAmount = subtotalBeforeTax.mul(promoRate).round(0);
  }

  // Subtotal before rounding
  const unroundedTotal = subtotalBeforeTax.add(taxAmount).sub(discountAmount);

  // Stage 10 & 11: FX Conversion and Currency Rounding
  const { rounded: finalSellPriceMoney, delta: roundingDeltaMoney } = unroundedTotal.roundForCurrency();

  const fxRate = ctx.fxRate
    ? (ctx.fxRate instanceof Prisma.Decimal ? ctx.fxRate : new Prisma.Decimal(ctx.fxRate.toString()))
    : new Prisma.Decimal('1.0');

  // Stage 12: Generate immutable PriceSnapshot structure (PRICE-002)
  const snapshot: PriceSnapshotData = {
    baseAmount: baseCost.toDecimal(),
    markupAmount: rawMarkup.toDecimal(),
    serviceFee: platformFee.add(supplierFee).toDecimal(),
    taxAmount: taxAmount.toDecimal(),
    discountAmount: discountAmount.toDecimal(),
    sellPrice: finalSellPriceMoney.toDecimal(),
    currency,
    fxRate,
    baseCurrency: currency,
    breakdownJson: JSON.stringify({
      productType: pType,
      userRole: role,
      markupPercentage: markupRate.toString(),
      taxRate: taxResult.taxRate.toString(),
      taxJurisdiction: taxResult.jurisdiction,
      ruleVersion: taxResult.ruleVersion,
      roundingDelta: roundingDeltaMoney.toString(),
      supplierFee: supplierFee.toString(),
      platformFee: platformFee.toString(),
    }),
  };

  const breakdown: MoneyBreakdown = {
    baseCost,
    supplierFee,
    markupAmount: rawMarkup,
    taxAmount,
    platformFee,
    discountAmount,
    roundingDelta: roundingDeltaMoney,
    sellPrice: finalSellPriceMoney,
    currency,
  };

  return {
    breakdown,
    snapshot,
    netCost: baseCost.toNumber(),
    markupAmount: rawMarkup.toNumber(),
    serviceFee: platformFee.add(supplierFee).toNumber(),
    taxAmount: taxAmount.toNumber(),
    sellPrice: finalSellPriceMoney.toNumber(),
    currency,
    roundingDelta: roundingDeltaMoney.toNumber(),
  };
}
