import { lt } from './lt';

export type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'VIP';

export interface LoyaltyTierConfig {
  currentTier: LoyaltyTier;
  nextTier: LoyaltyTier | null;
  currentTierLabel: string;
  nextTierLabel: string;
  pointsToNextTier: number;
  progressPercent: number;
  minPoints: number;
  targetPoints: number;
}

export function getLoyaltyConfig(points: number = 0, locale: string): LoyaltyTierConfig {
  if (points >= 5000) {
    return {
      currentTier: 'VIP',
      nextTier: null,
      currentTierLabel: getLoyaltyTierLabel('VIP', locale),
      nextTierLabel: '',
      pointsToNextTier: 0,
      progressPercent: 100,
      minPoints: 5000,
      targetPoints: 5000,
    };
  }

  if (points >= 2500) {
    const min = 2500;
    const target = 5000;
    const progress = Math.min(100, Math.max(0, Math.round(((points - min) / (target - min)) * 100)));
    return {
      currentTier: 'PLATINUM',
      nextTier: 'VIP',
      currentTierLabel: getLoyaltyTierLabel('PLATINUM', locale),
      nextTierLabel: getLoyaltyTierLabel('VIP', locale),
      pointsToNextTier: target - points,
      progressPercent: progress,
      minPoints: min,
      targetPoints: target,
    };
  }

  if (points >= 1000) {
    const min = 1000;
    const target = 2500;
    const progress = Math.min(100, Math.max(0, Math.round(((points - min) / (target - min)) * 100)));
    return {
      currentTier: 'GOLD',
      nextTier: 'PLATINUM',
      currentTierLabel: getLoyaltyTierLabel('GOLD', locale),
      nextTierLabel: getLoyaltyTierLabel('PLATINUM', locale),
      pointsToNextTier: target - points,
      progressPercent: progress,
      minPoints: min,
      targetPoints: target,
    };
  }

  if (points >= 200) {
    const min = 200;
    const target = 1000;
    const progress = Math.min(100, Math.max(0, Math.round(((points - min) / (target - min)) * 100)));
    return {
      currentTier: 'SILVER',
      nextTier: 'GOLD',
      currentTierLabel: getLoyaltyTierLabel('SILVER', locale),
      nextTierLabel: getLoyaltyTierLabel('GOLD', locale),
      pointsToNextTier: target - points,
      progressPercent: progress,
      minPoints: min,
      targetPoints: target,
    };
  }

  // BRONZE (مسافر عادی) 0 - 199 points
  const min = 0;
  const target = 200;
  const progress = Math.min(100, Math.max(0, Math.round((points / target) * 100)));
  return {
    currentTier: 'BRONZE',
    nextTier: 'SILVER',
    currentTierLabel: getLoyaltyTierLabel('BRONZE', locale),
    nextTierLabel: getLoyaltyTierLabel('SILVER', locale),
    pointsToNextTier: target - points,
    progressPercent: progress,
    minPoints: min,
    targetPoints: target,
  };
}

/**
 * Returns localized display label for a loyalty tier.
 * Default 'BRONZE' tier represents a standard traveler ('مسافر عادی').
 */
export function getLoyaltyTierLabel(tier: string | undefined | null, locale: string): string {
  switch (tier) {
    case 'VIP':
      return lt(locale, {
        fa: 'مسافر ویژه (VIP)',
        en: 'VIP Traveler',
        ar: 'مسافر VIP',
        zh: '贵宾旅客 (VIP)',
        ru: 'VIP путешественник',
      });
    case 'PLATINUM':
      return lt(locale, {
        fa: 'مسافر پلاتینیوم',
        en: 'Platinum Traveler',
        ar: 'مسافر بلاتيني',
        zh: '白金旅客',
        ru: 'Платиновый уровень',
      });
    case 'GOLD':
      return lt(locale, {
        fa: 'مسافر طلایی فیروزو',
        en: 'Gold Traveler',
        ar: 'مسافر ذهبي',
        zh: '黄金旅客',
        ru: 'Золотой уровень',
      });
    case 'SILVER':
      return lt(locale, {
        fa: 'مسافر نقره‌ای',
        en: 'Silver Traveler',
        ar: 'مسافر فضي',
        zh: '白银旅客',
        ru: 'Серебряный уровень',
      });
    case 'BRONZE':
    default:
      return lt(locale, {
        fa: 'مسافر عادی',
        en: 'Standard Traveler',
        ar: 'مسافر عادي',
        zh: '普通旅客',
        ru: 'Обычный путешественник',
      });
  }
}
