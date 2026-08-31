'use client';

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowDownUp, Map as MapIcon, SlidersHorizontal } from 'lucide-react';
import { lt } from '@/lib/lt';
import type { HotelSearchToolbarProps, SortKey } from './types';

export function HotelSearchToolbar({
  sort,
  onSortChange,
  showMap,
  onToggleMap,
  onOpenMobileFilters,
  activeFiltersCount,
}: HotelSearchToolbarProps) {
  const locale = useLocale();
  const t = useTranslations('HotelsSearch');

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'rec', label: t('sortRec') },
    { key: 'cheap', label: t('sortCheap') },
    { key: 'score', label: t('sortScore') },
    { key: 'stars', label: t('sortStars') },
  ];

  return (
    <div className="flex items-center gap-2 my-4 p-2.5 border border-line rounded-2xl bg-surface shadow-xs overflow-x-auto scrollbar-none">
      <span className="hidden sm:inline-flex items-center gap-1.5 px-2 text-[12px] font-black text-sub shrink-0">
        <ArrowDownUp size={14} className="text-brand-dark" /> {lt(locale, { fa: 'مرتب‌سازی:', en: 'Sort:', ar: 'الترتيب:', zh: '排序：', ru: 'Сортировка:' })}
      </span>

      {SORT_OPTIONS.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSortChange(item.key)}
          className={`shrink-0 min-h-[36px] px-3.5 rounded-xl border text-[12px] font-extrabold whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
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
        className={`me-auto shrink-0 min-h-[36px] px-4 inline-flex items-center gap-1.5 rounded-xl border text-[12px] font-extrabold whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
          showMap
            ? 'border-brand text-surface bg-brand shadow-xs'
            : 'border-line text-sub bg-surface hover:border-mint-bright hover:text-ink'
        }`}
      >
        <MapIcon size={14} />{' '}
        {showMap
          ? lt(locale, { fa: 'پنهان کردن نقشه', en: 'Hide map', ar: 'إخفاء الخريطة', zh: '隐藏地图', ru: 'Скрыть карту' })
          : lt(locale, { fa: 'نمایش نقشه', en: 'Show map', ar: 'عرض الخريطة', zh: '显示地图', ru: 'Показать карту' })}
      </button>

      <button
        type="button"
        onClick={onOpenMobileFilters}
        className="lg:hidden shrink-0 min-h-[36px] px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-line text-sub bg-surface text-[12px] font-extrabold hover:border-mint-bright transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <SlidersHorizontal size={14} /> {lt(locale, { fa: 'فیلترها', en: 'Filters', ar: 'الفلاتر', zh: '筛选', ru: 'Фильтры' })}
        {activeFiltersCount > 0 && (
          <span className="w-5 h-5 rounded-full bg-brand text-surface text-[10px] font-black grid place-items-center">
            {activeFiltersCount}
          </span>
        )}
      </button>
    </div>
  );
}
