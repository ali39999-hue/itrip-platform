/**
 * Experimentation & Feature Flag Engine (Section 43).
 *
 * Provides deterministic, privacy-safe A/B testing and controlled feature rollout.
 * Ensures consistent user bucketing without storing tracking cookies.
 */

export type FeatureFlagKey =
  | 'NEW_HOME'
  | 'NEW_SEARCH'
  | 'MOBILE_HOME_V2'
  | 'PLANNER_V2'
  | 'WALLET_V2'
  | 'LOYALTY_V2';

export interface FeatureFlagConfig {
  key: FeatureFlagKey;
  description: string;
  defaultEnabled: boolean;
  rolloutPercentage: number; // 0 to 100
  allowedRoles?: string[]; // e.g. ['ADMIN', 'SUPER_ADMIN']
}

export const FEATURE_FLAGS: Record<FeatureFlagKey, FeatureFlagConfig> = {
  NEW_HOME: {
    key: 'NEW_HOME',
    description: 'Modern unified super-app discovery homepage',
    defaultEnabled: true,
    rolloutPercentage: 100,
  },
  NEW_SEARCH: {
    key: 'NEW_SEARCH',
    description: 'Search 2.0 with instant autocomplete and airport disambiguation',
    defaultEnabled: true,
    rolloutPercentage: 100,
  },
  MOBILE_HOME_V2: {
    key: 'MOBILE_HOME_V2',
    description: 'Mobile thumb-zone optimized compact homepage',
    defaultEnabled: true,
    rolloutPercentage: 100,
  },
  PLANNER_V2: {
    key: 'PLANNER_V2',
    description: 'Smart Planner 2.0 with natural language prompt input',
    defaultEnabled: true,
    rolloutPercentage: 100,
  },
  WALLET_V2: {
    key: 'WALLET_V2',
    description: 'Two-wallet architecture: financial ledger vs offline travel documents',
    defaultEnabled: true,
    rolloutPercentage: 100,
  },
  LOYALTY_V2: {
    key: 'LOYALTY_V2',
    description: 'Gamified travel streaks and leader referral tiers',
    defaultEnabled: true,
    rolloutPercentage: 100,
  },
};

/**
 * Deterministic hash (FNV-1a 32-bit) for consistent user bucketing (0-99)
 */
export function hashUserBucket(identifier: string): number {
  let hash = 2166136261;
  for (let i = 0; i < identifier.length; i++) {
    hash ^= identifier.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) % 100;
}

export interface EvaluationContext {
  userId?: string;
  userRole?: string;
  overrides?: Record<string, boolean>;
  isDev?: boolean;
}

export class FeatureFlagService {
  /**
   * Evaluates whether a feature flag is enabled for a specific user / request
   */
  static isEnabled(key: FeatureFlagKey, ctx?: EvaluationContext): boolean {
    const config = FEATURE_FLAGS[key];
    if (!config) return false;

    // 1. Explicit override check (e.g. from query param or session override)
    if (ctx?.overrides && typeof ctx.overrides[key] === 'boolean') {
      return ctx.overrides[key];
    }

    // 2. Role-based bypass (e.g. Admins always see beta features)
    if (ctx?.userRole && config.allowedRoles?.includes(ctx.userRole)) {
      return true;
    }

    // 3. Rollout percentage check
    if (config.rolloutPercentage >= 100) return true;
    if (config.rolloutPercentage <= 0) return false;

    // 4. Deterministic bucketing by userId
    if (ctx?.userId) {
      const bucket = hashUserBucket(`${ctx.userId}:${key}`);
      return bucket < config.rolloutPercentage;
    }

    // Fallback to default
    return config.defaultEnabled;
  }

  /**
   * Parses query params like `?ff_PLANNER_V2=true` or `?ff_NEW_HOME=false`
   */
  static parseOverridesFromQuery(searchParams: URLSearchParams | Record<string, string | string[] | undefined>): Record<string, boolean> {
    const overrides: Record<string, boolean> = {};

    if (searchParams instanceof URLSearchParams) {
      searchParams.forEach((val, key) => {
        if (key.startsWith('ff_')) {
          const flagKey = key.slice(3);
          overrides[flagKey] = val === 'true' || val === '1';
        }
      });
    } else {
      Object.entries(searchParams).forEach(([key, val]) => {
        if (key.startsWith('ff_')) {
          const flagKey = key.slice(3);
          const strVal = Array.isArray(val) ? val[0] : val;
          overrides[flagKey] = strVal === 'true' || strVal === '1';
        }
      });
    }

    return overrides;
  }
}
