/**
 * Privacy-Preserving Personalization Layer (Section 26).
 *
 * Adapts search rankings and recommendations based on explicit traveler preferences:
 * - Preferred airlines and cabin classes
 * - Travel party type (solo, couple, family, group)
 * - Budget style (budget, balanced, luxury)
 *
 * Rules:
 * 1. NO opaque or creepy tracking: preferences are either explicit or derived from confirmed bookings.
 * 2. Strict user control: if `privacyMode` is enabled, personalization is 100% disabled.
 * 3. Every personalized recommendation MUST provide an understandable, transparent explanation.
 */

export interface UserTravelProfile {
  userId?: string;
  preferredAirlines?: string[]; // e.g. ['W5', 'IR', 'TK']
  preferredCabin?: 'economy' | 'business';
  budgetPreference?: 'economy' | 'balanced' | 'luxury';
  defaultParty?: 'solo' | 'couple' | 'family' | 'friends';
  favoriteDestinations?: string[]; // e.g. ['IST', 'DXB', 'KIH']
  privacyMode: boolean; // if true, zero personalization is computed
}

export interface PersonalizationAdjustment {
  scoreBoost: number; // -30 to +30
  reason?: { fa: string; en: string };
  isPersonalized: boolean;
}

export class PersonalizationEngine {
  /**
   * Computes personalized affinity score boost with an explainable reason
   */
  static evaluateAffinity(
    item: {
      airlineCode?: string;
      airlineName?: string;
      cabinClass?: string;
      destination?: string;
      price?: number;
    },
    profile?: UserTravelProfile | null
  ): PersonalizationAdjustment {
    if (!profile || profile.privacyMode) {
      return { scoreBoost: 0, isPersonalized: false };
    }

    let boost = 0;
    const reasons: { fa: string[]; en: string[] } = { fa: [], en: [] };

    // 1. Preferred Airline Match
    if (
      item.airlineCode &&
      profile.preferredAirlines &&
      profile.preferredAirlines.includes(item.airlineCode)
    ) {
      boost += 15;
      reasons.fa.push(`ایرلاین منتخب شما (${item.airlineName || item.airlineCode})`);
      reasons.en.push(`Your preferred airline (${item.airlineName || item.airlineCode})`);
    }

    // 2. Preferred Cabin Class Match
    if (
      item.cabinClass &&
      profile.preferredCabin &&
      item.cabinClass.toLowerCase() === profile.preferredCabin.toLowerCase()
    ) {
      boost += 10;
      reasons.fa.push('کلاس پروازی دلخواه شما');
      reasons.en.push('Your preferred cabin class');
    }

    // 3. Frequent Destination Match
    if (
      item.destination &&
      profile.favoriteDestinations &&
      profile.favoriteDestinations.includes(item.destination)
    ) {
      boost += 8;
      reasons.fa.push('مقصد پرتکرار در سفرهای شما');
      reasons.en.push('Frequent destination in your travels');
    }

    // Cap total boost
    const finalBoost = Math.min(30, Math.max(-30, boost));

    if (finalBoost > 0) {
      return {
        scoreBoost: finalBoost,
        isPersonalized: true,
        reason: {
          fa: reasons.fa.join(' • '),
          en: reasons.en.join(' • '),
        },
      };
    }

    return { scoreBoost: 0, isPersonalized: false };
  }
}
