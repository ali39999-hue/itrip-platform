'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { lt } from '@/lib/lt';
import { getAccountPanelConfigAction } from '@/actions/account-panel';
import { DEFAULT_ACCOUNT_SIDEBAR } from '@/lib/account-panel-defaults';
import { LOYALTY_TIERS } from '@/lib/loyalty-tiers';
import type { AccountSidebarOverride } from '@/domains/content/SiteContentService';
import {
  LayoutGrid,
  PlaneTakeoff,
  Gift,
  LogOut,
  ShieldCheck,
  Star,
  UserRound,
  Bot,
  Users,
  Building,
} from 'lucide-react';

const ICONS: Record<string, typeof LayoutGrid> = {
  LayoutGrid,
  Users,
  PlaneTakeoff,
  Gift,
  Bot,
  Building,
  Star,
};

const SECTION_HREFS: Record<string, string[]> = {
  dashboard: ['/account'],
  profile: ['/account'],
  trips: ['/my-trips'],
  wallet: ['/wallet'],
  autobuy: ['/account/auto-buy'],
  travelers: ['/account/travelers'],
  organization: ['/account/organization'],
};

interface AccountSidebarProps {
  activeSection?: 'dashboard' | 'trips' | 'wallet' | 'profile' | 'autobuy' | 'travelers' | 'organization';
}

/**
 * Data-driven customer panel navigation (پنل مشتری داینامیک). Renders the
 * shipped defaults instantly, then swaps in the CMS override from
 * `account.sidebar` (SiteContent) once the server action resolves.
 */
export function AccountSidebar({ activeSection = 'trips' }: AccountSidebarProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname() || '';
  const t = useTranslations('MyTrips');
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [nav, setNav] = useState<AccountSidebarOverride>(DEFAULT_ACCOUNT_SIDEBAR);
  const [loyalty, setLoyalty] = useState<Awaited<ReturnType<typeof getAccountPanelConfigAction>>['loyalty'] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAccountPanelConfigAction()
      .then((res) => {
        if (cancelled) return;
        setNav(res.sidebar);
        setLoyalty(res.loyalty);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const userFullName = locale === 'fa'
    ? `${user?.firstNameFa || ''} ${user?.lastNameFa || ''}`.trim()
    : `${user?.firstNameEn || user?.firstNameFa || ''} ${user?.lastNameEn || user?.lastNameFa || ''}`.trim();

  const userName = user
    ? userFullName || user.phone
    : lt(locale, {
        fa: 'کاربر فیروزو',
        en: 'Firuzo Traveler',
        ar: 'مسافر فيروزو',
        zh: 'Firuzo 旅客',
        ru: 'Путешественник Firuzo',
      });

  const initials = (user?.firstNameFa?.[0] || user?.firstNameEn?.[0] || 'ف').toUpperCase();

  const activeHrefs = SECTION_HREFS[activeSection] || [];
  const isActive = (href: string) => activeHrefs.includes(href) || (href !== '/account' && pathname.startsWith(href));

  const tier = loyalty ? LOYALTY_TIERS[Math.max(0, loyalty.tierIndex)] : null;
  const tierLabel = tier
    ? lt(locale, { fa: tier.fa, en: tier.en, ar: tier.ar, zh: tier.zh, ru: tier.ru })
    : lt(locale, { fa: 'مسافر فیروزو', en: 'Firuzo Traveler', ar: 'مسافر فيروزو', zh: 'Firuzo 旅客', ru: 'Путешественник Firuzo' });

  const pointsLabel =
    nav.pointsLabel && locale in nav.pointsLabel
      ? lt(locale, nav.pointsLabel)
      : lt(locale, {
          fa: 'امتیاز باشگاه مشتریان',
          en: 'Reward Points',
          ar: 'نقطة مكافآت',
          zh: '奖励积分',
          ru: 'баллов лояльности',
        });

  return (
    <aside className="lg:w-72 flex flex-col gap-2 bg-surface shadow-xs rounded-3xl h-fit lg:sticky top-24 shrink-0 border border-line overflow-hidden">
      <div className="p-6 border-b border-line flex flex-col items-center text-center bg-gradient-to-b from-mint/30 to-transparent">
        {/* Dynamic Initials Avatar */}
        <div className="w-18 h-18 rounded-full mb-3 shadow-sm border-2 border-brand/20 bg-gradient-to-br from-brand to-brand-dark text-surface flex items-center justify-center text-xl font-black">
          {userFullName ? initials : <UserRound size={26} />}
        </div>
        <h2 className="text-[17px] font-black text-ink mb-1">{userName}</h2>

        {/* Loyalty Tier Badge — driven by the server-authoritative coin balance */}
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gold-soft border border-action/20 text-price text-[11px] font-black">
          <Star size={12} className="fill-action text-action" />
          <span>{tierLabel}</span>
        </div>

        <p className="font-bold text-[11.5px] text-sub mt-2 num">
          {(loyalty?.totalCoins ?? 0).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}{' '}
          {pointsLabel}
        </p>
      </div>

      <nav className="flex flex-col gap-1.5 p-3" aria-label={lt(locale, { fa: 'منوی حساب کاربری', en: 'Account menu', ar: 'قائمة الحساب', zh: '账户菜单', ru: 'Меню аккаунта' })}>
        {nav.links.map((link) => {
          const Icon = ICONS[link.icon || 'LayoutGrid'] || LayoutGrid;
          const label =
            link.href === '/my-trips'
              ? t('title')
              : lt(locale, { fa: link.label.fa, en: link.label.en, ar: link.label.ar, zh: link.label.zh, ru: link.label.ru });
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 font-bold text-[13.5px] rounded-2xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                active
                  ? 'bg-brand text-surface font-black shadow-xs'
                  : 'text-sub hover:bg-soft hover:text-ink'
              }`}
            >
              <Icon size={17} />
              <span>{label}</span>
            </Link>
          );
        })}

        {['admin', 'SUPER_ADMIN', 'OPS', 'FINANCE', 'OPERATOR'].includes(user?.role || '') && (
          <Link
            href="/admin"
            className="flex items-center gap-3 px-4 py-3 font-bold text-[13.5px] rounded-2xl text-brand-dark bg-mint border border-brand/20 hover:bg-mint/80 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <ShieldCheck size={17} />
            {lt(locale, { fa: 'سامانه مدیریت (ERP)', en: 'Admin ERP Panel', ar: 'لوحة الإدارة', zh: '管理后台', ru: 'Панель администратора' })}
          </Link>
        )}
      </nav>

      <div className="p-3 mt-auto border-t border-line/60">
        <button
          onClick={() => {
            logout();
            router.push('/');
          }}
          className="w-full flex items-center justify-center gap-2 text-rose-warm hover:bg-rose-warm/10 px-4 py-2.5 rounded-2xl transition-colors font-bold text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <LogOut size={16} />
          {lt(locale, { fa: 'خروج از حساب', en: 'Sign Out', ar: 'تسجيل الخروج', zh: '退出登录', ru: 'Выйти' })}
        </button>
      </div>
    </aside>
  );
}
