/**
 * Referral / Group Leader System Configuration
 * Centralized business parameters: no hardcoded values in business logic.
 */

export interface ReferralTier {
  minPax: number;
  maxPax: number;
  rewardPercent: number; // e.g. 0.25 for 25% refund
  labelFa: string;
  labelEn: string;
}

export interface ReferralSystemConfig {
  referralDiscountPercent: number; // e.g. 0.05 for 5% passenger discount
  discountBase: 'BASE_PRICE' | 'SUBTOTAL';
  maxDiscountCapIrr: number | null; // e.g. 50_000_000 IRR cap or null for no cap
  stackingRule: 'HIGHER_BENEFIT' | 'REFERRAL_ONLY' | 'COUPON_ONLY' | 'STACK';
  tiers: ReferralTier[];
}

export const REFERRAL_CONFIG: ReferralSystemConfig = {
  // 5% discount for passenger at registration
  referralDiscountPercent: 0.05,

  // Always calculated on BASE price, not discounted price
  discountBase: 'BASE_PRICE',

  // Maximum discount cap in IRR per booking (null = uncapped)
  maxDiscountCapIrr: 50_000_000,

  // Rule when both coupon and referral are present: pick highest customer benefit
  stackingRule: 'HIGHER_BENEFIT',

  // Post-event reward tiers for group leaders:
  // 5 - 9 pax: 25% refund of leader's trip cost
  // 10 - 14 pax: 50% refund of leader's trip cost
  // 15+ pax: 100% refund of leader's trip cost
  tiers: [
    {
      minPax: 5,
      maxPax: 9,
      rewardPercent: 0.25,
      labelFa: '۲۵٪ استرداد هزینه سفر',
      labelEn: '25% Trip Cost Refund',
    },
    {
      minPax: 10,
      maxPax: 14,
      rewardPercent: 0.50,
      labelFa: '۵۰٪ استرداد هزینه سفر',
      labelEn: '50% Trip Cost Refund',
    },
    {
      minPax: 15,
      maxPax: Infinity,
      rewardPercent: 1.00,
      labelFa: '۱۰۰٪ استرداد هزینه سفر (سفر رایگان)',
      labelEn: '100% Trip Cost Refund (Free Trip)',
    },
  ],
};
