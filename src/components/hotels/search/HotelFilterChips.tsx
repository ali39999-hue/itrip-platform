'use client';

import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import type { HotelFilterChipsProps } from './types';

export function HotelFilterChips({ chips, onResetAll }: HotelFilterChipsProps) {
  if (!chips || chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 animate-in fade-in duration-200">
      <span className="text-xs text-sub font-medium">فیلترهای فعال:</span>
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
            aria-label={`حذف فیلتر ${chip.label}`}
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
        <span>پاک کردن همه</span>
      </button>
    </div>
  );
}
