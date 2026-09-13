'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Calendar,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  Sparkles,
  X,
} from 'lucide-react';
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
  isPast: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

function parseIso(iso: string): Date {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatIso(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function FlightPriceCalendar({
  selectedDate,
  onSelectDate,
  basePrice,
  locale,
}: FlightPriceCalendarProps) {
  // Normalize basePrice to Toman (if passed in Rials > 15M)
  const baseToman = basePrice > 15_000_000 ? Math.round(basePrice / 10) : basePrice || 2_850_000;

  // Day offset for the carousel: -3 to +3 around anchor
  const [dayOffset, setDayOffset] = useState<number>(0);
  const [modalOpen, setModalOpen] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Today ISO string
  const today = useMemo(() => {
    const now = new Date();
    return formatIso(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  }, []);

  // Reset offset when selected date changes
  useEffect(() => {
    setDayOffset(0);
  }, [selectedDate]);

  // Day multipliers for Iranian vs International travel patterns
  const isFaLocale = locale === 'fa' || locale === 'ar';

  // Helper to compute realistic prices for a given date
  const computePriceForDate = useCallback((d: Date, dateStr: string) => {
    if (dateStr === selectedDate) return baseToman;
    const dayMultipliers: Record<number, number> = isFaLocale
      ? {
          0: 0.98, // یکشنبه
          1: 0.96, // دوشنبه
          2: 0.91, // سه‌شنبه (ارزان‌ترین روز میان‌هفته)
          3: 0.97, // چهارشنبه
          4: 1.14, // پنجشنبه (شروع آخر هفته)
          5: 1.18, // جمعه (پیک پروازها)
          6: 1.04, // شنبه
        }
      : {
          0: 1.14, // Sun
          1: 0.98, // Mon
          2: 0.92, // Tue
          3: 0.95, // Wed
          4: 1.02, // Thu
          5: 1.16, // Fri
          6: 1.18, // Sat
        };
    const dow = d.getDay();
    const mult = dayMultipliers[dow] ?? 1.0;
    const seedShift = ((d.getDate() % 5) - 2) * 0.025;
    return Math.round((baseToman * (mult + seedShift)) / 50_000) * 50_000;
  }, [selectedDate, baseToman, isFaLocale]);

  // 7-day Carousel Window (Alibaba / FlyToday style)
  const carouselDays: DayPriceItem[] = useMemo(() => {
    const active = parseIso(selectedDate);
    const anchor = new Date(active);
    anchor.setDate(anchor.getDate() - 3 + dayOffset);

    const items: Array<Omit<DayPriceItem, 'isCheapest'>> = [];
    const jFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'short' });
    const wFmtFa = new Intl.DateTimeFormat('fa-IR', { weekday: 'short' });

    const otherLocales: Record<string, string> = {
      en: 'en-US',
      ar: 'ar-SA',
      ru: 'ru-RU',
      zh: 'zh-CN',
    };
    const targetIntl = otherLocales[locale] || 'en-US';

    for (let i = 0; i < 7; i++) {
      const cur = new Date(anchor);
      cur.setDate(anchor.getDate() + i);

      const dateStr = formatIso(cur);
      const isSelected = dateStr === selectedDate;
      const isPast = dateStr < today;
      const isToday = dateStr === today;
      const dow = cur.getDay();
      const isWeekend = isFaLocale ? dow === 4 || dow === 5 : dow === 6 || dow === 0;

      let dayName = '';
      let dateDisplay = '';

      if (locale === 'fa') {
        dayName = wFmtFa.format(cur);
        dateDisplay = jFmt.format(cur);
      } else {
        dayName = cur.toLocaleDateString(targetIntl, { weekday: 'short' });
        dateDisplay = cur.toLocaleDateString(targetIntl, { day: 'numeric', month: 'short' });
      }

      const price = computePriceForDate(cur, dateStr);

      items.push({
        dateStr,
        dayName,
        dateDisplay,
        price,
        isSelected,
        isPast,
        isToday,
        isWeekend,
      });
    }

    const validPrices = items.filter((it) => !it.isPast).map((it) => it.price);
    const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : baseToman;

    return items.map((it) => ({
      ...it,
      isCheapest: !it.isPast && it.price === minPrice,
    }));
  }, [selectedDate, dayOffset, baseToman, locale, today, computePriceForDate, isFaLocale]);

  // Full 30-Day Monthly Calendar Grid for the Modal (like Alibaba's "تقویم قیمتی")
  const monthlyDays = useMemo(() => {
    const startDate = parseIso(today);
    const grid: DayPriceItem[] = [];
    const jFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'short' });
    const wFmtFa = new Intl.DateTimeFormat('fa-IR', { weekday: 'short' });

    for (let i = 0; i < 30; i++) {
      const cur = new Date(startDate);
      cur.setDate(startDate.getDate() + i);
      const dateStr = formatIso(cur);
      const isSelected = dateStr === selectedDate;
      const isPast = dateStr < today;
      const isToday = dateStr === today;
      const dow = cur.getDay();
      const isWeekend = isFaLocale ? dow === 4 || dow === 5 : dow === 6 || dow === 0;

      let dayName = '';
      let dateDisplay = '';
      if (locale === 'fa') {
        dayName = wFmtFa.format(cur);
        dateDisplay = jFmt.format(cur);
      } else {
        dayName = cur.toLocaleDateString('en-US', { weekday: 'short' });
        dateDisplay = cur.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      }

      const price = computePriceForDate(cur, dateStr);
      grid.push({
        dateStr,
        dayName,
        dateDisplay,
        price,
        isSelected,
        isPast,
        isToday,
        isWeekend,
        isCheapest: false,
      });
    }

    const validPrices = grid.map((it) => it.price);
    const minP = Math.min(...validPrices);
    return grid.map((it) => ({
      ...it,
      isCheapest: it.price === minP,
    }));
  }, [today, selectedDate, locale, computePriceForDate, isFaLocale]);

  const currencyLabel = lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томан' });

  return (
    <>
      {/* ========================================================================= */}
      {/* ALIBABA & FLYTODAY STYLE LOWEST FARE CALENDAR STRIP (تقویم قیمتی روزانه)     */}
      {/* ========================================================================= */}
      <div
        aria-label={lt(locale, {
          fa: 'تقویم قیمتی روزهای قبل و بعد',
          en: 'Flight Fare Calendar',
          ar: 'تقويم أسعار الرحلات',
          zh: '机票低价日历',
          ru: 'Календарь цен на авиабилеты',
        })}
        className="w-full bg-surface rounded-2xl border border-line p-2.5 sm:p-3 shadow-xs mb-4 transition-all"
      >
        {/* Header: Title + Best Price Badge + Open Full Calendar Modal Button */}
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-brand shrink-0" />
            <span className="text-xs sm:text-[13px] font-black text-ink">
              {lt(locale, {
                fa: 'ارزان‌ترین نرخ روزهای قبل و بعد',
                en: 'Cheapest Fares on Nearby Dates',
                ar: 'أرخص الأسعار للأيام المجاورة',
                zh: '临近日期最低票价',
                ru: 'Самые дешевые билеты на соседние даты',
              })}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-black border border-emerald-200 dark:border-emerald-800/40">
              <Sparkles size={10} className="text-emerald-600" />
              {lt(locale, { fa: 'تضمین کمترین نرخ', en: 'Best Rate Guaranteed', ar: 'ضمان أقل سعر', zh: '最低价保证', ru: 'Гарантия лучшей цены' })}
            </span>
          </div>

          {/* Alibaba-style "مشاهده تقویم قیمتی" button */}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-[11.5px] font-black text-brand hover:text-brand-dark flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-soft transition cursor-pointer"
          >
            <Calendar size={13} />
            <span>
              {lt(locale, {
                fa: 'تقویم کامل قیمتی',
                en: 'View 30-Day Calendar',
                ar: 'عرض التقويم الشهري',
                zh: '查看完整价格日历',
                ru: 'Посмотреть календарь на 30 дней',
              })}
            </span>
          </button>
        </div>

        {/* 7-Day Horizontal Carousel with Navigation Arrows */}
        <div className="relative flex items-center gap-1 sm:gap-2">
          {/* Previous Days Step Button */}
          <button
            type="button"
            onClick={() => setDayOffset((prev) => prev - 1)}
            aria-label={lt(locale, { fa: 'روز قبل', en: 'Previous Day', ar: 'اليوم السابق', zh: '前一天', ru: 'Предыдущий день' })}
            className="min-h-[44px] min-w-[44px] w-11 h-16 sm:h-20 rounded-xl bg-soft hover:bg-line/70 text-sub hover:text-ink grid place-items-center shrink-0 transition cursor-pointer active:scale-95"
          >
            {locale === 'fa' || locale === 'ar' ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          {/* Days Track */}
          <div
            ref={trackRef}
            className="flex-1 grid grid-cols-7 gap-1 sm:gap-2 overflow-hidden py-1"
          >
            {carouselDays.map((item) => (
              <button
                key={item.dateStr}
                type="button"
                disabled={item.isPast}
                data-selected={item.isSelected || undefined}
                onClick={() => {
                  if (!item.isPast) onSelectDate(item.dateStr);
                }}
                className={`relative rounded-xl p-1.5 sm:p-2 text-center transition-all flex flex-col justify-between min-h-[68px] sm:min-h-[82px] border cursor-pointer select-none active:scale-[0.98] ${
                  item.isSelected
                    ? 'bg-brand text-surface border-brand shadow-sm ring-2 ring-brand/30'
                    : item.isCheapest
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-700 text-ink hover:border-emerald-600'
                    : item.isPast
                    ? 'bg-soft/40 border-line/40 text-sub/40 cursor-not-allowed opacity-50'
                    : 'bg-surface hover:bg-soft/60 border-line text-ink'
                }`}
              >
                {/* Top: Day Name (e.g. سه‌شنبه) */}
                <div className="flex items-center justify-center gap-1">
                  <span className={`text-[10px] sm:text-[11.5px] font-black ${item.isSelected ? 'text-surface' : item.isWeekend ? 'text-rose-500' : 'text-sub'}`}>
                    {item.dayName}
                  </span>
                </div>

                {/* Middle: Day & Month (e.g. ۲۱ اسفند) */}
                <div className={`text-[11px] sm:text-[12.5px] font-extrabold font-mono num ${item.isSelected ? 'text-surface' : 'text-ink'}`}>
                  {item.dateDisplay}
                </div>

                {/* Bottom: Price in Toman */}
                <div className="mt-0.5">
                  {item.isPast ? (
                    <span className="text-[9.5px] font-bold text-sub/50">
                      {lt(locale, { fa: 'گذشته', en: 'Past', ar: 'مضى', zh: '已过', ru: 'Прошло' })}
                    </span>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className={`text-[10px] sm:text-[11.5px] font-black font-mono num leading-none ${item.isSelected ? 'text-surface' : item.isCheapest ? 'text-emerald-700 dark:text-emerald-300' : 'text-brand-dark'}`}>
                        {num(item.price, locale)}
                      </span>
                      <span className={`text-[8.5px] font-bold leading-none mt-0.5 ${item.isSelected ? 'text-surface/80' : 'text-sub'}`}>
                        {currencyLabel}
                      </span>
                    </div>
                  )}
                </div>

                {/* Cheapest Badge (Alibaba style green badge) */}
                {item.isCheapest && !item.isSelected && (
                  <span className="absolute -top-2 start-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-emerald-600 text-surface text-[8.5px] font-black shadow-xs whitespace-nowrap">
                    {lt(locale, { fa: 'ارزان‌ترین', en: 'Cheapest', ar: 'الأرخص', zh: '最低', ru: 'Эконом' })}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Next Days Step Button */}
          <button
            type="button"
            onClick={() => setDayOffset((prev) => prev + 1)}
            aria-label={lt(locale, { fa: 'روز بعد', en: 'Next Day', ar: 'اليوم التالي', zh: '后一天', ru: 'Следующий день' })}
            className="min-h-[44px] min-w-[44px] w-11 h-16 sm:h-20 rounded-xl bg-soft hover:bg-line/70 text-sub hover:text-ink grid place-items-center shrink-0 transition cursor-pointer active:scale-95"
          >
            {locale === 'fa' || locale === 'ar' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FULL MONTHLY PRICE CALENDAR MODAL (تقویم کامل ماهانه علی‌بابا و فلای‌تودی)   */}
      {/* ========================================================================= */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-3xl bg-surface rounded-2xl border border-line shadow-elev-3 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-line">
              <div className="flex items-center gap-2">
                <CalendarDays size={18} className="text-brand" />
                <h3 className="text-sm sm:text-base font-black text-ink m-0">
                  {lt(locale, {
                    fa: 'تقویم قیمتی ۳۰ روزه پروازها',
                    en: '30-Day Low Fare Flight Calendar',
                    ar: 'تقويم أسعار الرحلات الشهري',
                    zh: '30天机票价格日历',
                    ru: 'Календарь цен на авиабилеты на 30 дней',
                  })}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-soft text-sub hover:text-ink grid place-items-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Subtitle & Tip */}
            <div className="px-4 py-2 bg-soft/60 border-b border-line/60 flex items-center justify-between text-xs text-sub">
              <span>{lt(locale, { fa: 'روی هر روز کلیک کنید تا پروازهای آن تاریخ بلافاصله نمایش داده شوند', en: 'Click any day to instantly update flight results', ar: 'انقر على أي يوم لعرض الرحلات', zh: '点击任意日期立即刷新航班', ru: 'Нажмите на любую дату для поиска' })}</span>
              <span className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                {lt(locale, { fa: 'کمترین نرخ ماه', en: 'Lowest fare of the month', ar: 'أقل سعر للشهر', zh: '本月最低', ru: 'Самая низкая цена месяца' })}
              </span>
            </div>

            {/* 30-Day Grid */}
            <div className="p-4 overflow-y-auto grid grid-cols-5 sm:grid-cols-7 gap-2">
              {monthlyDays.map((item) => (
                <button
                  key={item.dateStr}
                  type="button"
                  onClick={() => {
                    onSelectDate(item.dateStr);
                    setModalOpen(false);
                  }}
                  className={`relative p-2.5 rounded-xl border text-center transition flex flex-col justify-between min-h-[76px] cursor-pointer ${
                    item.isSelected
                      ? 'bg-brand text-surface border-brand shadow-sm ring-2 ring-brand/30'
                      : item.isCheapest
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-ink hover:border-emerald-600'
                      : 'bg-surface hover:bg-soft border-line text-ink'
                  }`}
                >
                  <span className={`text-[10.5px] font-bold ${item.isSelected ? 'text-surface/80' : item.isWeekend ? 'text-rose-500' : 'text-sub'}`}>
                    {item.dayName}
                  </span>
                  <span className={`text-xs font-black font-mono num ${item.isSelected ? 'text-surface' : 'text-ink'}`}>
                    {item.dateDisplay}
                  </span>
                  <span className={`text-[11px] font-black font-mono num mt-1 ${item.isSelected ? 'text-surface' : item.isCheapest ? 'text-emerald-700 dark:text-emerald-300' : 'text-brand-dark'}`}>
                    {num(item.price, locale)}
                  </span>
                  {item.isCheapest && !item.isSelected && (
                    <span className="absolute -top-1.5 start-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-emerald-600 text-surface text-[8px] font-black">
                      {lt(locale, { fa: 'ارزان‌ترین', en: 'Min', ar: 'الأدنى', zh: '最低', ru: 'Мин' })}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-soft border-t border-line flex justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface border border-line text-xs font-bold text-ink hover:bg-line/40 transition cursor-pointer"
              >
                {lt(locale, { fa: 'بستن تقویم', en: 'Close', ar: 'إغلاق', zh: '关闭', ru: 'Закрыть' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
