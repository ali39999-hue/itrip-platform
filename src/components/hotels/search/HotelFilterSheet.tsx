'use client';

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { X, RotateCcw } from 'lucide-react';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';
import { HotelPriceHistogram } from './HotelPriceHistogram';
import type { HotelFilterSheetProps } from './types';

export function HotelFilterSheet({
  isOpen,
  onClose,
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
  resultsCount,
}: HotelFilterSheetProps) {
  const locale = useLocale();
  const t = useTranslations('HotelsSearch');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-deep/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[85vh] bg-surface rounded-t-3xl sm:rounded-3xl border border-line shadow-elev-3 flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">{lt(locale, { fa: 'فیلترهای پیشرفته', en: 'Advanced filters', ar: 'فلاتر متقدمة', zh: '高级筛选', ru: 'Расширенные фильтры' })}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-soft text-sub hover:text-ink grid place-items-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          <HotelPriceHistogram
            maxPrice={maxPrice}
            onMaxPriceChange={onMaxPriceChange}
            priceBuckets={priceBuckets}
          />

          <div>
            <h4 className="text-xs font-bold text-sub mb-2.5">{t('filterStars')}</h4>
            <div className="grid grid-cols-4 gap-2">
              {[5, 4, 3, 2].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onToggleStar(s)}
                  className={`h-10 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 ${
                    stars.has(s)
                      ? 'bg-brand text-surface border-brand'
                      : 'bg-surface border-line text-ink hover:bg-soft'
                  }`}
                >
                  <span>{s}</span>
                  <span>★</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-sub mb-2.5">{t('filterScore')}</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { score: 9, label: lt(locale, { fa: 'فوق‌العاده (۹+)', en: 'Wonderful (9+)', ar: 'رائع (٩+)', zh: '极佳 (9+)', ru: 'Восхитительно (9+)' }) },
                { score: 8, label: lt(locale, { fa: 'خیلی خوب (۸+)', en: 'Very good (8+)', ar: 'جيد جداً (٨+)', zh: '很好 (8+)', ru: 'Очень хорошо (8+)' }) },
                { score: 0, label: lt(locale, { fa: 'همه امتیازها', en: 'All ratings', ar: 'جميع التقييمات', zh: '全部评分', ru: 'Все оценки' }) },
              ].map((item) => (
                <button
                  key={item.score}
                  type="button"
                  onClick={() => onMinScoreChange(item.score)}
                  className={`h-10 rounded-xl border text-xs font-bold px-2 truncate transition ${
                    minScore === item.score
                      ? 'bg-brand text-surface border-brand'
                      : 'bg-surface border-line text-ink hover:bg-soft'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-soft border border-line">
            <span className="text-xs font-bold text-ink">{t('filterFreeCancel')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={freeCancel}
              onClick={onToggleFreeCancel}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                freeCancel ? 'bg-brand' : 'bg-line'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-surface transition-transform ${
                  freeCancel ? 'end-1' : 'start-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-line flex items-center gap-3 bg-soft/50">
          <button
            type="button"
            onClick={onResetAll}
            className="px-4 h-11 rounded-xl bg-surface border border-line text-sub font-bold text-xs hover:text-ink flex items-center gap-1.5"
          >
            <RotateCcw size={14} />
            <span>{lt(locale, { fa: 'ریست', en: 'Reset', ar: 'إعادة تعيين', zh: '重置', ru: 'Сброс' })}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-brand text-surface font-bold text-xs hover:bg-brand-dark transition"
          >
            {lt(locale, { fa: 'مشاهده', en: 'Show', ar: 'عرض', zh: '查看', ru: 'Показать' })} ({num(resultsCount, locale)}{' '}
            {lt(locale, { fa: 'اقامتگاه', en: 'stays', ar: 'إقامة', zh: '家住宿', ru: 'вариантов' })})
          </button>
        </div>
      </div>
    </div>
  );
}
