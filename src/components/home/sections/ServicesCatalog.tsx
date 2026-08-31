'use client';

import { Link } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { useCountryStore } from '@/stores/country-store';
import { countryName } from '@/lib/countries';
import {
  Plane, BedDouble, Compass, CarTaxiFront, TrainFront, Wifi, Languages,
  type LucideIcon,
} from 'lucide-react';

interface ServiceCardData {
  href: string;
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  tag?: string;
  accent?: string;
}

import { lt } from '@/lib/lt';
export function ServicesCatalog() {
  const locale = useLocale();
  const t = useTranslations('Home');
  const { country } = useCountryStore();

  const coreServices: ServiceCardData[] = [
    { href: '/flights/search', icon: Plane, titleKey: 'srvFlights', descKey: 'srvFlightsDesc', tag: lt(locale, { fa: 'پروازهای چارتری و سیستمی', en: 'Charter & Scheduled Flights', ar: 'رحلات طيران عارضة ومنتظمة', zh: '包机和定期航班', ru: 'Чартерные и регулярные рейсы' }) },
    { href: '/hotels/search', icon: BedDouble, titleKey: 'srvHotels', descKey: 'srvHotelsDesc', tag: lt(locale, { fa: 'تضمین کمترین قیمت', en: 'Best Price Guarantee', ar: 'ضمان أقل سعر', zh: '最低价格保证', ru: 'Гарантия лучшей цены' }) },
    { href: '/tours', icon: Compass, titleKey: 'srvTours', descKey: 'srvToursDesc', tag: lt(locale, { fa: 'گشت‌های اختصاصی', en: 'Exclusive Tours', ar: 'جولات خاصة', zh: '独家旅游', ru: 'Эксклюзивные туры' }) },
    { href: '/transfers', icon: CarTaxiFront, titleKey: 'srvTransfers', descKey: 'srvTransfersDesc' },
    { href: '/trains', icon: TrainFront, titleKey: 'srvTrains', descKey: 'srvTrainsDesc' },
    { href: '/esim', icon: Wifi, titleKey: 'srvEsim', descKey: 'srvEsimDesc', tag: lt(locale, { fa: 'فعال‌سازی آنی', en: 'Instant Activation', ar: 'تفعيل فوري', zh: '即时激活', ru: 'Мгновенная активация' }) },
    { href: '/interpreter', icon: Languages, titleKey: 'srvInterpreter', descKey: 'srvInterpreterDesc' },
  ];

  return (
    <section className="w-full py-12 md:py-16 px-4 md:px-10">
      <div className="max-w-[1280px] mx-auto flex flex-col gap-8">
        <div>
          <p className="mb-2 text-brand-dark font-black tracking-wide text-xs">{t('servicesKicker')}</p>
          <h2 className="text-2xl md:text-[32px] font-black text-ink m-0 tracking-tight">
            {t('servicesTitle', { country: countryName(country, locale) })}
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {coreServices.map((srv) => {
            const Icon = srv.icon;
            return (
              <Link
                key={srv.href}
                href={srv.href}
                className="p-5 rounded-2xl bg-surface border border-line hover:border-brand/50 hover:shadow-elev-2 transition-all flex flex-col justify-between gap-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-mint text-brand-dark grid place-items-center mb-3 group-hover:scale-110 transition-transform">
                    <Icon size={24} />
                  </div>
                  <h3 className="text-base font-bold text-ink mb-1 group-hover:text-brand-dark transition-colors">
                    {t(srv.titleKey)}
                  </h3>
                  <p className="text-xs text-sub leading-relaxed line-clamp-2">
                    {t(srv.descKey)}
                  </p>
                </div>
                {srv.tag && (
                  <span className="self-start px-2.5 py-0.5 rounded-full bg-soft text-brand-dark text-[11px] font-bold">
                    {srv.tag}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

