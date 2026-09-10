'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Users, Search, Minus, Plus, Building2, ChevronDown, X } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES } from '@/lib/countries';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';
import { JalaliDatePicker } from '@/components/ui/DatePicker';
import type { HotelSearchHeaderProps } from './types';

const POPULAR_DESTINATIONS = [
  { nameFa: 'مشهد', nameEn: 'Mashhad', tagFa: '۲۱۰+ هتل', tagEn: '210+ stays' },
  { nameFa: 'تهران', nameEn: 'Tehran', tagFa: '۱۱۹+ هتل', tagEn: '119+ stays' },
  { nameFa: 'اصفهان', nameEn: 'Isfahan', tagFa: '۱۰۳+ هتل', tagEn: '103+ stays' },
  { nameFa: 'شیراز', nameEn: 'Shiraz', tagFa: '۷۵+ هتل', tagEn: '75+ stays' },
  { nameFa: 'کیش', nameEn: 'Kish', tagFa: '۱۲+ هتل', tagEn: '12+ stays' },
  { nameFa: 'استانبول', nameEn: 'Istanbul', tagFa: 'ترکیه', tagEn: 'Turkey' },
  { nameFa: 'دبی', nameEn: 'Dubai', tagFa: 'امارات', tagEn: 'UAE' },
  { nameFa: 'پکن', nameEn: 'Beijing', tagFa: 'چین', tagEn: 'China' },
];

function getNights(inDate?: string, outDate?: string): number {
  if (!inDate || !outDate) return 1;
  const d1 = new Date(inDate).getTime();
  const d2 = new Date(outDate).getTime();
  const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
}

export function HotelSearchHeader({
  query,
  onQueryChange,
  onSearchSubmit,
  resultsCount,
  checkin = '2026-09-22',
  onCheckinChange,
  checkout = '2026-09-26',
  onCheckoutChange,
  adults = 2,
  onAdultsChange,
  childrenCount = 0,
  onChildrenCountChange,
  rooms = 1,
  onRoomsChange,
}: HotelSearchHeaderProps) {
  const locale = useLocale();
  const { country } = useCountryStore();

  const isChinaQuery = /پکن|beijing|china|چین/i.test(query || '');
  const effectiveCountry = isChinaQuery ? 'china' : country;
  const c = COUNTRIES[effectiveCountry] || COUNTRIES['iran'] || COUNTRIES['turkey'];

  const [pickerOpen, setPickerOpen] = useState(false);
  const [destSuggestionsOpen, setDestSuggestionsOpen] = useState(false);
  const [mobileEditOpen, setMobileEditOpen] = useState(false);

  const destWrapperRef = useRef<HTMLDivElement>(null);
  const pickerWrapperRef = useRef<HTMLDivElement>(null);

  const nights = getNights(checkin, checkout);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (destWrapperRef.current && !destWrapperRef.current.contains(e.target as Node)) {
        setDestSuggestionsOpen(false);
      }
      if (pickerWrapperRef.current && !pickerWrapperRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelectDest(destName: string, immediateSubmit = false) {
    onQueryChange(destName);
    setDestSuggestionsOpen(false);
    if (immediateSubmit) {
      onSearchSubmit(destName);
    }
  }

  function handleSubmitForm(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setDestSuggestionsOpen(false);
    setPickerOpen(false);
    onSearchSubmit();
  }

  return (
    <>
      {/* ================= 1. MOBILE COMPACT SEARCH PILL (< MD) ================= */}
      <div className="md:hidden border-b border-line bg-surface/90 backdrop-blur-md p-3 shadow-xs">
        <button
          type="button"
          onClick={() => setMobileEditOpen(true)}
          className="w-full flex items-center justify-between p-3 rounded-2xl bg-soft border border-line/80 shadow-2xs text-start active:scale-[0.99] transition"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand text-surface grid place-items-center shrink-0 shadow-xs">
              <Search size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black text-ink block truncate leading-tight">
                {query || lt(locale, { fa: 'همه مقاصد و هتل‌ها', en: 'All Destinations & Hotels', ar: 'جميع الوجهات والفنادق', zh: '所有目的地与酒店', ru: 'Все отели' })}
              </span>
              <span className="text-[10.5px] font-bold text-sub block truncate mt-0.5">
                {checkin} ➔ {checkout} ({num(nights, locale)} {lt(locale, { fa: 'شب', en: 'nights', ar: 'ليالٍ', zh: '晚', ru: 'ноч.' })}) • {num(adults, locale)} {lt(locale, { fa: 'بزرگسال', en: 'Adults', ar: 'بالغين', zh: '成人', ru: 'вزрослых' })}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-black text-brand-dark px-2.5 py-1 rounded-lg bg-surface border border-line shrink-0">
            {lt(locale, { fa: 'ویرایش', en: 'Edit', ar: 'تعديل', zh: '修改', ru: 'Изменить' })}
          </span>
        </button>
      </div>

      {/* ================= 2. DESKTOP SEARCH BAR (MD+) ================= */}
      <div className="hidden md:block border-b border-line bg-surface/95 backdrop-blur-md shadow-xs">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-4 space-y-3">
          <form onSubmit={handleSubmitForm} className="flex items-center gap-2.5 flex-wrap lg:flex-nowrap w-full">
            {/* Destination Input & Suggestions */}
            <div ref={destWrapperRef} className="relative flex-[1_1_270px] lg:flex-[2_1_0%] min-w-[230px]">
              <div className="flex items-center gap-2.5 min-h-[54px] px-3.5 border border-line rounded-xl bg-surface focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand/10 transition-all">
                <MapPin size={18} className="text-brand shrink-0" />
                <div className="min-w-0 w-full">
                  <label htmlFor="hotel-dest-input" className="block text-[10px] font-black text-sub cursor-pointer leading-tight mb-0.5">
                    {lt(locale, { fa: 'مقصد یا نام هتل', en: 'Destination or Hotel Name', ar: 'الوجهة أو اسم الفندق', zh: '目的地或酒店名称', ru: 'Направление или отель' })}
                  </label>
                  <input
                    id="hotel-dest-input"
                    value={query}
                    onChange={(e) => {
                      onQueryChange(e.target.value);
                      if (!destSuggestionsOpen) setDestSuggestionsOpen(true);
                    }}
                    onFocus={() => setDestSuggestionsOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setDestSuggestionsOpen(false);
                        onSearchSubmit();
                      }
                    }}
                    placeholder={lt(locale, { fa: 'کجا اقامت دارید؟ (مثال: مشهد، تهران...)', en: 'Where are you staying? (e.g. Mashhad...)', ar: 'أين تريد الإقامة؟ (مثال: مشهد...)', zh: '去哪里？（例如：德黑兰、马什哈德...）', ru: 'Куда вы едете? (напр. Мешхед...)' })}
                    className="w-full border-0 outline-0 text-[13px] font-black text-ink p-0 bg-transparent placeholder:text-sub/50"
                  />
                </div>
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      onQueryChange('');
                      setDestSuggestionsOpen(false);
                    }}
                    className="p-1 rounded-md text-sub hover:text-ink transition cursor-pointer"
                    aria-label="Clear destination"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>

              {/* Suggestions Dropdown */}
              {destSuggestionsOpen && (
                <div className="absolute top-[calc(100%+6px)] start-0 z-[120] w-full min-w-[300px] p-3 rounded-2xl bg-surface border border-line shadow-elev-3 animate-in fade-in-50 zoom-in-95 duration-150">
                  <div className="text-[11px] font-black text-sub px-2 pb-2 border-b border-line/60 flex items-center justify-between">
                    <span>{lt(locale, { fa: 'مقاصد پرطرفدار', en: 'Popular Destinations', ar: 'الوجهات الشائعة', zh: '热门目的地', ru: 'Популярные направления' })}</span>
                    <span className="text-[10px] font-bold text-brand">{lt(locale, { fa: 'انتخاب سریع', en: 'Quick select', ar: 'اختيار سريع', zh: '快捷选择', ru: 'Быستрый выбор' })}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-2">
                    {POPULAR_DESTINATIONS.map((dest) => (
                      <button
                        key={dest.nameFa}
                        type="button"
                        onClick={() => {
                          const chosen = locale === 'fa' ? dest.nameFa : dest.nameEn;
                          handleSelectDest(chosen, true);
                        }}
                        className={`flex items-center justify-between p-2 rounded-xl text-start transition cursor-pointer hover:bg-soft ${
                          query === (locale === 'fa' ? dest.nameFa : dest.nameEn) ? 'bg-brand/10 text-brand font-black' : 'text-ink font-bold'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Building2 size={13} className="text-sub shrink-0" />
                          <span className="text-xs truncate">{locale === 'fa' ? dest.nameFa : dest.nameEn}</span>
                        </div>
                        <span className="text-[10px] font-normal text-sub shrink-0">
                          {locale === 'fa' ? dest.tagFa : dest.tagEn}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Check-in Date Picker */}
            <div className="flex-[1_1_175px] min-w-[155px]">
              <JalaliDatePicker
                value={checkin}
                onChange={(d) => {
                  if (d) onCheckinChange?.(d);
                }}
                label={lt(locale, { fa: 'تاریخ ورود', en: 'Check-in', ar: 'تسجيل الوصول', zh: '入住日期', ru: 'Дата заезда' })}
                id="hotel-checkin-picker"
                className="!min-h-[54px] !rounded-xl !py-1.5 !px-3"
              />
            </div>

            {/* Interactive Check-out Date Picker */}
            <div className="flex-[1_1_175px] min-w-[155px]">
              <JalaliDatePicker
                value={checkout}
                onChange={(d) => {
                  if (d) onCheckoutChange?.(d);
                }}
                label={lt(locale, {
                  fa: `تاریخ خروج (${num(nights, locale)} شب)`,
                  en: `Check-out (${num(nights, locale)} n)`,
                  ar: `المغادرة (${num(nights, locale)} ليالٍ)`,
                  zh: `退房 (${num(nights, locale)}晚)`,
                  ru: `Выезд (${num(nights, locale)} н)`,
                })}
                id="hotel-checkout-picker"
                minDate={checkin ? new Date(checkin) : undefined}
                className="!min-h-[54px] !rounded-xl !py-1.5 !px-3"
              />
            </div>

            {/* Guests & Rooms Selector */}
            <div ref={pickerWrapperRef} className="relative flex-[1_1_190px] min-h-[54px] px-3.5 border border-line rounded-xl bg-surface hover:border-brand/50 transition-all flex items-center">
              <button
                type="button"
                onClick={() => setPickerOpen(!pickerOpen)}
                className="w-full h-full flex items-center justify-between gap-2 text-start cursor-pointer bg-transparent border-0 p-0"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Users size={18} className="text-brand shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-[10px] font-black text-sub leading-tight mb-0.5">
                      {lt(locale, { fa: 'مسافران و اتاق‌ها', en: 'Guests & Rooms', ar: 'الضيوف والغرف', zh: '人数与房间', ru: 'Гости и номера' })}
                    </span>
                    <span className="text-[12.5px] font-black text-ink block truncate">
                      {num(adults, locale)} {lt(locale, { fa: 'بزرگسال', en: 'Adults', ar: 'بالغين', zh: '成人', ru: 'взрослых' })}
                      {childrenCount > 0 ? ` · ${num(childrenCount, locale)} ${lt(locale, { fa: 'کودک', en: 'Child', ar: 'أطفال', zh: '儿童', ru: 'детей' })}` : ''}
                      {rooms > 1 ? ` · ${num(rooms, locale)} ${lt(locale, { fa: 'اتاق', en: 'Rooms', ar: 'غرف', zh: '间', ru: 'ном.' })}` : ''}
                    </span>
                  </div>
                </div>
                <ChevronDown size={14} className={`text-sub transition-transform duration-200 ${pickerOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Guest & Room Popover */}
              {pickerOpen && (
                <div className="absolute top-[calc(100%+6px)] end-0 z-[120] w-72 p-4 rounded-2xl bg-surface border border-line shadow-elev-3 space-y-3.5 animate-in fade-in-50 zoom-in-95 duration-150">
                  <div className="text-xs font-black text-ink pb-2 border-b border-line">
                    {lt(locale, { fa: 'تعداد مسافران و اتاق‌ها', en: 'Number of Guests & Rooms', ar: 'عدد الضيوف والغرف', zh: '选择人数与房间', ru: 'Количество гостей и номеров' })}
                  </div>

                  {/* Rooms */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-ink block">{lt(locale, { fa: 'اتاق', en: 'Rooms', ar: 'الغرف', zh: '房间数', ru: 'Номера' })}</span>
                      <span className="text-[10px] text-sub">{lt(locale, { fa: 'تعداد اتاق مورد نیاز', en: 'Number of rooms', ar: 'عدد الغرف المطلوبة', zh: '所需房间数量', ru: 'Количество номеров' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onRoomsChange?.(Math.max(1, rooms - 1))}
                        disabled={rooms <= 1}
                        className="w-10 h-10 rounded-xl bg-soft border border-line grid place-items-center disabled:opacity-30 hover:bg-line/50 active:scale-95 transition cursor-pointer"
                        aria-label={lt(locale, { fa: 'کاهش اتاق', en: 'Decrease rooms', ar: 'تقليل الغرف', zh: '减少房间', ru: 'Уменьшить' })}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-sm font-black font-mono">{num(rooms, locale)}</span>
                      <button
                        type="button"
                        onClick={() => onRoomsChange?.(Math.min(5, rooms + 1))}
                        disabled={rooms >= 5}
                        className="w-10 h-10 rounded-xl bg-soft border border-line grid place-items-center disabled:opacity-30 hover:bg-line/50 active:scale-95 transition cursor-pointer"
                        aria-label={lt(locale, { fa: 'افزایش اتاق', en: 'Increase rooms', ar: 'زيادة الغرف', zh: '增加房间', ru: 'Увеличить' })}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Adults */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-ink block">{lt(locale, { fa: 'بزرگسال', en: 'Adults', ar: 'البالغين', zh: '成人', ru: 'Взрослые' })}</span>
                      <span className="text-[10px] text-sub">{lt(locale, { fa: '۱۲ سال به بالا', en: '12+ years old', ar: '12 سنة فما فوق', zh: '12岁及以上', ru: '12 лет и старше' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onAdultsChange?.(Math.max(1, adults - 1))}
                        disabled={adults <= 1}
                        className="w-10 h-10 rounded-xl bg-soft border border-line grid place-items-center disabled:opacity-30 hover:bg-line/50 active:scale-95 transition cursor-pointer"
                        aria-label={lt(locale, { fa: 'کاهش بزرگسال', en: 'Decrease adults', ar: 'تقليل البالغين', zh: '减少成人', ru: 'Уменьшить' })}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-sm font-black font-mono">{num(adults, locale)}</span>
                      <button
                        type="button"
                        onClick={() => onAdultsChange?.(Math.min(9, adults + 1))}
                        disabled={adults >= 9}
                        className="w-10 h-10 rounded-xl bg-soft border border-line grid place-items-center disabled:opacity-30 hover:bg-line/50 active:scale-95 transition cursor-pointer"
                        aria-label={lt(locale, { fa: 'افزایش بزرگسال', en: 'Increase adults', ar: 'زيادة البالغين', zh: '增加成人', ru: 'Увеличить' })}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Children */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-ink block">{lt(locale, { fa: 'کودک', en: 'Children', ar: 'الأطفال', zh: '儿童', ru: 'Дети' })}</span>
                      <span className="text-[10px] text-sub">{lt(locale, { fa: 'تا ۱۲ سال', en: 'Up to 12 years', ar: 'حتى 12 سنة', zh: '0至12岁', ru: 'До 12 лет' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onChildrenCountChange?.(Math.max(0, childrenCount - 1))}
                        disabled={childrenCount <= 0}
                        className="w-10 h-10 rounded-xl bg-soft border border-line grid place-items-center disabled:opacity-30 hover:bg-line/50 active:scale-95 transition cursor-pointer"
                        aria-label={lt(locale, { fa: 'کاهش کودک', en: 'Decrease children', ar: 'تقليل الأطفال', zh: '减少儿童', ru: 'Уменьшить' })}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-sm font-black font-mono">{num(childrenCount, locale)}</span>
                      <button
                        type="button"
                        onClick={() => onChildrenCountChange?.(Math.min(6, childrenCount + 1))}
                        disabled={childrenCount >= 6}
                        className="w-10 h-10 rounded-xl bg-soft border border-line grid place-items-center disabled:opacity-30 hover:bg-line/50 active:scale-95 transition cursor-pointer"
                        aria-label={lt(locale, { fa: 'افزایش کودک', en: 'Increase children', ar: 'زيادة الأطفال', zh: '增加儿童', ru: 'Увеличить' })}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPickerOpen(false)}
                    className="w-full py-2 rounded-xl bg-brand text-surface text-xs font-black hover:bg-brand-dark transition cursor-pointer shadow-xs"
                  >
                    {lt(locale, { fa: 'تایید و اعمال', en: 'Apply Guests', ar: 'تأكيد', zh: '确定', ru: 'Применить' })}
                  </button>
                </div>
              )}
            </div>

            {/* Elegant Primary Search Button */}
            <button
              type="submit"
              className="flex-1 lg:flex-none min-h-[54px] px-7 inline-flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brand-dark text-surface font-black text-[13.5px] transition-all shadow-xs hover:shadow-elev-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shrink-0 cursor-pointer active:scale-[0.98]"
            >
              <Search size={18} strokeWidth={2.5} />
              <span>{lt(locale, { fa: 'جستجوی هتل‌ها', en: 'Search Hotels', ar: 'بحث عن الفنادق', zh: '搜索酒店', ru: 'Найти отели' })}</span>
            </button>
          </form>

          {/* Quick Destination Shortcut Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-[11px] font-black text-sub shrink-0 me-1">
              {lt(locale, { fa: 'شهرهای پرطرفدار:', en: 'Popular cities:', ar: 'مدن شائعة:', zh: '热门城市：', ru: 'Популярные:' })}
            </span>
            {POPULAR_DESTINATIONS.map((dest) => {
              const active = query === (locale === 'fa' ? dest.nameFa : dest.nameEn);
              return (
                <button
                  key={dest.nameFa}
                  type="button"
                  onClick={() => {
                    const chosen = locale === 'fa' ? dest.nameFa : dest.nameEn;
                    handleSelectDest(chosen, true);
                  }}
                  className={`px-3 py-1 rounded-lg whitespace-nowrap shrink-0 transition text-[11.5px] font-bold cursor-pointer ${
                    active
                      ? 'bg-brand text-surface shadow-2xs font-black'
                      : 'bg-soft text-ink hover:bg-line/70'
                  }`}
                >
                  {locale === 'fa' ? dest.nameFa : dest.nameEn}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modern, Clean Lightweight Country Context Strip */}
      <div className="border-b border-line/60 bg-soft/60 text-sub">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 flex items-center gap-2 flex-wrap py-2 text-[11px] font-bold">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-line/70 bg-surface shadow-2xs text-ink">
            {lt(locale, { fa: 'کشور مقصد:', en: 'Destination:', ar: 'الوجهة:', zh: '目的地：', ru: 'Направление:' })}{' '}
            {query.trim() ? (
              <b className="text-brand-dark">{c.flag} {locale === 'fa' ? c.nameFa : c.nameEn}</b>
            ) : (
              <b className="text-brand-dark">{lt(locale, { fa: 'همه مقاصد', en: 'All destinations', ar: 'جميع الوجهات', zh: '所有目的地', ru: 'Все направления' })}</b>
            )}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-line/70 bg-surface shadow-2xs text-ink">
            {lt(locale, { fa: 'ارز تسویه:', en: 'Currency:', ar: 'العملة:', zh: '币种：', ru: 'Валюта:' })} <b className="text-brand-dark" dir="ltr">{c.currency}</b>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-line/70 bg-surface shadow-2xs text-ink">
            {lt(locale, { fa: 'درگاه پرداخت:', en: 'Gateway:', ar: 'بوابة الدفع:', zh: '支付网关：', ru: 'Шлюз:' })} <b className="text-brand-dark">{locale === 'fa' ? c.gateway : c.gatewayEn}</b>
          </span>
          <Link
            href="/support"
            className="me-auto hidden md:inline-flex items-center gap-1 text-brand-dark font-black hover:underline"
          >
            {lt(locale, { fa: 'شرایط پرداخت و قوانین استرداد ←', en: 'Payment terms & refund policy →', ar: 'شروط الدفع والإلغاء ←', zh: '支付与取消条款 →', ru: 'Условия оплаты и отмены →' })}
          </Link>
        </div>
      </div>

      {/* Result title header */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <div className="pt-5 flex justify-between items-end gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-sub mb-1">
              <Link href="/hotels" className="hover:underline text-brand">
                {lt(locale, { fa: 'رزرو هتل', en: 'Hotels', ar: 'حجز الفنادق', zh: '预订酒店', ru: 'Бронирование отелей' })}
              </Link>
              <span>/</span>
              <span>{query || lt(locale, { fa: 'همه مقاصد', en: 'All Destinations', ar: 'جميع الوجهات', zh: '所有目的地', ru: 'Все направления' })}</span>
            </div>
            <h1 className="m-0 text-[24px] md:text-[30px] leading-tight font-black text-brand-dark tracking-tight">
              {query
                ? lt(locale, { fa: `هتل‌ها و اقامتگاه‌های ${query}`, en: `Hotels & Stays in ${query}`, ar: `فنادق وإقامات في ${query}`, zh: `${query}的酒店与住宿`, ru: `Отели и проживание: ${query}` })
                : lt(locale, { fa: 'هتل‌ها و اقامتگاه‌های منتخب', en: 'Featured Hotels & Stays', ar: 'فنادق وإقامات مختارة', zh: '精选酒店与住宿', ru: 'Избранные отели' })}
            </h1>
          </div>
          <div className="pb-1">
            <span className="px-3 py-1.5 rounded-xl bg-surface border border-line text-xs font-black text-ink shadow-xs whitespace-nowrap">
              {num(resultsCount, locale)}{' '}
              {lt(locale, { fa: 'اقامتگاه یافت شد', en: 'stays found', ar: 'إقامة متاحة', zh: '家住宿可用', ru: 'вариантов найдено' })}
            </span>
          </div>
        </div>
      </div>

      {/* ================= MOBILE FULL EDIT BOTTOM SHEET ================= */}
      {mobileEditOpen && (
        <div className="md:hidden fixed inset-0 z-[160] flex items-end justify-center bg-deep/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full bg-surface rounded-t-3xl p-5 border-t border-line shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-5 duration-200 space-y-4">
            <div className="w-10 h-1 rounded-full bg-line mx-auto mb-1" />

            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-sm font-black text-ink">{lt(locale, { fa: 'ویرایش جستجوی هتل‌ها', en: 'Edit Hotel Search', ar: 'تعديل البحث عن الفنادق', zh: '修改酒店搜索', ru: 'Изменить поиск отелей' })}</h3>
              <button
                type="button"
                onClick={() => setMobileEditOpen(false)}
                className="w-7 h-7 rounded-lg bg-soft grid place-items-center text-sub hover:text-ink cursor-pointer"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            {/* Mobile Destination */}
            <div className="space-y-1">
              <label htmlFor="hotel-dest-input-mobile" className="block text-xs font-bold text-sub">
                {lt(locale, { fa: 'مقصد یا نام هتل', en: 'Destination / Hotel', ar: 'الوجهة / الفندق', zh: '目的地或酒店', ru: 'Направление / Отель' })}
              </label>
              <div className="flex items-center gap-2.5 p-3 rounded-xl border border-line bg-soft focus-within:border-brand">
                <MapPin size={17} className="text-brand shrink-0" />
                <input
                  id="hotel-dest-input-mobile"
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  placeholder={lt(locale, { fa: 'کجا اقامت دارید؟', en: 'Where to stay?', ar: 'أين تريد الإقامة؟', zh: '去哪里？', ru: 'Куда?' })}
                  className="w-full bg-transparent border-0 outline-0 text-xs font-black text-ink"
                />
              </div>
            </div>

            {/* Mobile Dates */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <JalaliDatePicker
                  value={checkin}
                  onChange={(d) => {
                    if (d) onCheckinChange?.(d);
                  }}
                  label={lt(locale, { fa: 'تاریخ ورود', en: 'Check-in', ar: 'تسجيل الوصول', zh: '入住日期', ru: 'Дата заезда' })}
                  id="hotel-checkin-mobile"
                />
              </div>
              <div>
                <JalaliDatePicker
                  value={checkout}
                  onChange={(d) => {
                    if (d) onCheckoutChange?.(d);
                  }}
                  label={lt(locale, { fa: 'تاریخ خروج', en: 'Check-out', ar: 'المغادرة', zh: '退房', ru: 'Выезд' })}
                  id="hotel-checkout-mobile"
                  minDate={checkin ? new Date(checkin) : undefined}
                />
              </div>
            </div>

            {/* Mobile Search Button */}
            <button
              type="button"
              onClick={() => {
                setMobileEditOpen(false);
                onSearchSubmit();
              }}
              className="w-full py-3.5 rounded-xl bg-brand text-surface text-sm font-black flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
            >
              <Search size={16} />
              <span>{lt(locale, { fa: 'جستجوی مجدد هتل‌ها', en: 'Update Search', ar: 'تحديث البحث', zh: '更新搜索', ru: 'Обновить' })}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
