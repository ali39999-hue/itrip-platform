'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Plane, Briefcase, ChevronDown, Armchair, BellDot } from 'lucide-react';
import type { Flight } from '@/lib/types';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';
import { AirlineLogo } from './AirlineLogo';

/* "3h 50m" → minutes (for sorting) */
export function durationMinutes(d: string): number {
  const h = /(\d+)\s*h/.exec(d)?.[1] ?? '0';
  const m = /(\d+)\s*m/.exec(d)?.[1] ?? '0';
  return Number(h) * 60 + Number(m);
}

/* "3h 50m" → localized duration string */
export function durationLocalized(d: string, locale: string): string {
  const h = Number(/(\d+)\s*h/.exec(d)?.[1] ?? 0);
  const m = Number(/(\d+)\s*m/.exec(d)?.[1] ?? 0);
  if (locale === 'fa') {
    const parts: string[] = [];
    if (h) parts.push(`${h.toLocaleString('fa-IR')} ساعت`);
    if (m) parts.push(`${m.toLocaleString('fa-IR')} دقیقه`);
    return parts.join(' و ');
  }
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return parts.join(' ');
}

/* Presentation-only: fa/ar digits inside data strings ("20kg" → "۲۰kg") */
function localizeDigits(value: string, locale: string): string {
  const map = locale === 'fa' ? '۰۱۲۳۴۵۶۷۸۹' : locale === 'ar' ? '٠١٢٣٤٥٦٧٨٩' : null;
  return map ? value.replace(/\d/g, (d) => map[Number(d)]) : value;
}

interface BentoFlightCardProps {
  flight: Flight;
  onSelect: () => void;
  isCheapest?: boolean;
}

export function BentoFlightCard({ flight, onSelect, isCheapest = false }: BentoFlightCardProps) {
  const t = useTranslations('Flights');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [compared, setCompared] = useState(false);

  const overnight = flight.arrivalTime < flight.departureTime;
  const business = flight.cabinClass === 'business';

  // Extract pure city name and airport IATA code
  const originIata = /\(([A-Z]{3})\)/.exec(flight.origin)?.[1] || 'THR';
  const destIata = /\(([A-Z]{3})\)/.exec(flight.destination)?.[1] || 'IST';
  const originCity = flight.originCity || flight.origin.replace(/\s*\([A-Z]{3}\)/, '');
  const destCity = flight.destinationCity || flight.destination.replace(/\s*\([A-Z]{3}\)/, '');

  return (
    <article
      className="relative bg-[#FDF6EE] dark:bg-surface border border-[#F0E9DD] dark:border-line rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:border-amber-400/60 transition-all group overflow-hidden"
    >
      <div className="flex flex-col md:flex-row items-stretch">
        {/* ================= MAIN TICKET BODY (در RTL: سمت راست — بدنه پرواز) ================= */}
        <div className="flex-1 p-5 md:p-6 flex flex-col justify-between min-w-0">
          {/* Top row: Airline logo, name, flight number & class — anchored to start (راست در RTL) */}
          <div className="flex items-center gap-3">
            <AirlineLogo airline={flight.airline} airlineEn={flight.airlineEn} size={38} />
            <div className="flex flex-col items-end gap-0.5">
              <h4 className="font-extrabold text-sm md:text-base text-neutral-900 dark:text-ink leading-tight">
                {flight.airline}
              </h4>
              <span dir="ltr" className="text-xs font-bold text-neutral-500 dark:text-sub font-mono tracking-wide">
                {flight.flightNo}
              </span>
              <span className="text-xs font-bold text-neutral-500 dark:text-sub">
                {business ? 'Business' : 'Economy'}
              </span>
            </div>
          </div>

          {/* Middle row: Departure, Visual Flight Path, Arrival */}
          <div className="flex items-center justify-between gap-2 md:gap-4 py-4 md:py-5 md:px-2">
            {/* Departure (first child → در RTL سمت راست، مطابق طرح مبدأ سمت راست است) */}
            <div className="flex flex-col items-start shrink-0 min-w-[72px]">
              <div className="text-2xl md:text-[28px] font-black text-neutral-900 dark:text-ink font-mono tracking-tight leading-none" dir="ltr">
                {flight.departureTime}
              </div>
              <div className="text-xs md:text-sm font-extrabold text-neutral-800 dark:text-ink mt-1.5">
                {originCity}
              </div>
              <div className="text-[11px] font-bold text-neutral-400 dark:text-sub font-mono mt-0.5">
                {originIata}
              </div>
            </div>

            {/* Center Flight Duration & Dotted Path with Plane Icon */}
            <div className="flex-1 mx-2 md:mx-8 flex flex-col items-center justify-center min-w-0">
              <span className="text-[11.5px] font-bold text-neutral-600 dark:text-sub mb-2.5 whitespace-nowrap">
                {durationLocalized(flight.duration, locale)}
              </span>

              {/* Horizontal dotted flight line with airplane icon */}
              <div className="w-full relative flex items-center justify-between">
                {/* Start dot */}
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-800 dark:bg-mint-bright shrink-0" />

                {/* Fine dotted line */}
                <div className="flex-1 mx-2.5 relative flex items-center justify-center">
                  <span className="w-full border-t-2 border-dotted border-neutral-300 dark:border-line" />
                  {/* Plane icon centered on the line — در RTL به سمت چپ (جهت پرواز) */}
                  <span className="absolute px-2.5 py-1.5 bg-[#FDF6EE] dark:bg-surface text-[#197678] dark:text-mint-bright">
                    <Plane size={18} fill="currentColor" className="-rotate-45 rtl:-scale-x-100" />
                  </span>
                </div>

                {/* End dot */}
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-800 dark:bg-mint-bright shrink-0" />
              </div>

              <span className="text-[11.5px] font-bold text-neutral-600 dark:text-sub mt-2.5">
                {flight.stops === 0
                  ? lt(locale, { fa: 'بدون توقف', en: 'Non-stop', ar: 'مباشر', zh: '直飞', ru: 'Прямой' })
                  : `${num(flight.stops, locale)} ${t('stops')}`}
              </span>
            </div>

            {/* Arrival (در RTL سمت چپ) */}
            <div className="flex flex-col items-end shrink-0 min-w-[72px]">
              <div className="text-2xl md:text-[28px] font-black text-neutral-900 dark:text-ink font-mono tracking-tight leading-none" dir="ltr">
                {flight.arrivalTime}
              </div>
              <div className="text-xs md:text-sm font-extrabold text-neutral-800 dark:text-ink mt-1.5">
                {destCity}
              </div>
              <div className="text-[11px] font-bold text-neutral-400 dark:text-sub font-mono mt-0.5">
                {destIata}
              </div>
              {overnight && (
                <div className="text-[10px] text-rose-500 font-bold mt-0.5">
                  {t('plusOneDay')}
                </div>
              )}
            </div>
          </div>

          {/* Bottom row: مقایسه (start) — جزئیات پرواز (میانی) — بار مجاز (end) */}
          <div className="mt-4 pt-3 border-t border-[#F0E9DD] dark:border-line/70 flex items-center justify-between gap-2 text-xs text-neutral-500">
            {/* Compare checkbox */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-neutral-400 hover:text-neutral-600 dark:text-sub dark:hover:text-ink transition-colors">
              <input
                type="checkbox"
                checked={compared}
                onChange={(e) => setCompared(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
              />
              <span className="text-xs font-bold">
                {lt(locale, {
                  fa: 'مقایسه',
                  en: 'Compare',
                  ar: 'مقارنة',
                  zh: '比较',
                  ru: 'Сравнить',
                })}
              </span>
            </label>

            {/* Flight details collapsible toggle */}
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              className="flex items-center gap-1 font-bold text-neutral-700 hover:text-amber-600 dark:text-sub dark:hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 rounded"
            >
              <span>{t('flightDetails')}</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${open ? 'rotate-180 text-amber-600' : ''}`}
              />
            </button>

            {/* Baggage allowance */}
            <div className="flex items-center gap-1.5 text-neutral-600 dark:text-sub font-bold text-[11.5px]">
              <Briefcase size={14} className="text-[#197678] dark:text-mint-bright" />
              <span>
                {lt(locale, {
                  fa: `بار مجاز ${localizeDigits(flight.baggage, locale)}`,
                  en: `Baggage: ${flight.baggage}`,
                  ar: `الأمتعة ${localizeDigits(flight.baggage, locale)}`,
                  zh: `托运行李: ${flight.baggage}`,
                  ru: `Багаж: ${flight.baggage}`,
                })}
              </span>
            </div>
          </div>

          {/* Expanded details container */}
          {open && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200 mt-3 p-4 bg-[#FAF3E7] dark:bg-soft/70 border border-[#F0E9DD] dark:border-line/70 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <b className="block text-[10.5px] text-neutral-400 dark:text-sub font-bold mb-0.5">
                  {lt(locale, { fa: 'شماره پرواز', en: 'Flight No', ar: 'رقم الرحلة', zh: '航班号', ru: 'Номер рейса' })}
                </b>
                <span dir="ltr" className="font-mono font-bold text-neutral-900 dark:text-ink">
                  {flight.flightNo}
                </span>
              </div>
              <div>
                <b className="block text-[10.5px] text-neutral-400 dark:text-sub font-bold mb-0.5">
                  {lt(locale, { fa: 'کلاس پروازی', en: 'Cabin Class', ar: 'درجة السفر', zh: '舱位等级', ru: 'Класс' })}
                </b>
                <span className="font-bold text-neutral-900 dark:text-ink">
                  {business
                    ? lt(locale, { fa: 'بیزینس کلاس', en: 'Business Class', ar: 'درجة الأعمال', zh: '商务舱', ru: 'Бизнес-класс' })
                    : lt(locale, { fa: 'اکونومی', en: 'Economy', ar: 'الدرجة السياحية', zh: '经济舱', ru: 'Эконом' })}
                </span>
              </div>
              <div>
                <b className="block text-[10.5px] text-neutral-400 dark:text-sub font-bold mb-0.5">
                  {t('baggageIncluded')}
                </b>
                <span className="font-bold text-neutral-900 dark:text-ink flex items-center gap-1">
                  <Briefcase size={12} className="text-[#197678] dark:text-mint-bright" />
                  {flight.baggage}
                </span>
              </div>
              <div>
                <b className="block text-[10.5px] text-neutral-400 dark:text-sub font-bold mb-0.5">
                  {lt(locale, { fa: 'صندلی باقی‌مانده', en: 'Seats Left', ar: 'مقاعد متبقية', zh: '剩余座位', ru: 'Осталось мест' })}
                </b>
                <span className="font-bold text-neutral-900 dark:text-ink flex items-center gap-1">
                  <Armchair size={12} className="text-amber-600" />
                  {num(flight.seatsLeft, locale)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ================= PRICE STUB (در RTL: سمت چپ — کنارهٔ بلیط) ================= */}
        <div className="relative w-full md:w-64 shrink-0 p-5 md:p-6 flex flex-col justify-between items-center text-center border-t md:border-t-0 md:border-s md:border-dashed border-[#E5DFD5] dark:border-line/80 bg-[#FEFBF6] dark:bg-soft/30">
          {/* Ticket notch cutouts — centered on the dashed divider */}
          <span
            aria-hidden="true"
            className="hidden md:block absolute -top-3 -start-3 w-6 h-6 rounded-full bg-paper border border-[#F0E9DD] dark:border-line shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]"
          />
          <span
            aria-hidden="true"
            className="hidden md:block absolute -bottom-3 -start-3 w-6 h-6 rounded-full bg-paper border border-[#F0E9DD] dark:border-line shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]"
          />

          {/* Top Badge (تنها بلیط باقی‌مانده / ارزان‌ترین) */}
          <div className="min-h-7 flex items-center justify-center w-full mb-2">
            {flight.seatsLeft <= 3 ? (
              <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-rose-600 dark:text-rose-400">
                <span>
                  {lt(locale, {
                    fa: `تنها ${num(flight.seatsLeft, locale)} بلیط باقی‌مانده`,
                    en: `Only ${num(flight.seatsLeft, locale)} seats left`,
                    ar: `بقي ${num(flight.seatsLeft, locale)} تذاكر فقط`,
                    zh: `仅剩 ${num(flight.seatsLeft, locale)} 张机票`,
                    ru: `Осталось ${num(flight.seatsLeft, locale)} билетов`,
                  })}
                </span>
                <BellDot size={15} className="shrink-0" />
              </span>
            ) : isCheapest || flight.price < 26_000_000 ? (
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-900">
                <span>
                  {lt(locale, {
                    fa: 'ارزان‌ترین',
                    en: 'Cheapest',
                    ar: 'الأرخص',
                    zh: '最实惠',
                    ru: 'Самый дешёвый',
                  })}
                </span>
              </span>
            ) : null}
          </div>

          {/* Price display with large crisp numbers */}
          <div className="my-auto py-2">
            <div className="flex items-baseline justify-center gap-1.5" dir="ltr">
              <span className="text-[26px] md:text-[30px] font-black tracking-tight text-neutral-900 dark:text-ink font-mono leading-none">
                {num(flight.price, locale)}
              </span>
              <span className="text-xs font-bold text-neutral-500 dark:text-sub" dir={['fa', 'ar'].includes(locale) ? 'rtl' : 'ltr'}>
                {t('toman')}
              </span>
            </div>
            <span className="text-[11.5px] font-medium text-neutral-400 dark:text-sub mt-1.5 block">
              {t('perPassenger')}
            </span>
          </div>

          {/* CTA — نارنجیِ بلیط مطابق طرح */}
          <button
            type="button"
            onClick={onSelect}
            className="w-full h-11 mt-4 px-4 rounded-xl bg-gradient-to-b from-[#FFA83B] to-[#F58F1C] hover:from-[#FF9D22] hover:to-[#EF8410] text-[#592600] font-black text-sm tracking-wide transition-all shadow-[0_2px_8px_rgba(245,143,28,0.35)] hover:shadow-[0_4px_12px_rgba(245,143,28,0.45)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F58F1C] focus-visible:ring-offset-2"
          >
            {t('selectTicket')}
          </button>
        </div>
      </div>
    </article>
  );
}
