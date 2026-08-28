'use client';

import { useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { Home, Map, Wallet, UserRound, Briefcase } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

const ITEMS = [
  { href: '/', fa: 'خانه', en: 'Home', ar: 'الرئيسية' },
  { href: '/book', fa: 'رزرو', en: 'Book', ar: 'الحجز' },
  { href: '/destinations', fa: 'مقصدها', en: 'Places', ar: 'الوجهات' },
  { href: '/wallet', fa: 'کیف پول', en: 'Wallet', ar: 'المحفظة' },
  { href: '/account', fa: 'حساب', en: 'Account', ar: 'الحساب' },
] as const;

export function BottomNav() {
  const locale = useLocale();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const items = ITEMS.map((it) =>
    it.href === '/account' && !user ? { ...it, href: '/auth' } : it,
  );
  const labelOf = (it: (typeof items)[number]) => (locale === 'en' ? it.en : locale === 'ar' ? it.ar : it.fa);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <nav
      aria-label="ناوبری موبایل"
      className="fixed inset-x-0 bottom-0 z-85 md:hidden border-t border-line bg-surface/95 backdrop-blur-xl shadow-[0_-8px_28px_rgba(5,63,62,.10)]"
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
              className={`relative min-h-[58px] flex flex-col items-center justify-center gap-1 text-[10px] font-extrabold transition focus-visible:ring-2 focus-visible:ring-brand ${
                active ? 'text-brand-dark' : 'text-sub hover:text-brand-dark'
              }`}
            >
              <span
                className={`grid place-items-center w-11 h-7 rounded-full transition ${
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
              {labelOf(it)}
              {active && <span className="absolute top-0 inset-x-6 h-[3px] rounded-b-full bg-brand" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

