'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { Home, Search, Briefcase, Wallet, UserRound } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useHydration } from '@/hooks/useHydration';

const ITEMS = [
  { href: '/', labelKey: 'home', icon: Home },
  { href: '/book', labelKey: 'search', icon: Search },
  { href: '/my-trips', labelKey: 'myTrips', icon: Briefcase },
  { href: '/wallet', labelKey: 'wallet', icon: Wallet },
  { href: '/account', labelKey: 'account', icon: UserRound },
] as const;

export function BottomNav() {
  const t = useTranslations('Nav');
  const pathname = usePathname();
  // Persisted store: render SSR-defaults until hydration to avoid mismatch
  const isHydrated = useHydration();
  const user = useAuthStore((s) => s.user);
  const effectiveUser = isHydrated ? user : null;
  const items = ITEMS.map((it) => {
    if (it.href === '/account' && !effectiveUser) return { ...it, href: '/auth?callbackUrl=/account' };
    if (it.href === '/my-trips' && !effectiveUser) return { ...it, href: '/auth?callbackUrl=/my-trips' };
    return it;
  });

  const isActive = (href: string) => {
    const cleanHref = href.split('?')[0];
    return cleanHref === '/' ? pathname === '/' : pathname.startsWith(cleanHref);
  };

  // Hide BottomNav during checkout, payment flows, and product detail pages
  // to avoid viewport overcrowding with sticky reservation bars (FlyToday, Booking.com, Trip.com standard)
  const isExcludedPage =
    pathname.includes('/checkout') ||
    pathname.includes('/payment-status') ||
    /^\/([a-z]{2}\/)?hotels\/[^/]+/.test(pathname) ||
    /^\/([a-z]{2}\/)?tours\/[^/]+/.test(pathname);
  if (isExcludedPage) return null;

  return (
    <nav
      aria-label={t('ariaLabel')}
      className="fixed inset-x-0 bottom-0 z-[85] lg:hidden border-t border-line/80 bg-surface/95 backdrop-blur-xl shadow-[0_-8px_30px_rgba(5,63,62,.08)] select-none"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 6px)' }}
    >
      <div className="grid grid-cols-5 h-[62px] items-center">
        {items.map((it) => {
          const active = isActive(it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={`relative h-full flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-black transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-brand ${
                active ? 'text-brand-dark' : 'text-sub hover:text-brand-dark'
              }`}
            >
              <span
                className={`grid place-items-center w-12 h-7 rounded-full transition-colors ${
                  active ? 'bg-mint text-brand-dark font-extrabold' : ''
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2.6 : 2} />
              </span>
              <span className="leading-tight truncate max-w-[64px] text-center">{t(it.labelKey)}</span>
              {active && <span className="absolute top-0 inset-x-0 mx-auto w-8 h-[3px] rounded-b-full bg-brand" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

