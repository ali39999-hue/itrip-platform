'use client';

import React from 'react';
import { Star, Check } from 'lucide-react';
import { HOTELS } from '@/lib/data';
import { HotelPriceHistogram } from './HotelPriceHistogram';
import type { HotelFilterSidebarProps } from './types';

export function HotelFilterSidebar({
  maxPrice,
  onMaxPriceChange,
  priceBuckets,
  stars,
  onToggleStar,
  minScore,
  onMinScoreChange,
  freeCancel,
  onToggleFreeCancel,
  onResetAll,
}: HotelFilterSidebarProps) {
  return (
    <aside className="sticky top-[180px] hidden lg:block max-h-[calc(100vh-200px)] overflow-y-auto p-4 border border-line rounded-2xl bg-surface shadow-elev-1">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-line">
        <h2 className="text-sm font-black text-ink m-0">فیلترها</h2>
        <button
          type="button"
          onClick={onResetAll}
          className="text-[11.5px] font-extrabold text-brand-dark bg-transparent border-0 hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
        >
          پاک کردن همه
        </button>
      </div>

      {/* Price per night */}
      <HotelPriceHistogram
        maxPrice={maxPrice}
        onMaxPriceChange={onMaxPriceChange}
        priceBuckets={priceBuckets}
      />

      {/* Stars */}
      <div className="py-3.5 border-b border-line">
        <h3 className="m-0 mb-2.5 text-[12.5px] font-black text-ink">ستاره اقامتگاه</h3>
        {[5, 4].map((s) => (
          <label
            key={s}
            className="flex items-center gap-2.5 py-1 text-[12.5px] font-bold cursor-pointer group select-none"
          >
            <span
              className={`w-5 h-5 rounded-md grid place-items-center border transition-colors ${
                stars.has(s)
                  ? 'bg-brand border-brand'
                  : 'border-line group-hover:border-brand'
              }`}
            >
              {stars.has(s) && <Check size={12} className="text-surface" strokeWidth={3} />}
            </span>
            <input
              type="checkbox"
              className="sr-only"
              checked={stars.has(s)}
              onChange={() => onToggleStar(s)}
            />
            <span className="inline-flex gap-px">
              {Array.from({ length: s }).map((_, i) => (
                <Star key={i} size={12} className="fill-gold text-gold" />
              ))}
            </span>
            <span className="me-auto text-[11px] font-bold text-sub">
              {HOTELS.filter((h) => h.stars === s).length.toLocaleString('fa-IR')}
            </span>
          </label>
        ))}
      </div>

      {/* Guest score */}
      <div className="py-3.5 border-b border-line">
        <h3 className="m-0 mb-2.5 text-[12.5px] font-black text-ink">امتیاز مهمانان</h3>
        {[9, 8, 0].map((v) => (
          <label
            key={v}
            className="flex items-center gap-2.5 py-1 text-[12.5px] font-bold cursor-pointer select-none"
          >
            <input
              type="radio"
              name="sidebar-score"
              checked={minScore === v}
              onChange={() => onMinScoreChange(v)}
              className="accent-brand w-[17px] h-[17px] cursor-pointer"
            />
            <span>
              {v === 9
                ? 'فوق‌العاده — ۹ به بالا'
                : v === 8
                ? 'خیلی خوب — ۸ به بالا'
                : 'همه امتیازها'}
            </span>
          </label>
        ))}
      </div>

      {/* Free cancellation */}
      <div className="pt-3.5">
        <label className="flex items-center gap-2.5 py-1 text-[12.5px] font-bold cursor-pointer select-none">
          <input
            type="checkbox"
            checked={freeCancel}
            onChange={onToggleFreeCancel}
            className="accent-brand w-[17px] h-[17px] cursor-pointer"
          />
          <span>کنسلی رایگان</span>
          <span className="me-auto text-[11px] font-bold text-sub">
            {HOTELS.filter((h) => h.freeCancellation).length.toLocaleString('fa-IR')}
          </span>
        </label>
      </div>
    </aside>
  );
}
