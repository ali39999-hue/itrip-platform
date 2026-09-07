'use client';

import React, { useMemo } from 'react';
import { Calendar, TrendingDown } from 'lucide-react';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';

interface FlightPriceCalendarProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  basePrice: number;
  locale: string;
}

interface DayPriceItem {
  dateStr: string;
  dayName: string;
  dateDisplay: string;
  price: number;
  isCheapest: boolean;
  isSelected: boolean;
}

export function FlightPriceCalendar({
  selectedDate,
  onSelectDate,
  basePrice,
  locale,
}: FlightPriceCalendarProps) {
  const days: DayPriceItem[] = useMemo(() => {
    const activeDate = selectedDate ? new Date(selectedDate) : new Date();
    const result: DayPriceItem[] = [];

    // Realistic price offsets for a 7-day window
    const priceOffsets = [1.12, 0.95, 1.05, 0.88, 1.0, 1.18, 1.08];

    // Anchor around selectedDate: 2 days before, selected day, 4 days after
    const startDate = new Date(activeDate);
    startDate.setDate(startDate.getDate() - 2);

    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const mult = priceOffsets[i % priceOffsets.length];
      const price = Math.round((basePrice * mult) / 1000000) * 100000;

      const intlLocale = locale === 'fa' ? 'fa-IR' : locale === 'ar' ? 'ar' : locale === 'zh' ? 'zh-CN' : locale === 'ru' ? 'ru' : 'en-US';
      const dayName = d.toLocaleDateString(intlLocale, { weekday: 'short' });
      const dateDisplay = d.toLocaleDateString(intlLocale, { day: 'numeric', month: 'short' });

      result.push({
        dateStr,
        dayName,
        dateDisplay,
        price,
        isCheapest: false,
        isSelected: dateStr === selectedDate,
      });
    }

    // Mark the cheapest date
    const minPrice = Math.min(...result.map((r) => r.price));
    return result.map((r) => ({
      ...r,
      isCheapest: r.price === minPrice,
    }));
  }, [selectedDate, basePrice, locale]);

  return (
    <section
      aria-label={lt(locale, { fa: 'تقویم ارزان‌ترین پروازها', en: 'Low Fare Flight Calendar', ar: 'تقويم أرخص الرحلات', zh: '低价机票日历', ru: 'Календарь низких цен' })}
      className="w-full bg-surface rounded-2xl border border-line p-3 sm:p-4 shadow-sm mb-5"
    >
      <div className="flex items-center justify-between gap-2 mb-2 px-1">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-brand-dark" aria-hidden="true" />
          <h3 className="text-xs sm:text-sm font-black text-ink">
            {lt(locale, {
              fa: 'تقویم ارزان‌ترین پروازهای هفته (تضمین کمترین نرخ)',
              en: 'Lowest Fare Calendar (7-Day Price Window)',
              ar: 'تقويم أرخص الرحلات لهذا الأسبوع',
              zh: '本周低价机票日历（7天比价）',
              ru: 'Календарь низких цен на 7 дней',
            })}
          </h3>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
          <TrendingDown size={13} aria-hidden="true" />
          <span>{lt(locale, { fa: 'بهترین قیمت روز', en: 'Best Day Fare', ar: 'أفضل سعر', zh: '最优价', ru: 'Лучшая цена' })}</span>
        </span>
      </div>

      {/* 7-Day Horizontal Scroll Track */}
      <div className="flex items-stretch gap-2 overflow-x-auto pb-1 pt-1.5 scrollbar-none snap-x snap-mandatory">
        {days.map((item) => (
          <button
            key={item.dateStr}
            type="button"
            onClick={() => onSelectDate(item.dateStr)}
            className={`shrink-0 w-[116px] sm:w-auto sm:flex-1 p-2 sm:p-2.5 rounded-xl border text-center transition-all snap-start relative flex flex-col justify-between min-h-[76px] cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              item.isSelected
                ? 'bg-brand text-surface border-brand shadow-md shadow-brand/25 ring-2 ring-brand/30'
                : item.isCheapest
                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-ink hover:border-emerald-500'
                : 'bg-soft/70 border-line text-ink hover:border-brand/50 hover:bg-surface'
            }`}
          >
            {item.isCheapest && !item.isSelected && (
              <span className="absolute -top-2.5 inset-x-0 mx-auto w-max px-1.5 py-0.5 rounded-full bg-emerald-600 text-surface text-[9px] font-black shadow-2xs">
                {lt(locale, { fa: 'ارزان‌ترین', en: 'Cheapest', ar: 'الأرخص', zh: '最低', ru: 'Выгодно' })}
              </span>
            )}

            <div>
              <span className={`block text-[11px] font-extrabold leading-tight ${item.isSelected ? 'text-surface/90' : 'text-sub'}`}>
                {item.dayName}
              </span>
              <span className={`block text-[10.5px] font-bold mt-0.5 ${item.isSelected ? 'text-surface' : 'text-ink'}`}>
                {item.dateDisplay}
              </span>
            </div>

            <div className="mt-1 pt-1 border-t border-current/15">
              <span className={`text-[12.5px] font-black font-mono num block leading-none ${item.isSelected ? 'text-surface' : item.isCheapest ? 'text-emerald-700 dark:text-emerald-300' : 'text-brand-dark'}`}>
                {num(item.price, locale)}
              </span>
              <span className={`text-[9.5px] font-bold block mt-0.5 ${item.isSelected ? 'text-surface/80' : 'text-sub'}`}>
                {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томан' })}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
