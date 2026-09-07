'use client';

import React from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { ArrowLeft, Clock } from 'lucide-react';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';
import { shimmerDataUrl } from '@/lib/image-utils';

export function PopularFlightsSection() {
  const locale = useLocale();

  const routes = [
    {
      fromFa: 'تهران',
      fromEn: 'Tehran',
      toFa: 'مشهد',
      toEn: 'Mashhad',
      airlineFa: 'ایران ایر',
      duration: '۱.۵ ساعت',
      durationEn: '1h 30m',
      price: 24800000,
      img: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'تهران',
      fromEn: 'Tehran',
      toFa: 'استانبول',
      toEn: 'Istanbul',
      airlineFa: 'ترکیش ایرلاینز',
      duration: '۳.۵ ساعت',
      durationEn: '3h 50m',
      price: 96000000,
      img: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'تهران',
      fromEn: 'Tehran',
      toFa: 'دبی',
      toEn: 'Dubai',
      airlineFa: 'امارات',
      duration: '۲.۵ ساعت',
      durationEn: '2h 25m',
      price: 128000000,
      img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'تهران',
      fromEn: 'Tehran',
      toFa: 'کیش',
      toEn: 'Kish',
      airlineFa: 'کیش ایر',
      duration: '۱.۸ ساعت',
      durationEn: '1h 45m',
      price: 28500000,
      img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'شیراز',
      fromEn: 'Shiraz',
      toFa: 'تهران',
      toEn: 'Tehran',
      airlineFa: 'ماهان',
      duration: '۱.۳ ساعت',
      durationEn: '1h 20m',
      price: 26000000,
      img: 'https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?auto=format&fit=crop&q=75&w=600',
    },
    {
      fromFa: 'تهران',
      fromEn: 'Tehran',
      toFa: 'تفلیس',
      toEn: 'Tbilisi',
      airlineFa: 'ماهان',
      duration: '۲.۶ ساعت',
      durationEn: '2h 40m',
      price: 84500000,
      img: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&q=75&w=600',
    },
  ];

  return (
    <section aria-label="Popular Flight Routes" className="w-full max-w-[1280px] mx-auto px-4 md:px-8">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-black text-brand-dark tracking-wider uppercase block mb-1.5">
            {lt(locale, { fa: 'مسیرهای پرتردد سفر', en: 'Trending Flight Routes', ar: 'المسارات الشائعة', zh: '热门航线', ru: 'Популярные маршруты' })}
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-ink m-0">
            {lt(locale, {
              fa: 'پرفروش‌ترین پروازهای داخلی و خارجی',
              en: 'Best-Selling Domestic & International Flights',
              ar: 'أكثر الرحلات الجوية مبيعاً',
              zh: '最畅销国内与国际航班',
              ru: 'Самые популярные рейсы',
            })}
          </h2>
        </div>

        <Link
          href="/flights/search"
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
            href={`/flights/search?from=${encodeURIComponent(locale === 'fa' ? r.fromFa : r.fromEn)}&to=${encodeURIComponent(locale === 'fa' ? r.toFa : r.toEn)}`}
            className="group relative rounded-2xl p-4 bg-surface border border-line hover:border-brand/50 hover:shadow-elev-2 transition-all flex items-center justify-between gap-3 overflow-hidden shadow-2xs cursor-pointer active:scale-[0.99]"
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
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm sm:text-base font-black text-ink group-hover:text-brand-dark transition-colors">
                  {locale === 'fa' ? r.fromFa : r.fromEn}
                </span>
                <span className="text-brand-dark font-black">➔</span>
                <span className="text-sm sm:text-base font-black text-ink group-hover:text-brand-dark transition-colors">
                  {locale === 'fa' ? r.toFa : r.toEn}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-sub font-bold">
                <Clock size={12} className="text-brand-dark shrink-0" aria-hidden="true" />
                <span>{locale === 'fa' ? r.duration : r.durationEn}</span>
                <span>•</span>
                <span className="truncate">{r.airlineFa}</span>
              </div>
            </div>

            {/* Price & Action */}
            <div className="text-end shrink-0 ps-2 border-s border-line/60">
              <span className="text-[10px] text-sub font-bold block leading-none mb-1">
                {lt(locale, { fa: 'شروع نرخ از:', en: 'Starting from:', ar: 'يبدأ من:', zh: '起价：', ru: 'От:' })}
              </span>
              <div className="text-sm sm:text-base font-black text-brand-dark font-mono num leading-tight">
                {num(r.price, locale)}
              </div>
              <span className="text-[10px] font-bold text-sub block mt-0.5">
                {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томан' })}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
