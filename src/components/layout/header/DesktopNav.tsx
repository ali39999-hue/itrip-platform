'use client';

import { Link, usePathname } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import {
  Map, Compass, Newspaper, BookOpen, Wallet, CreditCard, Plane,
  BedDouble, ShieldCheck, CarTaxiFront, Train, Smartphone, Briefcase,
  FileCheck, LifeBuoy, ChevronDown
} from 'lucide-react';

export const NAV_CATEGORIES = [
  {
    key: 'explore',
    items: [
      { key: 'destinations', href: '/destinations', icon: Map },
      { key: 'tours', href: '/tours', icon: Compass },
      { key: 'travelogues', href: '/travelogues', icon: Newspaper },
      { key: 'guide', href: '/guide', icon: BookOpen },
    ],
  },
  {
    key: 'services',
    items: [
      { key: 'snapp', href: '/snapp', icon: Wallet },
      { key: 'cityPass', href: '/city-pass', icon: CreditCard },
      { key: 'flights', href: '/flights/search', icon: Plane },
      { key: 'hotels', href: '/hotels/search', icon: BedDouble },
      { key: 'visa', href: '/visa', icon: FileCheck },
      { key: 'insurance', href: '/insurance', icon: ShieldCheck },
      { key: 'transfer', href: '/transfers', icon: CarTaxiFront },
      { key: 'trains', href: '/trains', icon: Train },
      { key: 'esim', href: '/esim', icon: Smartphone },
    ],
  },
  {
    key: 'trips',
    items: [
      { key: 'myTrips', href: '/my-trips', icon: Briefcase },
      { key: 'wallet', href: '/wallet', icon: Wallet },
      { key: 'sos', href: '/interpreter', icon: LifeBuoy },
      { key: 'admin', href: '/admin', icon: ShieldCheck },
    ],
  },
];

export function DesktopNav() {
  const t = useTranslations('Nav');
  const ct = useTranslations('Common');
  const pathname = usePathname();

  const isFlights = pathname.startsWith('/flights');
  const isHotels = pathname.startsWith('/hotels');
  const isTours = pathname.startsWith('/tours');

  return (
    <nav aria-label={ct('aria.mainNavigation')} className="hidden xl:flex min-w-0 flex-1 items-center justify-center gap-0.5">
      {/* Direct High-Intent Links */}
      <Link
        href="/flights/search"
        className={`group whitespace-nowrap px-3 py-1.5 rounded-full text-[13.5px] font-bold tracking-tight transition flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
          isFlights ? 'bg-brand text-white shadow-sm' : 'text-ink/80 hover:text-brand-dark hover:bg-brand/15 dark:hover:bg-brand/25'
        }`}
      >
        <Plane size={13} className={isFlights ? 'text-white/90' : 'text-sub group-hover:text-brand-dark'} />
        <span>{t('flights')}</span>
      </Link>

      <Link
        href="/hotels/search"
        className={`group whitespace-nowrap px-3 py-1.5 rounded-full text-[13.5px] font-bold tracking-tight transition flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
          isHotels ? 'bg-brand text-white shadow-sm' : 'text-ink/80 hover:text-brand-dark hover:bg-brand/15 dark:hover:bg-brand/25'
        }`}
      >
        <BedDouble size={13} className={isHotels ? 'text-white/90' : 'text-sub group-hover:text-brand-dark'} />
        <span>{t('hotels')}</span>
      </Link>

      <Link
        href="/tours"
        className={`group whitespace-nowrap px-3 py-1.5 rounded-full text-[13.5px] font-bold tracking-tight transition flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
          isTours ? 'bg-brand text-white shadow-sm' : 'text-ink/80 hover:text-brand-dark hover:bg-brand/15 dark:hover:bg-brand/25'
        }`}
      >
        <Compass size={13} className={isTours ? 'text-white/90' : 'text-sub group-hover:text-brand-dark'} />
        <span>{t('tours')}</span>
      </Link>

      {/* Categorized Dropdowns with Hover Bridge */}
      {NAV_CATEGORIES.map((cat, idx) => {
        const isLast = idx === NAV_CATEGORIES.length - 1;
        return (
          <div key={cat.key} className="relative group">
            <button
              type="button"
              className="whitespace-nowrap px-3 py-1.5 rounded-full text-[13.5px] font-bold tracking-tight text-ink/80 hover:text-brand-dark hover:bg-brand/15 dark:hover:bg-brand/25 group-hover:bg-brand/15 dark:group-hover:bg-brand/25 group-hover:text-brand-dark transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none cursor-pointer flex items-center gap-1"
            >
              <span>{t(cat.key)}</span>
              <ChevronDown size={11} className="text-sub/70 transition-transform duration-200 group-hover:rotate-180 group-hover:text-brand-dark" aria-hidden="true" />
            </button>
            <div className={`absolute top-full ${isLast ? 'end-0' : 'start-0'} pt-2 hidden group-hover:block group-focus-within:block z-50`}>
              <div className="w-[248px] p-1.5 rounded-2xl bg-white/85 dark:bg-surface/90 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-[0_8px_32px_rgba(5,63,62,0.12),0_2px_8px_rgba(5,63,62,0.06)] animate-in fade-in slide-in-from-top-1 duration-150">
                {cat.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-bold transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                        active ? 'bg-mint text-brand-dark' : 'text-ink hover:bg-brand/15 dark:hover:bg-brand/25 hover:text-brand-dark'
                      }`}
                    >
                      <Icon size={15} className={active ? 'text-brand-dark' : 'text-sub group-hover:text-brand-dark'} />
                      <span>{t(item.key)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
