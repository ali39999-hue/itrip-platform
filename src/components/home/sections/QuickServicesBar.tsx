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
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300 group-hover:bg-blue-600 group-hover:text-surface',
    },
    {
      id: 'intl-flights',
      title: lt(locale, { fa: 'پرواز خارجی', en: 'Intl Flights', ar: 'طيران دولي', zh: '国际机票', ru: 'Международные' }),
      href: '/flights/search',
      icon: Plane,
      color: 'bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300 group-hover:bg-sky-600 group-hover:text-surface',
    },
    {
      id: 'hotels',
      title: lt(locale, { fa: 'هتل و اقامتگاه', en: 'Hotels', ar: 'الفنادق', zh: '酒店住宿', ru: 'Отели' }),
      href: '/hotels/search',
      icon: BedDouble,
      color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300 group-hover:bg-amber-600 group-hover:text-surface',
    },
    {
      id: 'tours',
      title: lt(locale, { fa: 'تور مسافرتی', en: 'Tours', ar: 'الجولات', zh: '旅游度假', ru: 'Туры' }),
      href: '/tours',
      icon: Compass,
      color: 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300 group-hover:bg-purple-600 group-hover:text-surface',
    },
    {
      id: 'trains',
      title: lt(locale, { fa: 'قطار', en: 'Trains', ar: 'القطارات', zh: '火车票', ru: 'Поезда' }),
      href: '/trains',
      icon: TrainFront,
      color: 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300 group-hover:bg-orange-600 group-hover:text-surface',
    },
    {
      id: 'bus',
      title: lt(locale, { fa: 'اتوبوس', en: 'Buses', ar: 'الحافلات', zh: '巴士客运', ru: 'Автобусы' }),
      href: '/trains',
      icon: BusFront,
      color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300 group-hover:bg-emerald-600 group-hover:text-surface',
    },
    {
      id: 'visa',
      title: lt(locale, { fa: 'ویزای سفر', en: 'Visa', ar: 'التأشيرات', zh: '签证服务', ru: 'Визы' }),
      href: '/visa',
      icon: FileCheck2,
      color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300 group-hover:bg-indigo-600 group-hover:text-surface',
    },
    {
      id: 'insurance',
      title: lt(locale, { fa: 'بیمه سامان', en: 'Insurance', ar: 'التأمين', zh: '旅行保险', ru: 'Страховка' }),
      href: '/insurance',
      icon: ShieldCheck,
      color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 group-hover:bg-teal-600 group-hover:text-surface',
    },
    {
      id: 'esim',
      title: lt(locale, { fa: 'سیم‌کارت eSIM', en: 'eSIM', ar: 'eSIM', zh: 'eSIM卡', ru: 'eSIM' }),
      href: '/esim',
      icon: Wifi,
      color: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-300 group-hover:bg-cyan-600 group-hover:text-surface',
    },
    {
      id: 'transfers',
      title: lt(locale, { fa: 'ترانسفر', en: 'Transfers', ar: 'التوصيل', zh: '接送机', ru: 'Трансфер' }),
      href: '/transfers',
      icon: CarFront,
      color: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300 group-hover:bg-rose-600 group-hover:text-surface',
    },
  ];

  return (
    <section aria-label="Quick Travel Services" className="w-full max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 2xl:px-8 mt-3 sm:mt-5 relative z-30">
      <div className="bg-surface rounded-3xl p-4 sm:p-6 border border-line/80 shadow-elev-2">
        <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-10 gap-2 sm:gap-4">
          {services.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className="group flex flex-col items-center justify-center gap-2 p-2 rounded-2xl hover:bg-soft/70 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl grid place-items-center transition-all duration-300 shadow-2xs group-hover:shadow-sm group-hover:scale-105 ${item.color}`}
                >
                  <Icon size={22} aria-hidden="true" />
                </div>
                <span className="text-[11.5px] sm:text-xs font-black text-ink group-hover:text-brand-dark transition-colors text-center leading-tight truncate w-full">
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
