export type PricingContext = {
  userRole: string; // CUSTOMER, AGENT, B2B_TIER_1
  supplierId: string;
  productType: string;
  basePrice: number;
  currency: string;
};

export type PricingResult = {
  netCost: number;
  markupAmount: number;
  serviceFee: number;
  sellPrice: number;
  currency: string;
};

// V1 Simple Rule Engine for Markup & Fees
export function calculatePricing(ctx: PricingContext): PricingResult {
  const { userRole, productType, basePrice, currency } = ctx;

  let markupPercent = 0.10; // Default 10% platform markup
  let serviceFee = 0;

  // Role-based rules
  if (userRole === 'AGENT' || userRole === 'B2B') {
    markupPercent = 0.04; // 4% markup for B2B
  }

  // Product-based rules
  if (productType === 'FLIGHT') {
    if (userRole === 'CUSTOMER') {
      markupPercent = 0.06; // 6% on flights for normal users
      serviceFee = currency === 'IRR' ? 500000 : 1; // 50,000 Toman flat fee
    }
  }

  if (productType === 'VISA' || productType === 'INSURANCE') {
    markupPercent = 0.15; // Higher margin on ancillary services
  }

  const markupAmount = basePrice * markupPercent;
  const sellPrice = basePrice + markupAmount + serviceFee;

  return {
    netCost: basePrice,
    markupAmount,
    serviceFee,
    sellPrice,
    currency
  };
}