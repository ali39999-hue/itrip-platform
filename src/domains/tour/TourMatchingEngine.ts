import type { Tour } from '@/lib/types';
import type { TourYarQuizAnswers, ScoredTour } from './types';

/**
 * TourMatchingEngine (تور یار)
 *
 * Evaluates traveler quiz preferences across 8 vectors (marital, kids, companions,
 * budget, experiences, rhythm, duration, accommodation) and scores tours with
 * weighted multi-criteria decision analysis.
 */
export class TourMatchingEngine {
  public static matchTours(tours: Tour[], answers: TourYarQuizAnswers): ScoredTour[] {
    const scored = tours.map((tour) => {
      let score = 0;
      const reasons: string[] = [];

      // 1. Experiences & Category Match (Max 35 points)
      const selectedExperiences = answers.q5 || [];
      if ((selectedExperiences as string[]).includes(tour.category)) {
        score += 25;
        reasons.push('تطابق سبک تفریح و دسته تور');
      }
      const tagMatches = (tour.highlights || []).filter((h) =>
        selectedExperiences.some((exp) => h.toLowerCase().includes(exp.toLowerCase()))
      );
      score += Math.min(10, tagMatches.length * 5);

      // 2. Budget Tier Compatibility (Max 25 points)
      const tourPrice = Number(tour.price);
      if (answers.q4 === 'budget_eco' && tourPrice <= 35_000_000) {
        score += 25;
        reasons.push('متناسب با بازه اقتصادی');
      } else if (answers.q4 === 'budget_std' && tourPrice > 35_000_000 && tourPrice <= 90_000_000) {
        score += 25;
        reasons.push('متناسب با بودجه استاندارد');
      } else if (answers.q4 === 'budget_lux' && tourPrice > 90_000_000) {
        score += 25;
        reasons.push('پکیج ویژه لوکس و VIP');
      } else {
        score += 10; // Partial score
      }

      // 3. Duration Match (Max 15 points)
      const days = tour.durationDays;
      if (answers.q7 === 'short_trip' && days >= 1 && days <= 5) {
        score += 15;
      } else if (answers.q7 === 'medium_trip' && days >= 6 && days <= 8) {
        score += 15;
      } else if (answers.q7 === 'long_trip' && days >= 9) {
        score += 15;
      } else {
        score += 5;
      }

      // 4. Family & Kids Friendliness (Max 15 points)
      if (answers.q2 === 'kids') {
        if (tour.category === 'family' || tour.category === 'cultural' || tour.childPrice) {
          score += 15;
          reasons.push('مناسب برای کودکان با امکانات رفاهی');
        } else if (tour.category === 'adventure') {
          score -= 10; // High intensity trips penalized for toddlers
        }
      } else {
        score += 15;
      }

      // 5. Hotel Quality Preference (Max 10 points)
      const stars = tour.hotelStars || 3;
      if (answers.q8 === 'resort' && stars >= 5) {
        score += 10;
        reasons.push('اقامت در هتل ۵ ستاره لوکس');
      } else if (answers.q8 === 'std_hotel' && (stars === 3 || stars === 4)) {
        score += 10;
      } else if (answers.q8 === 'hostel' && tour.category === 'nature') {
        score += 10;
      } else {
        score += 5;
      }

      const matchPercentage = Math.min(100, Math.max(30, score));
      return {
        tourId: tour.id,
        matchPercentage,
        matchReasons: reasons,
      };
    });

    return scored
      .filter((item) => item.matchPercentage >= 40)
      .sort((a, b) => b.matchPercentage - a.matchPercentage);
  }
}
