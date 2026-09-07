'use client';

import React, { useState } from 'react';
import { MapPin, Star, Users, Search, Minus, Plus } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES } from '@/lib/countries';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';
import { dualDate } from '@/lib/jalali';
import type { HotelSearchHeaderProps } from './types';

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
}: HotelSearchHeaderProps) {
  const locale = useLocale();
  const { country } = useCountryStore();
  const c = COUNTRIES[country] || COUNTRIES['turkey'];
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mobileEditOpen, setMobileEditOpen] = useState(false);

  return (
    <>
      {/* ================= 1. MOBILE COMPACT AIRBNB-STYLE SEARCH PILL (< MD) ================= */}
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
                {locale === 'fa' || locale === 'ar'
                  ? `${dualDate(checkin).j || checkin} ➔ ${dualDate(checkout).j || checkout}`
                  : `${checkin} ➔ ${checkout}`} • {num(adults, locale)} {lt(locale, { fa: 'بزرگسال', en: 'Adults', ar: 'بالغين', zh: '成人', ru: 'взрослых' })}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-black text-brand-dark px-2 py-1 rounded-lg bg-surface border border-line shrink-0">
            {lt(locale, { fa: 'ویرایش', en: 'Edit', ar: 'تعديل', zh: '修改', ru: 'Изменить' })}
          </span>
        </button>
      </div>

      {/* ================= 2. DESKTOP SEARCH BAR (MD+) ================= */}
      <div className="hidden md:block border-b border-line glass-bar shadow-[0_8px_22px_rgba(5,63,62,.05)]">
        <div className="max-w-[1280px] mx-auto px-4 md:px-10 flex items-center gap-2 py-3 flex-wrap">
          <form
            className="flex items-center gap-2.5 flex-[1_1_100%] md:flex-[2_1_0%] min-w-0 min-h-[52px] px-3 border border-line rounded-xl bg-surface focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand/10 transition-all"
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit();
            }}
          >
            <MapPin size={19} className="text-brand-dark shrink-0" />
            <div className="min-w-0 w-full">
              <label htmlFor="hotel-dest-input" className="block text-[10px] font-extrabold text-sub cursor-pointer">
                {lt(locale, { fa: 'مقصد', en: 'Destination', ar: 'الوجهة', zh: '目的地', ru: 'Направление' })}
              </label>
              <input
                id="hotel-dest-input"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder={lt(locale, { fa: 'نام شهر یا هتل...', en: 'City or hotel name...', ar: 'اسم المدينة أو الفندق...', zh: '城市或酒店名称...', ru: 'Город или отель...' })}
                className="w-full border-0 outline-0 text-[13px] font-extrabold text-ink p-0 bg-transparent"
              />
            </div>
          </form>

          <div className="flex items-center gap-2.5 flex-1 min-h-[52px] px-3 border border-line rounded-xl bg-surface">
            <Star size={18} className="text-brand-dark shrink-0" />
            <div className="w-full">
              <label htmlFor="hotel-date-input" className="block text-[10px] font-extrabold text-sub">
                {lt(locale, { fa: 'ورود', en: 'Check-in', ar: 'تسجيل الوصول', zh: '入住', ru: 'Заезд' })}
              </label>
              <input
                id="hotel-date-input"
                type="date"
                value={checkin}
                onChange={(e) => onCheckinChange?.(e.target.value)}
                dir="ltr"
                className="w-full border-0 outline-0 text-[13px] font-extrabold p-0 bg-transparent text-ink"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-1 min-h-[52px] px-3 border border-line rounded-xl bg-surface">
            <Star size={18} className="text-brand-dark shrink-0" />
            <div className="w-full">
              <label htmlFor="hotel-checkout-input" className="block text-[10px] font-extrabold text-sub">
                {lt(locale, { fa: 'خروج', en: 'Check-out', ar: 'تسجيل المغادرة', zh: '退房', ru: 'Выезд' })}
              </label>
              <input
                id="hotel-checkout-input"
                type="date"
                value={checkout}
                onChange={(e) => onCheckoutChange?.(e.target.value)}
                dir="ltr"
                className="w-full border-0 outline-0 text-[13px] font-extrabold p-0 bg-transparent text-ink"
              />
            </div>
          </div>

          <div className="relative flex items-center gap-2.5 flex-1 min-h-[52px] px-3 border border-line rounded-xl bg-surface">
            <Users size={18} className="text-brand-dark shrink-0" />
            <div className="w-full">
              <span className="block text-[10px] font-extrabold text-sub">
                {num(adults, locale)} {lt(locale, { fa: 'بزرگسال', en: 'Adults', ar: 'بالغين', zh: '成人', ru: 'взрослых' })}
                {childrenCount > 0 ? ` · ${num(childrenCount, locale)} ${lt(locale, { fa: 'کودک', en: 'Child', ar: 'أطفال', zh: '儿童', ru: 'детей' })}` : ''}
              </span>
              <button
                type="button"
                onClick={() => setPickerOpen(!pickerOpen)}
                className="text-[13px] font-extrabold text-ink cursor-pointer hover:text-brand-dark transition-colors text-start p-0 bg-transparent border-0"
              >
                {lt(locale, { fa: 'تغییر مسافران', en: 'Change Guests', ar: 'تغيير الضيوف', zh: '修改人数', ru: 'Изменить гостей' })}
              </button>
            </div>

            {pickerOpen && (
              <div className="absolute top-[calc(100%+8px)] end-0 z-[100] w-64 p-3.5 rounded-2xl bg-surface border border-line shadow-elev-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">
                    {lt(locale, { fa: 'بزرگسال', en: 'Adults', ar: 'البالغين', zh: '成人', ru: 'Взрослые' })}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onAdultsChange?.(Math.max(1, adults - 1))}
                      disabled={adults <= 1}
                      className="w-7 h-7 rounded-lg bg-soft border border-line grid place-items-center disabled:opacity-40"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-5 text-center text-xs font-bold font-mono">{adults}</span>
                    <button
                      type="button"
                      onClick={() => onAdultsChange?.(Math.min(9, adults + 1))}
                      disabled={adults >= 9}
                      className="w-7 h-7 rounded-lg bg-soft border border-line grid place-items-center disabled:opacity-40"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">
                    {lt(locale, { fa: 'کودک', en: 'Children', ar: 'الأطفال', zh: '儿童', ru: 'Дети' })}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onChildrenCountChange?.(Math.max(0, childrenCount - 1))}
                      disabled={childrenCount <= 0}
                      className="w-7 h-7 rounded-lg bg-soft border border-line grid place-items-center disabled:opacity-40"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-5 text-center text-xs font-bold font-mono">{childrenCount}</span>
                    <button
                      type="button"
                      onClick={() => onChildrenCountChange?.(Math.min(6, childrenCount + 1))}
                      disabled={childrenCount >= 6}
                      className="w-7 h-7 rounded-lg bg-soft border border-line grid place-items-center disabled:opacity-40"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="w-full py-1.5 rounded-lg bg-brand text-surface text-xs font-bold hover:bg-brand-dark"
                >
                  {lt(locale, { fa: 'تایید', en: 'Done', ar: 'تأكيد', zh: '确定', ru: 'Готово' })}
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onSearchSubmit}
            className="flex-1 md:flex-none min-h-[52px] px-5 inline-flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brand-2 text-surface font-black text-[13px] transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Search size={18} /> {lt(locale, { fa: 'جستجوی دوباره', en: 'Search again', ar: 'ابحث مرة أخرى', zh: '重新搜索', ru: 'Искать снова' })}
          </button>
        </div>
      </div>

      {/* Country context strip */}
      <div className="border-b border-line bg-gradient-to-b from-deep to-[#04302f] text-[#cfe8e5]">
        <div className="max-w-[1280px] mx-auto px-4 md:px-10 flex items-center gap-2.5 flex-wrap py-2.5 text-[11.5px] font-bold">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-surface/15 bg-surface/5">
            {lt(locale, { fa: 'کشور مقصد:', en: 'Destination country:', ar: 'بلد الوجهة:', zh: '目的地国家：', ru: 'Страна назначения:' })} <b className="text-mint-bright">{c.flag} {locale === 'fa' ? c.nameFa : c.nameEn}</b>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-surface/15 bg-surface/5">
            {lt(locale, { fa: 'ارز تسویه:', en: 'Settlement currency:', ar: 'عملة التسوية:', zh: '结算货币：', ru: 'Валюта расчётов:' })} <b className="text-mint-bright" dir="ltr">{c.currency}</b>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-surface/15 bg-surface/5">
            {lt(locale, { fa: 'درگاه پرداخت:', en: 'Payment gateway:', ar: 'بوابة الدفع:', zh: '支付网关：', ru: 'Платёжный шлюз:' })} <b className="text-mint-bright">{locale === 'fa' ? c.gateway : c.gatewayEn}</b>
          </span>
          <Link
            href="/support"
            className="me-auto hidden md:inline-flex items-center gap-1 text-mint-bright font-extrabold hover:underline"
          >
            {lt(locale, { fa: 'شرایط پرداخت و لغو این کشور ←', en: 'Payment & cancellation terms for this country →', ar: 'شروط الدفع والإلغاء لهذا البلد ←', zh: '该国家/地区的支付与取消条款 →', ru: 'Условия оплаты и отмены для этой страны →' })}
          </Link>
        </div>
      </div>

      {/* Result title header */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-10">
        <div className="pt-6 flex justify-between items-end gap-4 mb-5">
          <h1 className="m-0 text-[26px] md:text-[32px] leading-tight font-black text-brand-dark tracking-tight">
            {query
              ? lt(locale, { fa: `هتل‌های ${query}`, en: `Hotels in ${query}`, ar: `فنادق في ${query}`, zh: `${query}的酒店`, ru: `Отели: ${query}` })
              : lt(locale, { fa: 'هتل‌های همه مقاصد', en: 'Hotels in all destinations', ar: 'فنادق في جميع الوجهات', zh: '所有目的地的酒店', ru: 'Отели всех направлений' })}
          </h1>
          <span className="text-[13px] font-bold text-sub whitespace-nowrap pb-1">
            {num(resultsCount, locale)}{' '}
            {lt(locale, { fa: 'اقامتگاه یافت شد', en: 'stays found', ar: 'إقامة تم العثور عليها', zh: '家住宿已找到', ru: 'вариантов найдено' })}
          </span>
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
                className="text-xs font-bold text-sub px-2.5 py-1 rounded-lg bg-soft"
              >
                {lt(locale, { fa: 'بستن', en: 'Close', ar: 'إغلاق', zh: '关闭', ru: 'Закрыть' })}
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'نام شهر یا هتل مقصد', en: 'Destination City or Hotel', ar: 'اسم المدينة أو الفندق', zh: '目的地城市或酒店', ru: 'Город или отель назначения' })}</label>
                <div className="flex items-center gap-2 p-3 bg-soft rounded-xl border border-line">
                  <MapPin size={16} className="text-brand-dark" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    placeholder={lt(locale, { fa: 'مثال: استانبول، مشهد، دبی...', en: 'e.g. Istanbul, Mashhad, Dubai...', ar: 'مثال: إسطنبول، مشهد، دبي...', zh: '例：伊斯坦布尔、马什哈德、迪拜...', ru: 'Напр. Стамбул, Мешхед, Дубай...' })}
                    className="w-full bg-transparent border-0 outline-none text-xs font-bold text-ink"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'تاریخ ورود', en: 'Check-in Date', ar: 'تاريخ الوصول', zh: '入住日期', ru: 'Дата заезда' })}</label>
                  <input
                    type="date"
                    value={checkin}
                    onChange={(e) => onCheckinChange?.(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-line bg-soft text-xs font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'تاریخ خروج', en: 'Check-out Date', ar: 'تاريخ المغادرة', zh: '退房日期', ru: 'Дата выезда' })}</label>
                  <input
                    type="date"
                    value={checkout}
                    onChange={(e) => onCheckoutChange?.(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-line bg-soft text-xs font-bold font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-soft rounded-xl border border-line space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-ink">{lt(locale, { fa: 'تعداد بزرگسال', en: 'Adults', ar: 'البالغين', zh: '成人人数', ru: 'Взрослые' })}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onAdultsChange?.(Math.max(1, adults - 1))}
                      disabled={adults <= 1}
                      className="w-8 h-8 rounded-lg bg-surface border border-line grid place-items-center"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-5 text-center font-bold font-mono text-xs">{adults}</span>
                    <button
                      type="button"
                      onClick={() => onAdultsChange?.(Math.min(9, adults + 1))}
                      disabled={adults >= 9}
                      className="w-8 h-8 rounded-lg bg-surface border border-line grid place-items-center"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-line/60">
                  <span className="text-xs font-bold text-ink">{lt(locale, { fa: 'تعداد کودک', en: 'Children', ar: 'الأطفال', zh: '儿童人数', ru: 'Дети' })}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onChildrenCountChange?.(Math.max(0, childrenCount - 1))}
                      disabled={childrenCount <= 0}
                      className="w-8 h-8 rounded-lg bg-surface border border-line grid place-items-center"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-5 text-center font-bold font-mono text-xs">{childrenCount}</span>
                    <button
                      type="button"
                      onClick={() => onChildrenCountChange?.(Math.min(6, childrenCount + 1))}
                      disabled={childrenCount >= 6}
                      className="w-8 h-8 rounded-lg bg-surface border border-line grid place-items-center"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMobileEditOpen(false);
                  onSearchSubmit();
                }}
                className="w-full h-12 rounded-2xl bg-action hover:bg-action-hover text-ink font-black text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-95"
              >
                <Search size={16} />
                <span>{lt(locale, { fa: 'اعمال و مشاهده هتل‌ها', en: 'Apply & View Hotels', ar: 'تطبيق وعرض الفنادق', zh: '应用并查看酒店', ru: 'Применить и показать отели' })}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
