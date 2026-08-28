'use client';

import React from 'react';
import { ArrowDownUp, Map as MapIcon, SlidersHorizontal } from 'lucide-react';
import type { HotelSearchToolbarProps, SortKey } from './types';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'rec', label: 'پیشنهاد iTrip' },
  { key: 'cheap', label: 'ارزان‌ترین' },
  { key: 'score', label: 'بالاترین امتیاز' },
  { key: 'stars', label: 'ستاره بیشتر' },
];

export function HotelSearchToolbar({
  sort,
  onSortChange,
  showMap,
  onToggleMap,
  onOpenMobileFilters,
  activeFiltersCount,
}: HotelSearchToolbarProps) {
  return (
    <div className="sticky top-[128px] z-40 flex items-center gap-2 my-3.5 p-2 border border-line rounded-[14px] bg-surface/95 backdrop-blur overflow-x-auto scrollbar-none shadow-xs">
      <span className="hidden sm:inline-flex items-center gap-1.5 px-1 text-[11.5px] font-extrabold text-sub shrink-0">
        <ArrowDownUp size={14} /> مرتب‌سازی
      </span>

      {SORT_OPTIONS.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSortChange(item.key)}
          className={`shrink-0 min-h-[34px] px-3 rounded-full border text-[12px] font-extrabold whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            sort === item.key
              ? 'border-brand text-surface bg-brand shadow-xs'
              : 'border-line text-sub bg-surface hover:border-mint-bright hover:text-ink'
          }`}
        >
          {item.label}
        </button>
      ))}

      <button
        type="button"
        onClick={onToggleMap}
        aria-pressed={showMap}
        className={`me-auto shrink-0 min-h-[34px] px-3.5 inline-flex items-center gap-1.5 rounded-full border text-[12px] font-extrabold whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
          showMap
            ? 'border-brand text-surface bg-brand shadow-xs'
            : 'border-line text-sub bg-surface hover:border-mint-bright hover:text-ink'
        }`}
      >
        <MapIcon size={14} /> {showMap ? 'پنهان کردن نقشه' : 'نمایش نقشه'}
      </button>

      <button
        type="button"
        onClick={onOpenMobileFilters}
        className="lg:hidden shrink-0 min-h-[34px] px-3.5 inline-flex items-center gap-1.5 rounded-full border border-line text-sub bg-surface text-[12px] font-extrabold hover:border-mint-bright transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <SlidersHorizontal size={14} /> فیلترها
        {activeFiltersCount > 0 && (
          <span className="w-5 h-5 grid place-items-center rounded-full bg-brand text-surface text-[10px] font-black">
            {activeFiltersCount.toLocaleString('fa-IR')}
          </span>
        )}
      </button>
    </div>
  );
}
