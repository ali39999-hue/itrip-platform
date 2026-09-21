'use client';

import React from 'react';
import { Link } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import {
  Plane,
  BedDouble,
  Compass,
  FileCheck2,
  ShieldCheck,
  CarFront,
  Crown,
  LayoutGrid,
} from 'lucide-react';
import { lt } from '@/lib/lt';

const ICON_TONE = 'bg-mint text-brand-dark shadow-sm group-hover:bg-brand group-hover:text-surface';

export function QuickServicesBar() {
  const locale = useLocale();
  const t = useTranslations('Book');

  const services = [
    {
      id: 'flights',
      title: lt(locale, { fa: 'پرواز', en: 'Flights', ar: 'طيران', zh: '机票', ru: 'Авиа' }),
      href: '/flights/search',
      icon: Plane,
    },
    {
      id: 'hotels',
      title: lt(locale, { fa: 'هتل', en: 'Hotels', ar: 'فنادق', zh: '酒店', ru: 'Отели' }),
      href: '/hotels/search',
      icon: BedDouble,
    },
    {
      id: 'tours',
      title: lt(locale, { fa: 'تور', en: 'Tours', ar: 'جولات', zh: '旅游', ru: 'Туры' }),
      href: '/tours',
      icon: Compass,
    },
    {
      id: 'visa',
      title: lt(locale, { fa: 'ویزا', en: 'Visa', ar: 'تأشيرة', zh: '签证', ru: 'Виза' }),
      href: '/visa',
      icon: FileCheck2,
    },
    {
      id: 'insurance',
      title: lt(locale, { fa: 'بیمه', en: 'Insurance', ar: 'تأمين', zh: '保险', ru: 'Страховка' }),
      href: '/insurance',
      icon: ShieldCheck,
    },
    {
      id: 'transfers',
      title: lt(locale, { fa: 'ترانسفر', en: 'Transfers', ar: 'توصيل', zh: '接送', ru: 'Трансфер' }),
      href: '/transfers',
      icon: CarFront,
    },
    {
      id: 'cip',
      title: lt(locale, { fa: 'CIP', en: 'Airport CIP', ar: 'CIP', zh: 'CIP', ru: 'CIP' }),
      href: '/cip',
      icon: Crown,
    },
    {
      id: 'explore',
      title: t('moreServices'),
      href: '/book',
      icon: LayoutGrid,
    },
  ];

  return (
    <section aria-label={t('moreServices')} className="w-full max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 2xl:px-8 mt-3 sm:mt-5 relative z-30">
      <div className="bg-surface rounded-3xl p-4 sm:p-6 border border-line/80 shadow-elev-1">
        <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth snap-x pb-1 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(min(100%,8rem),1fr))] sm:overflow-visible sm:pb-0">
          {services.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className="group flex min-w-[4.75rem] sm:min-w-0 snap-start flex-col items-center justify-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-2xl hover:bg-soft/70 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl grid place-items-center transition-all duration-300 group-hover:scale-105 shrink-0 ${ICON_TONE}`}
                >
                  <Icon size={22} aria-hidden="true" strokeWidth={2.2} className="sm:w-6 sm:h-6" />
                </div>
                <span className="min-w-0 text-[11px] sm:text-xs font-black text-ink group-hover:text-brand-dark transition-colors text-center leading-tight line-clamp-2 w-full">
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
