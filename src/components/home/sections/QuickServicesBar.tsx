'use client';

import React from 'react';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import {
  Plane,
  BedDouble,
  Compass,
  TrainFront,
  BusFront,
  FileCheck2,
  ShieldCheck,
  Wifi,
  CarFront,
} from 'lucide-react';
import { lt } from '@/lib/lt';

export function QuickServicesBar() {
  const locale = useLocale();

  const services = [
    {
      id: 'flights',
      title: lt(locale, { fa: 'پرواز داخلی', en: 'Domestic Flights', ar: 'طيران داخلي', zh: '国内机票', ru: 'Внутренние рейсы' }),
      href: '/flights/search',
      icon: Plane,
      color: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25',
    },
    {
      id: 'intl-flights',
      title: lt(locale, { fa: 'پرواز خارجی', en: 'Intl Flights', ar: 'طيران دولي', zh: '国际机票', ru: 'Международные' }),
      href: '/flights/search',
      icon: Plane,
      color: 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25',
    },
    {
      id: 'hotels',
      title: lt(locale, { fa: 'هتل و اقامتگاه', en: 'Hotels', ar: 'الفنادق', zh: '酒店住宿', ru: 'Отели' }),
      href: '/hotels/search',
      icon: BedDouble,
      color: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25',
    },
    {
      id: 'tours',
      title: lt(locale, { fa: 'تور مسافرتی', en: 'Tours', ar: 'الجولات', zh: '旅游度假', ru: 'Туры' }),
      href: '/tours',
      icon: Compass,
      color: 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/25',
    },
    {
      id: 'trains',
      title: lt(locale, { fa: 'قطار', en: 'Trains', ar: 'القطارات', zh: '火车票', ru: 'Поезда' }),
      href: '/trains',
      icon: TrainFront,
      color: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25',
    },
    {
      id: 'bus',
      title: lt(locale, { fa: 'اتوبوس', en: 'Buses', ar: 'الحافلات', zh: '巴士客运', ru: 'Автобусы' }),
      href: '/trains',
      icon: BusFront,
      color: 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/25',
    },
    {
      id: 'visa',
      title: lt(locale, { fa: 'ویزای سفر', en: 'Visa', ar: 'التأشيرات', zh: '签证服务', ru: 'Визы' }),
      href: '/visa',
      icon: FileCheck2,
      color: 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25',
    },
    {
      id: 'insurance',
      title: lt(locale, { fa: 'بیمه مسافرتی', en: 'Insurance', ar: 'التأمين', zh: '旅行保险', ru: 'Страховка' }),
      href: '/insurance',
      icon: ShieldCheck,
      color: 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/25',
    },
    {
      id: 'esim',
      title: lt(locale, { fa: 'سیم‌کارت eSIM', en: 'eSIM', ar: 'eSIM', zh: 'eSIM卡', ru: 'eSIM' }),
      href: '/esim',
      icon: Wifi,
      color: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25',
    },
    {
      id: 'transfers',
      title: lt(locale, { fa: 'ترانسفر فرودگاهی', en: 'Transfers', ar: 'التوصيل', zh: '接送机', ru: 'Трансфер' }),
      href: '/transfers',
      icon: CarFront,
      color: 'bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/25',
    },
  ];

  return (
    <section aria-label="Quick Travel Services" className="w-full max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 2xl:px-8 mt-3 sm:mt-5 relative z-30">
      <div className="bg-white dark:bg-surface rounded-3xl p-4 sm:p-6 border border-slate-200/90 dark:border-line/80 shadow-[0_4px_20px_rgba(5,63,62,0.06)]">
        {/* ۴ ستون در موبایل: با ۵ ستون، لیبل‌های فارسی همیشه truncate می‌شدند.
            از sm به بالا گرید intrinsic (auto-fill) — در zoom/فونت درشت ستون‌ها
            خودشان کم می‌شوند و لیبل‌ها جا می‌گیرند (WCAG 1.4.4). */}
        <div className="grid grid-cols-4 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,8rem),1fr))] gap-2 sm:gap-4">
          {services.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className="group flex min-w-0 flex-col items-center justify-center gap-2 p-1.5 sm:p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-soft/70 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl grid place-items-center transition-all duration-300 group-hover:scale-110 ${item.color}`}
                >
                  <Icon size={24} aria-hidden="true" strokeWidth={2.2} />
                </div>
                <span className="min-w-0 text-[11px] sm:text-xs font-black text-slate-800 dark:text-ink group-hover:text-brand-dark transition-colors text-center leading-tight line-clamp-2 w-full">
                  {item.title}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
