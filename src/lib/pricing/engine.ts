export type PricingContext = {
  userRole: string; // CUSTOMER, AGENT, B2B_TIER_1, SUPER_ADMIN
  supplierId?: string;
  productType: string;
  basePrice: number;
  currency: string;
  isDomestic?: boolean;
};

export type PricingResult = {
  netCost: number;
  markupAmount: number;
  serviceFee: number;
  taxAmount: number;
  sellPrice: number;
  currency: string;
  roundingDelta: number;
};

/**
 * Currency rounding policy:
 * - IRR: Round to nearest 1,000 Tomans (10,000 Rials)
 * - USD/USDT/AED: Round to 2 decimal places
 */
export function roundCurrency(amount: number, currency: string): { rounded: number; delta: number } {
  if (currency === 'IRR') {
    // 10,000 Rial increments
    const rounded = Math.round(amount / 10000) * 10000;
    return { rounded, delta: rounded - amount };
  }
  const rounded = Math.round(amount * 100) / 100;
  return { rounded, delta: rounded - amount };
}

/**
 * Enterprise Rule Engine for Markup, Tax & Fees
 */
export function calculatePricing(ctx: PricingContext): PricingResult {
  const { userRole, productType, basePrice, currency, isDomestic } = ctx;

  let markupPercent = 0.08; // Default 8% platform markup
  let serviceFee = 0;
  let taxRate = 0.09; // Default 9% VAT/Tax where applicable

  // 1. Role-based pricing rules
  if (userRole === 'AGENT' || userRole === 'B2B' || userRole === 'B2B_TIER_1') {
    markupPercent = 0.035; // 3.5% wholesale markup
    taxRate = 0.05;
  } else if (userRole === 'VIP' || userRole === 'GOLD_CUSTOMER') {
    markupPercent = 0.05;
  }

  // 2. Product-specific pricing policies
  if (productType === 'FLIGHT') {
    if (userRole === 'CUSTOMER') {
      markupPercent = 0.05;
      serviceFee = currency === 'IRR' ? 400000 : 1;
    }
  } else if (productType === 'HOTEL') {
    markupPercent = 0.10;
  } else if (productType === 'VISA' || productType === 'INSURANCE') {
    markupPercent = 0.14;
    serviceFee = currency === 'IRR' ? 250000 : 0.5;
  } else if (productType === 'ESIM') {
    markupPercent = 0.12;
  } else if (productType === 'TRANSFER' || productType === 'TOUR') {
    markupPercent = 0.09;
  }

  // Exempt international travel items or specific categories from domestic VAT
  if (!isDomestic && (productType === 'VISA' || productType === 'ESIM')) {
    taxRate = 0.0;
  }

  const rawMarkup = basePrice * markupPercent;
  const rawTax = (basePrice + rawMarkup) * taxRate;
  const unroundedSellPrice = basePrice + rawMarkup + serviceFee + rawTax;

  const { rounded: finalSellPrice, delta: roundingDelta } = roundCurrency(unroundedSellPrice, currency);

  return {
    netCost: Math.round(basePrice),
    markupAmount: Math.round(rawMarkup),
    serviceFee: Math.round(serviceFee),
    taxAmount: Math.round(rawTax),
    sellPrice: finalSellPrice,
    currency,
    roundingDelta,
  };
}