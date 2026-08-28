'use client';

import React from 'react';
import { Building2, RotateCcw } from 'lucide-react';
import type { HotelEmptyStateProps } from './types';

export function HotelEmptyState({ onResetFilters }: HotelEmptyStateProps) {
  return (
    <div className="text-center py-16 px-4 bg-surface border border-line rounded-3xl p-8 shadow-elev-1">
      <div className="w-16 h-16 rounded-2xl bg-soft text-sub grid place-items-center mx-auto mb-4">
        <Building2 size={32} />
      </div>
      <h3 className="text-lg font-bold text-ink mb-1.5">با این فیلترها اقامتگاهی یافت نشد</h3>
      <p className="text-xs text-sub max-w-sm mx-auto mb-6 leading-relaxed">
        محدوده قیمت یا ستاره‌های انتخابی را کمی بازتر کنید تا نتایج بیشتری نمایش داده شود.
      </p>
      <button
        type="button"
        onClick={onResetFilters}
        className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-brand text-surface font-bold text-xs hover:bg-brand-dark transition"
      >
        <RotateCcw size={14} />
        <span>پاک کردن فیلترها</span>
      </button>
    </div>
  );
}
