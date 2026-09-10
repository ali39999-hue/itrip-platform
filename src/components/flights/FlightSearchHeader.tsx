'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PlaneTakeoff, PlaneLanding, Calendar, ArrowLeftRight, Search, Building2, ChevronDown, X, Plane } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { CITIES, type CityOption } from '@/lib/data';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';
import { JalaliDatePicker } from '@/components/ui/DatePicker';

export interface FlightSearchHeaderProps {
  from: string;
  onFromChange: (val: string) => void;
  to: string;
  onToChange: (val: string) => void;
  travelDate: string;
  onTravelDateChange: (val: string) => void;
  onSearchSubmit: (override?: { from?: string; to?: string; depart?: string }) => void;
  resultsCount: number;
}

const POPULAR_ROUTES = [
  { fromFa: 'تهران', toFa: 'مشهد', fromEn: 'Tehran', toEn: 'Mashhad' },
  { fromFa: 'تهران', toFa: 'استانبول', fromEn: 'Tehran', toEn: 'Istanbul' },
  { fromFa: 'تهران', toFa: 'دبی', fromEn: 'Tehran', toEn: 'Dubai' },
  { fromFa: 'تهران', toFa: 'کیش', fromEn: 'Tehran', toEn: 'Kish' },
  { fromFa: 'شیراز', toFa: 'تهران', fromEn: 'Shiraz', toEn: 'Tehran' },
  { fromFa: 'مشهد', toFa: 'تهران', fromEn: 'Mashhad', toEn: 'Tehran' },
  { fromFa: 'تهران', toFa: 'تفلیس', fromEn: 'Tehran', toEn: 'Tbilisi' },
];

export function FlightSearchHeader({
  from,
  onFromChange,
  to,
  onToChange,
  travelDate,
  onTravelDateChange,
  onSearchSubmit,
  resultsCount,
}: FlightSearchHeaderProps) {
  const locale = useLocale();

  const [fromSuggestionsOpen, setFromSuggestionsOpen] = useState(false);
  const [toSuggestionsOpen, setToSuggestionsOpen] = useState(false);
  const [swapped, setSwapped] = useState(false);

  const fromWrapperRef = useRef<HTMLDivElement>(null);
  const toWrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (fromWrapperRef.current && !fromWrapperRef.current.contains(e.target as Node)) {
        setFromSuggestionsOpen(false);
      }
      if (toWrapperRef.current && !toWrapperRef.current.contains(e.target as Node)) {
        setToSuggestionsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSwap() {
    setSwapped((prev) => !prev);
    const temp = from;
    onFromChange(to);
    onToChange(temp);
  }

  function handleSelectFrom(cityName: string) {
    onFromChange(cityName);
    setFromSuggestionsOpen(false);
  }

  function handleSelectTo(cityName: string) {
    onToChange(cityName);
    setToSuggestionsOpen(false);
  }

  function handleSelectRoute(fromCity: string, toCity: string) {
    onFromChange(fromCity);
    onToChange(toCity);
    onSearchSubmit({ from: fromCity, to: toCity, depart: travelDate });
  }

  function handleSubmitForm(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setFromSuggestionsOpen(false);
    setToSuggestionsOpen(false);
    onSearchSubmit();
  }

  const popularCities = CITIES.filter((c) => c.popular);

  return (
    <>
      {/* ================= DESKTOP SEARCH BAR (MD+) ================= */}
      <div className="hidden md:block border-b border-line bg-surface/95 backdrop-blur-md shadow-xs">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-4 space-y-3">
          <form onSubmit={handleSubmitForm} className="flex items-center gap-2.5 flex-wrap lg:flex-nowrap w-full">
            {/* Origin (مبدأ) */}
            <div ref={fromWrapperRef} className="relative flex-[1_1_240px] min-w-[200px]">
              <div className="flex items-center gap-2.5 min-h-[54px] px-3.5 border border-line rounded-xl bg-surface focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand/10 transition-all">
                <PlaneTakeoff size={18} className="text-brand shrink-0" />
                <div className="min-w-0 w-full">
                  <label htmlFor="flight-from-input" className="block text-[10px] font-black text-sub cursor-pointer leading-tight mb-0.5">
                    {lt(locale, { fa: 'مبدأ پرواز', en: 'Origin City', ar: 'مدينة المغادرة', zh: '出发城市', ru: 'Город вылета' })}
                  </label>
                  <input
                    id="flight-from-input"
                    value={from}
                    onChange={(e) => {
                      onFromChange(e.target.value);
                      if (!fromSuggestionsOpen) setFromSuggestionsOpen(true);
                    }}
                    onFocus={() => setFromSuggestionsOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setFromSuggestionsOpen(false);
                        onSearchSubmit();
                      }
                    }}
                    placeholder={lt(locale, { fa: 'شهر یا فرودگاه مبدأ', en: 'Departure city/airport', ar: 'مدينة المغادرة', zh: '出发地', ru: 'Откуда' })}
                    className="w-full border-0 outline-0 text-[13px] font-black text-ink p-0 bg-transparent placeholder:text-sub/50"
                  />
                </div>
                {from ? (
                  <button
                    type="button"
                    onClick={() => {
                      onFromChange('');
                      setFromSuggestionsOpen(false);
                    }}
                    className="p-1 rounded-md text-sub hover:text-ink transition cursor-pointer"
                    aria-label="Clear origin"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>

              {/* Origin Dropdown */}
              {fromSuggestionsOpen && (
                <div className="absolute top-[calc(100%+6px)] start-0 z-[120] w-full min-w-[280px] p-3 rounded-2xl bg-surface border border-line shadow-elev-3 animate-in fade-in-50 zoom-in-95 duration-150">
                  <div className="text-[11px] font-black text-sub px-2 pb-2 border-b border-line/60 flex items-center justify-between">
                    <span>{lt(locale, { fa: 'شهرهای پرتردد مبدأ', en: 'Popular Origins', ar: 'مدن المغادرة الشائعة', zh: '热门出发地', ru: 'Популярные города' })}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-2">
                    {popularCities.map((city) => (
                      <button
                        key={city.id}
                        type="button"
                        onClick={() => handleSelectFrom(locale === 'fa' ? city.nameFa : city.nameEn)}
                        className={`flex items-center justify-between p-2 rounded-xl text-start transition cursor-pointer hover:bg-soft ${
                          from === (locale === 'fa' ? city.nameFa : city.nameEn) ? 'bg-brand/10 text-brand font-black' : 'text-ink font-bold'
                        }`}
                      >
                        <span className="text-xs truncate">{locale === 'fa' ? city.nameFa : city.nameEn}</span>
                        <span className="text-[10px] font-mono text-sub">{city.airportCode}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Swap Button */}
            <button
              type="button"
              onClick={handleSwap}
              aria-label="Swap origin and destination"
              className={`w-9 h-9 rounded-full bg-soft hover:bg-line/70 border border-line grid place-items-center text-brand-dark transition-transform duration-200 shrink-0 cursor-pointer ${
                swapped ? 'rotate-180' : ''
              }`}
            >
              <ArrowLeftRight size={14} />
            </button>

            {/* Destination (مقصد) */}
            <div ref={toWrapperRef} className="relative flex-[1_1_240px] min-w-[200px]">
              <div className="flex items-center gap-2.5 min-h-[54px] px-3.5 border border-line rounded-xl bg-surface focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand/10 transition-all">
                <PlaneLanding size={18} className="text-brand shrink-0" />
                <div className="min-w-0 w-full">
                  <label htmlFor="flight-to-input" className="block text-[10px] font-black text-sub cursor-pointer leading-tight mb-0.5">
                    {lt(locale, { fa: 'مقصد پرواز', en: 'Destination City', ar: 'مدينة الوصول', zh: '目的地城市', ru: 'Город прибытия' })}
                  </label>
                  <input
                    id="flight-to-input"
                    value={to}
                    onChange={(e) => {
                      onToChange(e.target.value);
                      if (!toSuggestionsOpen) setToSuggestionsOpen(true);
                    }}
                    onFocus={() => setToSuggestionsOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setToSuggestionsOpen(false);
                        onSearchSubmit();
                      }
                    }}
                    placeholder={lt(locale, { fa: 'شهر یا فرودگاه مقصد', en: 'Destination city/airport', ar: 'مدينة الوصول', zh: '目的地', ru: 'Куда' })}
                    className="w-full border-0 outline-0 text-[13px] font-black text-ink p-0 bg-transparent placeholder:text-sub/50"
                  />
                </div>
                {to ? (
                  <button
                    type="button"
                    onClick={() => {
                      onToChange('');
                      setToSuggestionsOpen(false);
                    }}
                    className="p-1 rounded-md text-sub hover:text-ink transition cursor-pointer"
                    aria-label="Clear destination"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>

              {/* Destination Dropdown */}
              {toSuggestionsOpen && (
                <div className="absolute top-[calc(100%+6px)] start-0 z-[120] w-full min-w-[280px] p-3 rounded-2xl bg-surface border border-line shadow-elev-3 animate-in fade-in-50 zoom-in-95 duration-150">
                  <div className="text-[11px] font-black text-sub px-2 pb-2 border-b border-line/60 flex items-center justify-between">
                    <span>{lt(locale, { fa: 'شهرهای پرتردد مقصد', en: 'Popular Destinations', ar: 'الوجهات الشائعة', zh: '热门目的地', ru: 'Популярные города' })}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-2">
                    {popularCities.map((city) => (
                      <button
                        key={city.id}
                        type="button"
                        onClick={() => handleSelectTo(locale === 'fa' ? city.nameFa : city.nameEn)}
                        className={`flex items-center justify-between p-2 rounded-xl text-start transition cursor-pointer hover:bg-soft ${
                          to === (locale === 'fa' ? city.nameFa : city.nameEn) ? 'bg-brand/10 text-brand font-black' : 'text-ink font-bold'
                        }`}
                      >
                        <span className="text-xs truncate">{locale === 'fa' ? city.nameFa : city.nameEn}</span>
                        <span className="text-[10px] font-mono text-sub">{city.airportCode}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Departure Date */}
            <div className="flex-[1_1_200px] min-w-[170px]">
              <JalaliDatePicker
                value={travelDate}
                onChange={(d) => {
                  if (d) onTravelDateChange(d);
                }}
                label={lt(locale, { fa: 'تاریخ رفت', en: 'Departure Date', ar: 'تاريخ المغادرة', zh: '出发日期', ru: 'Дата вылета' })}
                id="flight-depart-date"
                className="!min-h-[54px] !rounded-xl !py-1.5 !px-3"
              />
            </div>

            {/* Search Submit Button */}
            <button
              type="submit"
              className="flex-1 lg:flex-none min-h-[54px] px-7 inline-flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brand-dark text-surface font-black text-[13.5px] transition-all shadow-xs hover:shadow-elev-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shrink-0 cursor-pointer active:scale-[0.98]"
            >
              <Search size={18} strokeWidth={2.5} />
              <span>{lt(locale, { fa: 'جستجوی پروازها', en: 'Search Flights', ar: 'بحث عن رحلات', zh: '搜索航班', ru: 'Найти рейсы' })}</span>
            </button>
          </form>

          {/* Quick Route Shortcut Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-[11px] font-black text-sub shrink-0 me-1">
              {lt(locale, { fa: 'مسیرهای پرتردد:', en: 'Popular routes:', ar: 'مسارات شائعة:', zh: '热门路线：', ru: 'Популярные:' })}
            </span>
            {POPULAR_ROUTES.map((route) => {
              const active =
                from === (locale === 'fa' ? route.fromFa : route.fromEn) &&
                to === (locale === 'fa' ? route.toFa : route.toEn);
              return (
                <button
                  key={`${route.fromFa}-${route.toFa}`}
                  type="button"
                  onClick={() =>
                    handleSelectRoute(
                      locale === 'fa' ? route.fromFa : route.fromEn,
                      locale === 'fa' ? route.toFa : route.toEn
                    )
                  }
                  className={`px-3 py-1 rounded-lg whitespace-nowrap shrink-0 transition text-[11.5px] font-bold cursor-pointer ${
                    active
                      ? 'bg-brand text-surface shadow-2xs font-black'
                      : 'bg-soft text-ink hover:bg-line/70'
                  }`}
                >
                  {locale === 'fa' ? `${route.fromFa} به ${route.toFa}` : `${route.fromEn} to ${route.toEn}`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lightweight Flight Metadata Strip */}
      <div className="border-b border-line/60 bg-soft/60 text-sub">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 flex items-center gap-2 flex-wrap py-2 text-[11px] font-bold">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-line/70 bg-surface shadow-2xs text-ink">
            {lt(locale, { fa: 'مسیر انتخابی:', en: 'Route:', ar: 'المسار:', zh: '航线：', ru: 'Маршрут:' })}{' '}
            <b className="text-brand-dark">
              {from || lt(locale, { fa: 'همه مبدأها', en: 'All origins', ar: 'جميع المطارات', zh: '全部出发地', ru: 'Все города' })}{' '}
              ➔{' '}
              {to || lt(locale, { fa: 'همه مقصدها', en: 'All destinations', ar: 'جميع الوجهات', zh: '全部目的地', ru: 'Все направления' })}
            </b>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-line/70 bg-surface shadow-2xs text-ink">
            {lt(locale, { fa: 'تعداد پروازها:', en: 'Available flights:', ar: 'الرحلات المتاحة:', zh: '可用航班：', ru: 'Доступно рейсов:' })}{' '}
            <b className="text-brand-dark">{num(resultsCount, locale)}</b>
          </span>
          <Link
            href="/support"
            className="me-auto hidden md:inline-flex items-center gap-1 text-brand-dark font-black hover:underline"
          >
            {lt(locale, { fa: 'قوانین استرداد و بار مجاز مسافرتی ←', en: 'Baggage allowance & refund rules →', ar: 'شروط الأمتعة والإلغاء ←', zh: '行李额与退改签规则 →', ru: 'Правила багажа и возврата →' })}
          </Link>
        </div>
      </div>
    </>
  );
}
