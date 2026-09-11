import { describe, it, expect } from 'vitest';
import {
  PersonalizationEngine,
  type UserTravelProfile,
} from './personalization';

describe('Section 26: Privacy-Preserving Personalization Layer', () => {
  const activeProfile: UserTravelProfile = {
    userId: 'usr_ali_1',
    preferredAirlines: ['W5', 'IR'],
    preferredCabin: 'economy',
    favoriteDestinations: ['IST', 'KIH'],
    privacyMode: false,
  };

  it('boosts score and provides clear explanation for preferred airline', () => {
    const res = PersonalizationEngine.evaluateAffinity(
      {
        airlineCode: 'W5',
        airlineName: 'هواپیمایی ماهان',
        cabinClass: 'economy',
      },
      activeProfile
    );

    expect(res.isPersonalized).toBe(true);
    expect(res.scoreBoost).toBeGreaterThanOrEqual(25); // 15 airline + 10 cabin
    expect(res.reason?.fa).toContain('ماهان');
  });

  it('strictly disables all personalization when privacyMode is enabled', () => {
    const privateProfile: UserTravelProfile = {
      ...activeProfile,
      privacyMode: true, // Privacy enabled by user
    };

    const res = PersonalizationEngine.evaluateAffinity(
      {
        airlineCode: 'W5',
        airlineName: 'هواپیمایی ماهان',
        cabinClass: 'economy',
      },
      privateProfile
    );

    expect(res.isPersonalized).toBe(false);
    expect(res.scoreBoost).toBe(0);
    expect(res.reason).toBeUndefined();
  });

  it('returns zero boost when item does not match any preferences', () => {
    const res = PersonalizationEngine.evaluateAffinity(
      {
        airlineCode: 'FZ', // FlyDubai
        cabinClass: 'business',
      },
      activeProfile
    );

    expect(res.isPersonalized).toBe(false);
    expect(res.scoreBoost).toBe(0);
  });
});
