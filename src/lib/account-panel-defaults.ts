import type { AccountSidebarOverride, SupportPageOverride } from '@/domains/content/SiteContentService';

/**
 * Default shared constants for the customer panel & support page.
 * Kept in a dedicated library file (outside `use server`) so they can be
 * imported by client components without violating Next.js server actions rules.
 */

export const DEFAULT_ACCOUNT_SIDEBAR: AccountSidebarOverride = {
  links: [
    { href: '/account', label: { fa: 'داشبورد و پروفایل', en: 'Dashboard & Profile' }, icon: 'LayoutGrid' },
    { href: '/account/travelers', label: { fa: 'مسافران و همراهان', en: 'Travelers & Companions' }, icon: 'Users' },
    { href: '/my-trips', label: { fa: 'سفرهای من', en: 'My Trips' }, icon: 'PlaneTakeoff' },
    { href: '/wallet', label: { fa: 'کیف پول و امتیازات', en: 'Wallet & Rewards' }, icon: 'Gift' },
    { href: '/account/auto-buy', label: { fa: 'خرید خودکار (ربات سفر)', en: 'Auto-Buy (Smart Bot)' }, icon: 'Bot' },
    { href: '/account/organization', label: { fa: 'سازمان و سفرهای شرکتی (B2B)', en: 'Corporate & B2B Hub' }, icon: 'Building' },
  ],
  badgeText: { fa: 'مسافر فیروزو', en: 'Firuzo Traveler' },
};

export const DEFAULT_SUPPORT_PAGE: SupportPageOverride = {
  phone: '+982191000000',
  phoneDisplay: { fa: '۹۱۰۰۰۰۰۰۰۰ ۲۱+', en: '+98 21 9100 0000' },
  email: 'support@firuzo.com',
  telegram: 'firuzo_support',
};

export interface LoyaltyPanelView {
  enabled: boolean;
  totalCoins: number;
  currentStreak: number;
  claimedToday: boolean;
  tierKey: string;
  tierIndex: number;
  progress: number;
  coinsToNext: number;
  nextTierKey: string | null;
  /** Optional CMS perk line override (raw locale pair). */
  perkText?: { fa: string; en: string; ar?: string; zh?: string; ru?: string } | null;
}
