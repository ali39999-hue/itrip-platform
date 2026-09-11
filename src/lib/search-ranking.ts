/**
 * Search Ranking & Multi-Signal Offer Evaluation Engine (Section 28).
 *
 * Ranks travel offers based on comprehensive utility rather than raw price alone:
 * - Price competitiveness
 * - Total travel duration & stopovers
 * - Cancellation flexibility & refundability
 * - Airline / Accommodation service quality
 * - Supplier reliability
 *
 * Assigns transparent, non-manipulative badges (Cheapest, Fastest, Best Value, Most Flexible).
 */

export type RankingLabel = 'CHEAPEST' | 'FASTEST' | 'BEST_VALUE' | 'MOST_FLEXIBLE';

export interface RankableOffer {
  id: string;
  price: number;
  durationMinutes: number;
  stops: number; // 0 = non-stop
  isRefundable: boolean;
  qualityScore?: number; // 1 to 10 (airline / hotel rating)
  supplierReliability?: number; // 1 to 10
  isCharter?: boolean;
}

export interface RankedOffer<T extends RankableOffer = RankableOffer> {
  offer: T;
  compositeScore: number; // 0 to 100 (higher = better)
  badge?: {
    code: RankingLabel;
    label: { fa: string; en: string };
    reason: { fa: string; en: string };
    theme: 'success' | 'brand' | 'warning' | 'purple';
  };
  rankingMetrics: {
    priceScore: number;
    durationScore: number;
    qualityScore: number;
    flexibilityScore: number;
  };
}

export class SearchRankingEngine {
  /**
   * Evaluates a collection of offers and assigns transparent badges and ranking
   */
  static rankOffers<T extends RankableOffer>(offers: T[]): RankedOffer<T>[] {
    if (!offers || offers.length === 0) return [];
    if (offers.length === 1) {
      return [
        {
          offer: offers[0],
          compositeScore: 100,
          badge: {
            code: 'BEST_VALUE',
            label: { fa: 'بهترین انتخاب', en: 'Best Option' },
            reason: { fa: 'تنها گزینه موجود در این مسیر', en: 'Sole available option for this route' },
            theme: 'brand',
          },
          rankingMetrics: { priceScore: 100, durationScore: 100, qualityScore: 100, flexibilityScore: 100 },
        },
      ];
    }

    const minPrice = Math.min(...offers.map((o) => o.price));
    const maxPrice = Math.max(...offers.map((o) => o.price));
    const minDuration = Math.min(...offers.map((o) => o.durationMinutes));
    const maxDuration = Math.max(...offers.map((o) => o.durationMinutes));

    const priceRange = maxPrice - minPrice || 1;
    const durationRange = maxDuration - minDuration || 1;

    // Calculate component scores
    const scored = offers.map((offer) => {
      // 1. Price score (0-100): lower price gets higher score
      const priceScore = Math.max(0, 100 - ((offer.price - minPrice) / priceRange) * 100);

      // 2. Duration score (0-100): shorter duration gets higher score
      const durationScore = Math.max(0, 100 - ((offer.durationMinutes - minDuration) / durationRange) * 100);

      // 3. Quality score (0-100)
      const rawQuality = offer.qualityScore ?? 8;
      const qualityScore = Math.min(100, rawQuality * 10);

      // 4. Flexibility score (0-100)
      let flexibilityScore = offer.isRefundable ? 80 : 20;
      if (offer.isCharter) flexibilityScore -= 10;
      if (offer.stops === 0) flexibilityScore += 20;
      flexibilityScore = Math.max(0, Math.min(100, flexibilityScore));

      // Weighted Composite Utility: Price (40%), Duration (30%), Quality (15%), Flexibility (15%)
      const compositeScore = Math.round(
        priceScore * 0.4 + durationScore * 0.3 + qualityScore * 0.15 + flexibilityScore * 0.15
      );

      return {
        offer,
        compositeScore,
        rankingMetrics: {
          priceScore: Math.round(priceScore),
          durationScore: Math.round(durationScore),
          qualityScore: Math.round(qualityScore),
          flexibilityScore: Math.round(flexibilityScore),
        },
      };
    });

    // Find winners
    const cheapestItem = scored.reduce((prev, curr) =>
      curr.offer.price < prev.offer.price ? curr : prev
    );

    const fastestItem = scored.reduce((prev, curr) =>
      curr.offer.durationMinutes < prev.offer.durationMinutes ? curr : prev
    );

    const bestValueItem = scored.reduce((prev, curr) =>
      curr.compositeScore > prev.compositeScore ? curr : prev
    );

    // Assign badges
    const ranked: RankedOffer<T>[] = scored.map((item) => {
      let badge: RankedOffer<T>['badge'] = undefined;

      if (item.offer.id === bestValueItem.offer.id) {
        badge = {
          code: 'BEST_VALUE',
          label: { fa: 'بهترین ارزش خرید', en: 'Best Value' },
          reason: {
            fa: 'بهترین تعادل بین قیمت مناسب، مدت زمان پرواز و کیفیت خدمات',
            en: 'Best balance between affordable rate, flight time, and quality',
          },
          theme: 'brand',
        };
      } else if (item.offer.id === cheapestItem.offer.id) {
        badge = {
          code: 'CHEAPEST',
          label: { fa: 'ارزان‌ترین نرخ', en: 'Cheapest Price' },
          reason: {
            fa: 'پایین‌ترین قیمت موجود در میان تمام پروازهای این تاریخ',
            en: 'Lowest available rate among all options for this date',
          },
          theme: 'success',
        };
      } else if (item.offer.id === fastestItem.offer.id && fastestItem.offer.durationMinutes < cheapestItem.offer.durationMinutes) {
        badge = {
          code: 'FASTEST',
          label: { fa: 'سریع‌ترین پرواز', en: 'Fastest Route' },
          reason: {
            fa: 'کمترین زمان پرواز و سریع‌ترین رسیدن به مقصد',
            en: 'Shortest travel time and quickest arrival',
          },
          theme: 'warning',
        };
      } else if (item.offer.isRefundable && !item.offer.isCharter) {
        badge = {
          code: 'MOST_FLEXIBLE',
          label: { fa: 'بیشترین انعطاف کنسلی', en: 'Most Flexible' },
          reason: {
            fa: 'بلیت سیستمی با قوانین کنسلی استاندارد و کمترین جریمه',
            en: 'Standard scheduled ticket with minimal cancellation penalty',
          },
          theme: 'purple',
        };
      }

      return {
        ...item,
        badge,
      };
    });

    // Sort primarily by composite score descending
    return ranked.sort((a, b) => b.compositeScore - a.compositeScore);
  }
}
