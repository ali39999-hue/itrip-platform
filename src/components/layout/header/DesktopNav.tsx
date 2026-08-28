'use client';

import { Link, usePathname } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import {
  Map, Compass, FileText, Wallet, CreditCard, Plane,
  BedDouble, ShieldCheck, CarTaxiFront, Train, Smartphone, Briefcase
} from 'lucide-react';

export const NAV_CATEGORIES = [
  {
    key: 'explore',
    items: [
      { key: 'destinations', href: '/destinations', icon: Map },
      { key: 'tours', href: '/tours', icon: Compass },
      { key: 'travelogues', href: '/travelogues', icon: FileText },
      { key: 'guide', href: '/guide', icon: FileText },
    ],
  },
  {
    key: 'services',
    items: [
      { key: 'snapp', href: '/snapp', icon: Wallet },
      { key: 'cityPass', href: '/city-pass', icon: CreditCard },
      { key: 'flights', href: '/flights/search', icon: Plane },
      { key: 'hotels', href: '/hotels/search', icon: BedDouble },
      { key: 'visa', href: '/visa', icon: FileText },
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
      { key: 'sos', href: '/interpreter', icon: Smartphone },
    ],
  },
];

export function DesktopNav() {
  const t = useTranslations('Nav');
  const pathname = usePathname();

  return (
    <nav aria-label="ناوبری اصلی" className="hidden lg:flex items-center gap-1">
      {NAV_CATEGORIES.map((cat) => (
        <div key={cat.key} className="relative group">
          <button
            type="button"
            className="px-3.5 py-2 rounded-full text-[13.5px] font-bold text-ink hover:text-brand-dark hover:bg-soft transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            {t(cat.key)}
          </button>
          <div className="absolute top-[calc(100%+4px)] start-0 hidden group-hover:block group-focus-within:block z-50 w-60 p-2 rounded-2xl bg-surface border border-line shadow-elev-3 animate-in fade-in slide-in-from-top-1 duration-200">
            {cat.items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-bold transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
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
      ))}
    </nav>
  );
}
