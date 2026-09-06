'use client';

import { useLocale } from 'next-intl';
import type { Tour } from '@/lib/types';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import {
  Clock,
  Plane,
  Building2,
  Users,
  Languages,
  ShieldCheck,
} from 'lucide-react';

interface TourQuickBarProps {
  tour: Tour;
}

export function TourQuickBar({ tour }: TourQuickBarProps) {
  const locale = useLocale();

  const items = [
    {
      icon: Clock,
      label: lt(locale, { fa: 'مدت اقامت', en: 'Duration', ar: 'المدة', zh: '行程天数', ru: 'Длительность' }),
      value: `${num(tour.durationDays, locale)} ${lt(locale, { fa: 'روز', en: 'Days', ar: 'أيام', zh: '天', ru: 'дн.' })}${tour.durationNights ? ` و ${num(tour.durationNights, locale)} ${lt(locale, { fa: 'شب', en: 'Nights', ar: 'ليالٍ', zh: '晚', ru: 'ноч.' })}` : ''}`,
    },
    {
      icon: Plane,
      label: lt(locale, { fa: 'حمل و نقل', en: 'Transport', ar: 'المواصلات', zh: '交通方式', ru: 'Транспорт' }),
      value: locale === 'fa' ? (tour.transportType || 'پرواز رفت و برگشت + ترانسفر') : (tour.transportTypeEn || 'Return flight + transfers'),
    },
    {
      icon: Building2,
      label: lt(locale, { fa: 'اقامتگاه', en: 'Accommodation', ar: 'الإقامة', zh: '住宿标准', ru: 'Проживание' }),
      value: tour.hotelName || lt(locale, { fa: 'هتل ۵ ستاره لوکس', en: '5-star Luxury Hotel', ar: 'فندق ٥ نجوم فاخر', zh: '五星级豪华酒店', ru: '5-звёздочный отель' }),
    },
    {
      icon: Users,
      label: lt(locale, { fa: 'نوع گروه', en: 'Group Type', ar: 'نوع المجموعة', zh: '出行规模', ru: 'Группа' }),
      value: locale === 'fa' ? (tour.groupSize || 'حداکثر ۱۲ نفر') : (tour.groupSizeEn || 'Max 12 people'),
    },
    {
      icon: Languages,
      label: lt(locale, { fa: 'زبان راهنما', en: 'Guide Languages', ar: 'لغات المرشد', zh: '导游语言', ru: 'Языки гида' }),
      value: (tour.guideLanguages || ['فارسی', 'English']).join('، '),
    },
    {
      icon: ShieldCheck,
      label: lt(locale, { fa: 'بیمه مسافرتی', en: 'Travel Insurance', ar: 'التأمين', zh: '旅游保险', ru: 'Страховка' }),
      value: lt(locale, { fa: 'پوشش کامل حوادث', en: 'Full Coverage', ar: 'تغطية شاملة', zh: '全额保障', ru: 'Полная страховка' }),
    },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 mt-4 sm:mt-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 p-3.5 sm:p-5 rounded-2xl bg-surface border border-line shadow-xs">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="flex flex-col gap-0.5 sm:gap-1 p-1.5 sm:p-2 bg-soft/50 sm:bg-transparent rounded-xl">
              <div className="flex items-center gap-1.5 text-brand-dark">
                <Icon size={14} className="shrink-0" />
                <span className="text-[10.5px] sm:text-[11px] font-bold text-sub truncate">{item.label}</span>
              </div>
              <div className="text-[11.5px] sm:text-xs font-black text-ink leading-snug line-clamp-2">
                {item.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
