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

/**
 * Per-referral-code custom configuration stored in ReferralCode.customTierConfig.
 * Undefined values inherit global REFERRAL_CONFIG defaults.
 */
export interface PerCodeConfig {
  discountPercent?: number; // e.g. 0.05 for 5% off
  maxDiscountCapIrr?: number | null; // Max cap in IRR, null = uncapped
  maxUses?: number | null; // Max allowed uses/bookings, null = unlimited
  tiers?: Array<{ minPax: number; maxPax: number | null; rewardPercent: number }>;
}

/**
 * Named tier presets for the admin UI. `maxPax: null` = open-ended top tier
 * (JSON-safe; the resolver maps it back to Infinity for display).
 */
export interface TierPreset {
  key: string;
  labelFa: string;
  labelEn: string;
  tiers: Array<{ minPax: number; maxPax: number | null; rewardPercent: number }>;
}

export const TIER_PRESETS: TierPreset[] = [
  {
    key: 'standard',
    labelFa: 'استاندارد (۵ / ۱۰ / ۱۵ نفر → ۲۵٪ / ۵۰٪ / ۱۰۰٪)',
    labelEn: 'Standard (5 / 10 / 15 pax → 25% / 50% / 100%)',
    tiers: [
      { minPax: 5, maxPax: 9, rewardPercent: 0.25 },
      { minPax: 10, maxPax: 14, rewardPercent: 0.5 },
      { minPax: 15, maxPax: null, rewardPercent: 1 },
    ],
  },
  {
    key: 'starter',
    labelFa: 'تشویقی شروع (۳ / ۷ / ۱۲ نفر → ۲۵٪ / ۵۰٪ / ۱۰۰٪)',
    labelEn: 'Starter (3 / 7 / 12 pax → 25% / 50% / 100%)',
    tiers: [
      { minPax: 3, maxPax: 6, rewardPercent: 0.25 },
      { minPax: 7, maxPax: 11, rewardPercent: 0.5 },
      { minPax: 12, maxPax: null, rewardPercent: 1 },
    ],
  },
  {
    key: 'vip',
    labelFa: 'ویژه (۲ / ۵ نفر → ۵۰٪ / ۱۰۰٪)',
    labelEn: 'VIP (2 / 5 pax → 50% / 100%)',
    tiers: [
      { minPax: 2, maxPax: 4, rewardPercent: 0.5 },
      { minPax: 5, maxPax: null, rewardPercent: 1 },
    ],
  },
];

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
