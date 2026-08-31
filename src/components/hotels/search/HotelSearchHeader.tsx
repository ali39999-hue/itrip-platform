'use client';

import React from 'react';
import { MapPin, Star, Users, Search } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES } from '@/lib/countries';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';
import type { HotelSearchHeaderProps } from './types';

export function HotelSearchHeader({
  query,
  onQueryChange,
  onSearchSubmit,
  resultsCount,
}: HotelSearchHeaderProps) {
  const locale = useLocale();
  const { country } = useCountryStore();
  const c = COUNTRIES[country] || COUNTRIES['turkey'];

  return (
    <>
      {/* Search bar */}
      <div className="border-b border-line glass-bar shadow-[0_8px_22px_rgba(5,63,62,.05)]">
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
                defaultValue="2026-09-22"
                dir="ltr"
                className="w-full border-0 outline-0 text-[13px] font-extrabold p-0 bg-transparent text-ink"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-1 min-h-[52px] px-3 border border-line rounded-xl bg-surface">
            <Users size={18} className="text-brand-dark shrink-0" />
            <div className="w-full">
              <span className="block text-[10px] font-extrabold text-sub">
                {num(2, locale)} {lt(locale, { fa: 'اتاق', en: 'Rooms', ar: 'غرف', zh: '间客房', ru: 'номера' })}
                {' · '}
                {num(3, locale)} {lt(locale, { fa: 'مسافر', en: 'Guests', ar: 'مسافرين', zh: '位客人', ru: 'гостей' })}
              </span>
              <span className="text-[13px] font-extrabold text-ink cursor-pointer hover:text-brand-dark transition-colors">
                {lt(locale, { fa: 'ویرایش', en: 'Edit', ar: 'تعديل', zh: '修改', ru: 'Изменить' })}
              </span>
            </div>
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
          <span className="me-auto hidden md:inline-flex items-center gap-1 text-mint-bright font-extrabold cursor-pointer hover:underline">
            {lt(locale, { fa: 'شرایط پرداخت و لغو این کشور ←', en: 'Payment & cancellation terms for this country →', ar: 'شروط الدفع والإلغاء لهذا البلد ←', zh: '该国家/地区的支付与取消条款 →', ru: 'Условия оплаты и отмены для этой страны →' })}
          </span>
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
    </>
  );
}
