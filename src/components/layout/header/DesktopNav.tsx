'use client';

import { Link, usePathname } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import {
  Map, Compass, Newspaper, BookOpen, Wallet, CreditCard, Plane,
  BedDouble, ShieldCheck, CarTaxiFront, Train, Smartphone,
  FileCheck, ChevronDown, Crown, Sparkles, Languages,
} from 'lucide-react';

/** Always-visible secondary intents (D-004 / Q-003). Not repeated inside Explore. */
export const PRIMARY_NAV_LINKS = [
  { key: 'flights', href: '/flights/search', icon: Plane },
  { key: 'hotels', href: '/hotels/search', icon: BedDouble },
  { key: 'tours', href: '/tours', icon: Compass },
  { key: 'plan', href: '/plan', icon: Sparkles },
] as const;

/**
 * Traveler mega-menu. One Explore cluster — destinations + ancillaries.
 * Admin and SOS-as-interpreter stay out of customer nav (P1-010 / P1-011).
 */
export const NAV_CATEGORIES = [
  {
    key: 'explore',
    items: [
      { key: 'destinations', href: '/destinations', icon: Map },
      { key: 'travelogues', href: '/travelogues', icon: Newspaper },
      { key: 'guide', href: '/guide', icon: BookOpen },
      { key: 'visa', href: '/visa', icon: FileCheck },
      { key: 'insurance', href: '/insurance', icon: ShieldCheck },
      { key: 'transfer', href: '/transfers', icon: CarTaxiFront },
      { key: 'cip', href: '/cip', icon: Crown },
      { key: 'trains', href: '/trains', icon: Train },
      { key: 'esim', href: '/esim', icon: Smartphone },
      { key: 'cityPass', href: '/city-pass', icon: CreditCard },
      { key: 'snapp', href: '/snapp', icon: Wallet },
      { key: 'interpreter', href: '/interpreter', icon: Languages },
    ],
  },
];

export function DesktopNav() {
  const t = useTranslations('Nav');
  const ct = useTranslations('Common');
  const pathname = usePathname();

  const isExploreActive =
    pathname === '/book' ||
    pathname.startsWith('/destinations') ||
    pathname.startsWith('/travelogues') ||
    pathname.startsWith('/guide') ||
    pathname.startsWith('/visa') ||
    pathname.startsWith('/insurance') ||
    pathname.startsWith('/transfers') ||
    pathname.startsWith('/cip') ||
    pathname.startsWith('/trains') ||
    pathname.startsWith('/esim') ||
    pathname.startsWith('/city-pass') ||
    pathname.startsWith('/snapp') ||
    pathname.startsWith('/interpreter') ||
    pathname.startsWith('/services');

  return (
    <nav aria-label={ct('aria.mainNavigation')} className="hidden xl:flex min-w-0 flex-1 items-center justify-center gap-0.5">
      {PRIMARY_NAV_LINKS.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === '/plan'
            ? pathname.startsWith('/plan')
            : pathname.startsWith(`/${item.key}`);
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`group whitespace-nowrap px-3 py-1.5 rounded-full text-[13.5px] font-bold tracking-tight transition flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
              active ? 'bg-brand text-white shadow-sm' : 'text-ink/80 hover:text-brand-dark hover:bg-brand/15 dark:hover:bg-brand/25'
            }`}
          >
            <Icon size={13} className={active ? 'text-white/90' : 'text-sub group-hover:text-brand-dark'} />
            <span>{t(item.key)}</span>
          </Link>
        );
      })}

      {NAV_CATEGORIES.map((cat) => (
        <div key={cat.key} className="relative group">
          <Link
            href="/book"
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[13.5px] font-bold tracking-tight transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none cursor-pointer flex items-center gap-1 ${
              isExploreActive
                ? 'bg-brand text-white shadow-sm'
                : 'text-ink/80 hover:text-brand-dark hover:bg-brand/15 dark:hover:bg-brand/25 group-hover:bg-brand/15 dark:group-hover:bg-brand/25 group-hover:text-brand-dark'
            }`}
          >
            <span>{t(cat.key)}</span>
            <ChevronDown
              size={11}
              className={`transition-transform duration-200 group-hover:rotate-180 ${
                isExploreActive ? 'text-white/90' : 'text-sub/70 group-hover:text-brand-dark'
              }`}
              aria-hidden="true"
            />
          </Link>
          <div className="absolute top-full start-0 pt-2 hidden group-hover:block group-focus-within:block z-50">
            <div className="w-[248px] max-h-[min(70vh,28rem)] overflow-y-auto p-1.5 rounded-2xl bg-white/85 dark:bg-surface/90 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-[0_8px_32px_rgba(5,63,62,0.12),0_2px_8px_rgba(5,63,62,0.06)] animate-in fade-in slide-in-from-top-1 duration-150">
              {cat.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`group/item flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-bold transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none min-h-11 ${
                      active ? 'bg-mint text-brand-dark' : 'text-ink hover:bg-brand/15 dark:hover:bg-brand/25 hover:text-brand-dark'
                    }`}
                  >
                    <Icon size={15} className={active ? 'text-brand-dark' : 'text-sub group-hover/item:text-brand-dark'} />
                    <span>{t(item.key)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </nav>
  );
}
