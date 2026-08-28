'use client';

import React from 'react';
import { MapPin, Star, Users, Search } from 'lucide-react';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES } from '@/lib/countries';
import type { HotelSearchHeaderProps } from './types';

export function HotelSearchHeader({
  query,
  onQueryChange,
  onSearchSubmit,
  resultsCount,
}: HotelSearchHeaderProps) {
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
                مقصد
              </label>
              <input
                id="hotel-dest-input"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="نام شهر یا هتل..."
                className="w-full border-0 outline-0 text-[13px] font-extrabold text-ink p-0 bg-transparent"
              />
            </div>
          </form>

          <div className="flex items-center gap-2.5 flex-1 min-h-[52px] px-3 border border-line rounded-xl bg-surface">
            <Star size={18} className="text-brand-dark shrink-0" />
            <div className="w-full">
              <label htmlFor="hotel-date-input" className="block text-[10px] font-extrabold text-sub">
                ورود
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
              <span className="block text-[10px] font-extrabold text-sub">۲ اتاق · ۳ مسافر</span>
              <span className="text-[13px] font-extrabold text-ink cursor-pointer hover:text-brand-dark transition-colors">
                ویرایش
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onSearchSubmit}
            className="flex-1 md:flex-none min-h-[52px] px-5 inline-flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brand-2 text-surface font-black text-[13px] transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Search size={18} /> جستجوی دوباره
          </button>
        </div>
      </div>

      {/* Country context strip */}
      <div className="border-b border-line bg-gradient-to-b from-deep to-[#04302f] text-[#cfe8e5]">
        <div className="max-w-[1280px] mx-auto px-4 md:px-10 flex items-center gap-2.5 flex-wrap py-2.5 text-[11.5px] font-bold">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-surface/15 bg-surface/5">
            کشور مقصد: <b className="text-mint-bright">{c.flag} {c.nameFa}</b>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-surface/15 bg-surface/5">
            ارز تسویه: <b className="text-mint-bright" dir="ltr">{c.currency}</b>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-surface/15 bg-surface/5">
            درگاه پرداخت: <b className="text-mint-bright">{c.gateway}</b>
          </span>
          <span className="me-auto hidden md:inline-flex items-center gap-1 text-mint-bright font-extrabold cursor-pointer hover:underline">
            شرایط پرداخت و لغو این کشور ←
          </span>
        </div>
      </div>

      {/* Result title header */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-10">
        <div className="pt-6 flex justify-between items-end gap-4 mb-5">
          <h1 className="m-0 text-[26px] md:text-[32px] leading-tight font-black text-brand-dark tracking-tight">
            هتل‌های {query || 'همه مقاصد'}
          </h1>
          <span className="text-[13px] font-bold text-sub whitespace-nowrap pb-1">
            {resultsCount.toLocaleString('fa-IR')} اقامتگاه یافت شد
          </span>
        </div>
      </div>
    </>
  );
}
