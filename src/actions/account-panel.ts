'use server';

import { safeAuth } from '@/auth';
import {
  SiteContentService,
  AccountSidebarOverride,
  AccountHeroOverride,
  AccountLoyaltyOverride,
  SupportPageOverride,
} from '@/domains/content/SiteContentService';
import { LoyaltyStreakService } from '@/domains/loyalty/LoyaltyStreakService';
import { getLoyaltyTierView, LOYALTY_TIERS } from '@/lib/loyalty-tiers';
import {
  DEFAULT_ACCOUNT_SIDEBAR,
  DEFAULT_SUPPORT_PAGE,
  type LoyaltyPanelView,
} from '@/lib/account-panel-defaults';

export type { LoyaltyPanelView };

/**
 * Customer panel dynamic configuration (پنل مشتری داینامیک).
 * Reads from SiteContent keys with graceful fallback to shipped defaults.
 */
export async function getAccountPanelConfigAction() {
  const [sidebar, hero, loyaltyCms] = await Promise.all([
    SiteContentService.get<AccountSidebarOverride>('account.sidebar'),
    SiteContentService.get<AccountHeroOverride>('account.hero'),
    SiteContentService.get<AccountLoyaltyOverride>('account.loyalty'),
  ]);

  const session = await safeAuth().catch(() => null);
  const userId = session?.user?.id;

  let loyalty: LoyaltyPanelView = {
    enabled: loyaltyCms ? loyaltyCms.enabled : true,
    totalCoins: 0,
    currentStreak: 0,
    claimedToday: false,
    tierKey: LOYALTY_TIERS[0].key,
    tierIndex: 0,
    progress: 0,
    coinsToNext: LOYALTY_TIERS[1].minCoins,
    nextTierKey: LOYALTY_TIERS[1].key,
    perkText: loyaltyCms?.perkText ?? null,
  };

  if (userId) {
    try {
      const status = LoyaltyStreakService.getStreakStatus(userId);
      const view = getLoyaltyTierView(status.totalCoins);
      loyalty = {
        enabled: loyaltyCms ? loyaltyCms.enabled : true,
        totalCoins: status.totalCoins,
        currentStreak: status.currentStreak,
        claimedToday: status.claimedToday,
        tierKey: view.tier.key,
        tierIndex: LOYALTY_TIERS.findIndex((t) => t.key === view.tier.key),
        progress: view.progress,
        coinsToNext: view.coinsToNext,
        nextTierKey: view.nextTier?.key ?? null,
        perkText: loyaltyCms?.perkText ?? null,
      };
    } catch (err) {
      console.warn('[account-panel] loyalty status unavailable:', err);
    }
  }

  return {
    success: true as const,
    sidebar: sidebar ?? DEFAULT_ACCOUNT_SIDEBAR,
    hero: hero ?? null,
    loyalty,
  };
}

/** Public support-page content (contact channels + optional FAQ override). */
export async function getSupportPageConfigAction() {
  const support = await SiteContentService.get<SupportPageOverride>('support.page');
  return { success: true as const, support: support ?? DEFAULT_SUPPORT_PAGE };
}
