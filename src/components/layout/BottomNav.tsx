'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { Home, Map, Wallet, UserRound, Briefcase } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useHydration } from '@/hooks/useHydration';

const ITEMS = [
  { href: '/', labelKey: 'home' },
  { href: '/book', labelKey: 'book' },
  { href: '/destinations', labelKey: 'places' },
  { href: '/wallet', labelKey: 'wallet' },
  { href: '/account', labelKey: 'account' },
] as const;

export function BottomNav() {
  const t = useTranslations('Nav');
  const pathname = usePathname();
  // Persisted store: render SSR-defaults until hydration to avoid mismatch
  const isHydrated = useHydration();
  const user = useAuthStore((s) => s.user);
  const effectiveUser = isHydrated ? user : null;
  const items = ITEMS.map((it) =>
    it.href === '/account' && !effectiveUser ? { ...it, href: '/auth' } : it,
  );

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

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
      className="fixed inset-x-0 bottom-0 z-[85] lg:hidden border-t border-line bg-surface/95 backdrop-blur-xl shadow-[0_-8px_28px_rgba(5,63,62,.10)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-5">
        {items.map((it) => {
          const active = isActive(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={`relative min-h-[58px] flex flex-col items-center justify-center gap-1 text-[10.5px] font-black transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-brand ${
                active ? 'text-brand-dark' : 'text-sub hover:text-brand-dark'
              }`}
            >
              <span
                className={`grid place-items-center w-11 h-7 rounded-full transition-colors ${
                  active ? 'bg-mint' : ''
                }`}
              >
                {it.href === '/' && <Home size={18} />}
                {it.href === '/book' && <Briefcase size={18} />}
                {it.href === '/destinations' && <Map size={18} />}
                {it.href === '/wallet' && <Wallet size={18} />}
                {it.href === '/account' && <UserRound size={18} />}
                {it.href === '/auth' && <UserRound size={18} />}
              </span>
              <span>{t(it.labelKey)}</span>
              {active && <span className="absolute top-0 inset-x-0 mx-auto w-8 h-[3px] rounded-b-full bg-brand" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

