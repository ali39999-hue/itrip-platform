'use client';

import { Link, usePathname } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import {
  Map, Compass, Newspaper, BookOpen, Wallet, CreditCard, Plane,
  BedDouble, ShieldCheck, CarTaxiFront, Train, Smartphone, Briefcase,
  FileCheck, LifeBuoy
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
    <nav aria-label={ct('aria.mainNavigation')} className="hidden lg:flex items-center gap-1">
      {/* Direct High-Intent Links (OTA Gold Standard) */}
      <Link
        href="/flights/search"
        className={`px-3 py-2 rounded-full text-[13.5px] font-bold transition flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
          isFlights ? 'bg-mint text-brand-dark font-black' : 'text-ink hover:text-brand-dark hover:bg-soft'
        }`}
      >
        <Plane size={15} className={isFlights ? 'text-brand-dark' : 'text-sub'} />
        <span>{t('flights')}</span>
      </Link>

      <Link
        href="/hotels/search"
        className={`px-3 py-2 rounded-full text-[13.5px] font-bold transition flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
          isHotels ? 'bg-mint text-brand-dark font-black' : 'text-ink hover:text-brand-dark hover:bg-soft'
        }`}
      >
        <BedDouble size={15} className={isHotels ? 'text-brand-dark' : 'text-sub'} />
        <span>{t('hotels')}</span>
      </Link>

      <Link
        href="/tours"
        className={`px-3 py-2 rounded-full text-[13.5px] font-bold transition flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
          isTours ? 'bg-mint text-brand-dark font-black' : 'text-ink hover:text-brand-dark hover:bg-soft'
        }`}
      >
        <Compass size={15} className={isTours ? 'text-brand-dark' : 'text-sub'} />
        <span>{t('tours')}</span>
      </Link>

      {/* Categorized Dropdowns with Hover Bridge (No Dropouts) */}
      {NAV_CATEGORIES.map((cat) => (
        <div key={cat.key} className="relative group">
          <button
            type="button"
            className="px-3 py-2 rounded-full text-[13.5px] font-bold text-ink hover:text-brand-dark hover:bg-soft transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none cursor-pointer"
          >
            {t(cat.key)}
          </button>
          <div className="absolute top-full start-0 pt-1.5 hidden group-hover:block group-focus-within:block z-50">
            <div className="w-60 p-2 rounded-2xl bg-surface border border-line shadow-elev-3 animate-in fade-in slide-in-from-top-1 duration-150">
              {cat.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-bold transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                      active ? 'bg-mint text-brand-dark' : 'text-ink hover:bg-soft'
                    }`}
                  >
                    <Icon size={16} className={active ? 'text-brand-dark' : 'text-sub'} />
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
