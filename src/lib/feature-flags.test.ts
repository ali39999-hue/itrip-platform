import { describe, it, expect } from 'vitest';
import {
  FeatureFlagService,
  hashUserBucket,
  FEATURE_FLAGS,
} from './feature-flags';

describe('Section 43: Feature Flags & Controlled Rollout Engine', () => {
  it('consistently produces deterministic buckets between 0 and 99', () => {
    const bucket1 = hashUserBucket('usr_test_123:PLANNER_V2');
    const bucket2 = hashUserBucket('usr_test_123:PLANNER_V2');
    expect(bucket1).toBe(bucket2);
    expect(bucket1).toBeGreaterThanOrEqual(0);
    expect(bucket1).toBeLessThan(100);

    const bucketDiff = hashUserBucket('usr_test_999:PLANNER_V2');
    expect(bucketDiff).toBeGreaterThanOrEqual(0);
  });

  it('enables flags with 100% rollout by default', () => {
    expect(FeatureFlagService.isEnabled('NEW_HOME')).toBe(true);
    expect(FeatureFlagService.isEnabled('PLANNER_V2')).toBe(true);
    expect(FeatureFlagService.isEnabled('WALLET_V2')).toBe(true);
  });

  it('respects explicit query parameter overrides', () => {
    const params = new URLSearchParams('ff_PLANNER_V2=false&ff_NEW_SEARCH=true');
    const overrides = FeatureFlagService.parseOverridesFromQuery(params);

    expect(overrides['PLANNER_V2']).toBe(false);
    expect(overrides['NEW_SEARCH']).toBe(true);

    const isPlannerEnabled = FeatureFlagService.isEnabled('PLANNER_V2', {
      overrides,
    });
    expect(isPlannerEnabled).toBe(false);
  });

  it('bypasses rollout restrictions for users with authorized role', () => {
    // Mock a flag with 0% rollout
    FEATURE_FLAGS['MOBILE_HOME_V2'].rolloutPercentage = 0;
    FEATURE_FLAGS['MOBILE_HOME_V2'].allowedRoles = ['SUPER_ADMIN', 'ADMIN'];

    // Normal customer: disabled
    expect(
      FeatureFlagService.isEnabled('MOBILE_HOME_V2', { userRole: 'CUSTOMER' })
    ).toBe(false);

    // Admin: enabled
    expect(
      FeatureFlagService.isEnabled('MOBILE_HOME_V2', { userRole: 'ADMIN' })
    ).toBe(true);

    // Reset back to 100
    FEATURE_FLAGS['MOBILE_HOME_V2'].rolloutPercentage = 100;
  });
});
