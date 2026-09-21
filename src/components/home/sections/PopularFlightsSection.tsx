'use client';

import React from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { ArrowLeft, Clock } from 'lucide-react';
import { lt } from '@/lib/lt';
import { formatMoney } from '@/lib/money';
import { shimmerDataUrl } from '@/lib/image-utils';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES, countryName } from '@/lib/countries';
import type { PopularRouteOverride } from '@/domains/content/SiteContentService';
import {
  DEFAULT_POPULAR_ROUTES,
  POPULAR_ROUTES_BY_COUNTRY,
} from './popular-routes-data';

export { DEFAULT_POPULAR_ROUTES, POPULAR_ROUTES_BY_COUNTRY };

export function PopularFlightsSection({ override }: { override?: PopularRouteOverride[] }) {
  const locale = useLocale();
  const { country } = useCountryStore();

  const countryRoutes = POPULAR_ROUTES_BY_COUNTRY[country] || DEFAULT_POPULAR_ROUTES;
  const routes = (country !== 'iran' && POPULAR_ROUTES_BY_COUNTRY[country]) ? countryRoutes : (override ?? countryRoutes);

  return (
    <section aria-label="Popular Flight Routes" className="w-full max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 2xl:px-8">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-black text-brand-dark tracking-wider uppercase">
              {lt(locale, { fa: 'مسیرهای پرتردد سفر', en: 'Trending Flight Routes', ar: 'المسارات الشائعة', zh: '热门航线', ru: 'Популярные маршруты' })}
            </span>
            <span className="text-xs font-black text-brand-dark bg-mint px-2 py-0.5 rounded-full flex items-center gap-1">
              <span>{COUNTRIES[country]?.flag}</span>
              <span>{countryName(country, locale)}</span>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-ink m-0">
            {lt(locale, {
              fa: `پرفروش‌ترین پروازهای ${countryName(country, locale)} و مقاصد برگزیده`,
              en: `Best-Selling Flights for ${countryName(country, locale)}`,
              ar: `أكثر الرحلات مبيعاً لـ ${countryName(country, locale)}`,
              zh: `${countryName(country, locale)} 热门畅销航线`,
              ru: `Популярные рейсы: ${countryName(country, locale)}`,
            })}
          </h2>
        </div>

        <Link
          href={`/flights/search?country=${country}`}
          className="text-xs font-black text-brand-dark hover:text-brand flex items-center gap-1.5 transition-colors shrink-0"
        >
          <span>{lt(locale, { fa: 'مشاهده همه پروازها', en: 'View All Flights', ar: 'عرض جميع الرحلات', zh: '查看全部航班', ru: 'Все рейсы' })}</span>
          <ArrowLeft size={14} className="ltr:rotate-180" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {routes.map((r, idx) => (
          <Link
            key={idx}
            href={`/flights/search?from=${encodeURIComponent(locale === 'fa' ? r.fromFa : r.fromEn)}&to=${encodeURIComponent(locale === 'fa' ? r.toFa : r.toEn)}&country=${country}`}
            className="group relative rounded-2xl p-4 bg-surface border border-line hover:border-brand/50 hover:shadow-elev-2 transition-all flex flex-wrap items-center justify-between gap-3 overflow-hidden shadow-2xs cursor-pointer active:scale-[0.99]"
          >
            {/* City photo thumbnail */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 bg-soft">
              <Image
                src={r.img}
                alt={`${r.fromFa} to ${r.toFa}`}
                fill
                sizes="80px"
                placeholder="blur"
                blurDataURL={shimmerDataUrl(80, 80)}
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Flight info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1 leading-tight">
                <span className="text-sm sm:text-base font-black text-ink group-hover:text-brand-dark transition-colors">
                  {locale === 'fa' ? r.fromFa : r.fromEn}
                </span>
                <span className="text-brand-dark font-black inline-block rtl:rotate-180">➔</span>
                <span className="text-sm sm:text-base font-black text-ink group-hover:text-brand-dark transition-colors">
                  {locale === 'fa' ? r.toFa : r.toEn}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-sub flex-wrap">
                <span className="text-brand-dark font-extrabold">{locale === 'fa' ? r.airlineFa : r.airlineEn}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-sub" />
                  <span>{locale === 'fa' ? r.duration : (r.durationEn || r.duration)}</span>
                </span>
              </div>
            </div>

            {/* Price badge */}
            <div className="text-end shrink-0 ps-2">
              <span className="text-[10px] text-sub font-bold block mb-0.5">
                {lt(locale, { fa: 'شروع از', en: 'from', ar: 'من', zh: '起', ru: 'от' })}
              </span>
              <span className="text-sm sm:text-base font-black text-price font-price num whitespace-nowrap">
                {formatMoney(r.price, COUNTRIES[country]?.currency || 'IRR', locale)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
