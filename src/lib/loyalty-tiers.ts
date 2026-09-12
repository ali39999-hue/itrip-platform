/**
 * Customer loyalty tiers (باشگاه مشتریان) — single shared source of truth for
 * the account panel, sidebar badge and ERP Customer 360. Coins come from the
 * server-authoritative LoyaltyStreakService; tiers are a pure function of coins.
 */

export interface LoyaltyTier {
  key: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  minCoins: number;
  fa: string;
  en: string;
  ar: string;
  zh: string;
  ru: string;
}

export const LOYALTY_TIERS: readonly LoyaltyTier[] = [
  { key: 'BRONZE', minCoins: 0, fa: 'مسافر برنزی', en: 'Bronze Traveler', ar: 'مسافر برونزي', zh: '青铜旅客', ru: 'Бронзовый путешественник' },
  { key: 'SILVER', minCoins: 150, fa: 'مسافر نقره‌ای', en: 'Silver Traveler', ar: 'مسافر فضي', zh: '白银旅客', ru: 'Серебряный путешественник' },
  { key: 'GOLD', minCoins: 400, fa: 'مسافر طلایی', en: 'Gold Traveler', ar: 'مسافر ذهبي', zh: '黄金旅客', ru: 'Золотой путешественник' },
  { key: 'PLATINUM', minCoins: 1000, fa: 'مسافر پلاتینیوم', en: 'Platinum Traveler', ar: 'مسافر بلاتيني', zh: '铂金旅客', ru: 'Платиновый путешественник' },
] as const;

export interface LoyaltyTierView {
  tier: LoyaltyTier;
  nextTier: LoyaltyTier | null;
  /** 0..1 progress from the current tier threshold to the next one. */
  progress: number;
  coinsToNext: number;
}

export function getLoyaltyTierView(totalCoins: number): LoyaltyTierView {
  const coins = Math.max(0, Math.floor(totalCoins || 0));
  let tier = LOYALTY_TIERS[0];
  for (const t of LOYALTY_TIERS) {
    if (coins >= t.minCoins) tier = t;
  }
  const nextTier = LOYALTY_TIERS.find((t) => t.minCoins > tier.minCoins) ?? null;
  if (!nextTier) {
    return { tier, nextTier: null, progress: 1, coinsToNext: 0 };
  }
  const span = nextTier.minCoins - tier.minCoins;
  const progress = Math.min(1, Math.max(0, (coins - tier.minCoins) / span));
  return { tier, nextTier, progress, coinsToNext: nextTier.minCoins - coins };
}
