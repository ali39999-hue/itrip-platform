'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import { X, ArrowLeft, Layers } from 'lucide-react';
import { lt } from '@/lib/lt';
import type { HotelCompareBarProps } from './types';

export function HotelCompareBar({
  cmp,
  hotels,
  onToggleCmp,
  onCompareAction,
}: HotelCompareBarProps) {
  const locale = useLocale();

  if (cmp.size === 0) return null;

  return (
    <div className="fixed bottom-4 start-4 end-4 md:start-auto md:end-8 md:w-[480px] bg-surface/95 backdrop-blur-md border border-brand/30 rounded-2xl p-4 shadow-elev-3 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-brand" />
          <span className="text-sm font-bold text-ink">
            {lt(locale, { fa: `مقایسه اقامتگاه‌ها (${cmp.size} از ۳)`, en: `Compare stays (${cmp.size} of 3)`, ar: `مقارنة الإقامات (${cmp.size} من ٣)`, zh: `比较住宿（${cmp.size}/3）`, ru: `Сравнение вариантов (${cmp.size} из 3)` })}
          </span>
        </div>
        <button
          type="button"
          onClick={() => cmp.forEach((id) => onToggleCmp(id))}
          className="text-xs text-sub hover:text-destructive transition"
        >
          {lt(locale, { fa: 'پاک کردن همه', en: 'Clear all', ar: 'مسح الكل', zh: '清除全部', ru: 'Сбросить всё' })}
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3">
        {Array.from(cmp).map((id) => {
          const h = hotels.find((x) => (Number(String(x.id).replace(/^h/, '')) || x.id) === id);
          return (
            <div
              key={id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-soft border border-line text-xs shrink-0"
            >
              <span className="font-bold truncate max-w-[120px]">
                {h ? (locale === 'fa' ? h.name : h.nameEn) : lt(locale, { fa: `هتل #${id}`, en: `Hotel #${id}`, ar: `فندق #${id}`, zh: `酒店 #${id}`, ru: `Отель #${id}` })}
              </span>
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
        <span>{lt(locale, { fa: 'مقایسه دقیق موارد انتخابی', en: 'Compare selected stays', ar: 'مقارنة العناصر المحددة', zh: '精确比较所选住宿', ru: 'Детальное сравнение выбранных' })}</span>
        <ArrowLeft size={15} className="ltr:rotate-180" />
      </button>
    </div>
  );
}
