'use client';

import React from 'react';
import { X, ArrowLeft, Layers } from 'lucide-react';
import type { HotelCompareBarProps } from './types';

export function HotelCompareBar({
  cmp,
  hotels,
  onToggleCmp,
  onCompareAction,
}: HotelCompareBarProps) {
  if (cmp.size === 0) return null;

  return (
    <div className="fixed bottom-4 start-4 end-4 md:start-auto md:end-8 md:w-[480px] bg-surface/95 backdrop-blur-md border border-brand/30 rounded-2xl p-4 shadow-elev-3 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-brand" />
          <span className="text-sm font-bold text-ink">
            مقایسه اقامتگاه‌ها ({cmp.size} از ۳)
          </span>
        </div>
        <button
          type="button"
          onClick={() => cmp.forEach((id) => onToggleCmp(id))}
          className="text-xs text-sub hover:text-destructive transition"
        >
          پاک کردن همه
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3">
        {Array.from(cmp).map((id) => {
          const h = hotels.find((x: any) => (Number(String(x.id).replace(/^h/, '')) || x.id) === id);
          return (
            <div
              key={id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-soft border border-line text-xs shrink-0"
            >
              <span className="font-bold truncate max-w-[120px]">{h?.name || `هتل #${id}`}</span>
              <button
                type="button"
                onClick={() => onToggleCmp(id)}
                className="text-sub hover:text-destructive ms-1"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        disabled={cmp.size < 2}
        onClick={onCompareAction}
        className="w-full h-10 rounded-xl bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-surface font-bold text-xs flex items-center justify-center gap-2 transition"
      >
        <span>مقایسه دقیق موارد انتخابی</span>
        <ArrowLeft size={15} className="ltr:rotate-180" />
      </button>
    </div>
  );
}
