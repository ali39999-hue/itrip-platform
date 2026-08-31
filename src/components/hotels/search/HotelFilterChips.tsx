'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import { X, RotateCcw } from 'lucide-react';
import { lt } from '@/lib/lt';
import type { HotelFilterChipsProps } from './types';

export function HotelFilterChips({ chips, onResetAll }: HotelFilterChipsProps) {
  const locale = useLocale();

  if (!chips || chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 animate-in fade-in duration-200">
      <span className="text-xs text-sub font-medium">{lt(locale, { fa: 'فیلترهای فعال:', en: 'Active filters:', ar: 'الفلاتر النشطة:', zh: '当前筛选：', ru: 'Активные фильтры:' })}</span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint text-brand-dark text-xs font-bold border border-brand/20"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={chip.clear}
            className="hover:text-destructive transition"
            aria-label={`${lt(locale, { fa: 'حذف فیلتر', en: 'Remove filter', ar: 'إزالة الفلتر', zh: '移除筛选', ru: 'Удалить фильтр' })} ${chip.label}`}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onResetAll}
        className="text-xs text-sub hover:text-destructive font-medium flex items-center gap-1 ms-1 transition"
      >
        <RotateCcw size={12} />
        <span>{lt(locale, { fa: 'پاک کردن همه', en: 'Clear all', ar: 'مسح الكل', zh: '清除全部', ru: 'Сбросить всё' })}</span>
      </button>
    </div>
  );
}
