'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import { Building2, RotateCcw, AlertTriangle, RefreshCw } from 'lucide-react';
import { lt } from '@/lib/lt';
import type { HotelEmptyStateProps } from './types';

export function HotelEmptyState({ onResetFilters, error, onRetry }: HotelEmptyStateProps) {
  const locale = useLocale();

  if (error) {
    return (
      <div className="text-center py-16 px-4 bg-surface border border-rose-200 rounded-3xl p-8 shadow-elev-1">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 grid place-items-center mx-auto mb-4">
          <AlertTriangle size={32} />
        </div>
        <h3 className="text-lg font-bold text-ink mb-1.5">
          {lt(locale, { fa: 'اختلال موقت در دریافت اطلاعات هتل‌ها', en: 'Temporary supplier connection issue', ar: 'مشكلة مؤقتة في الاتصال بالموردين', zh: '暂时的供应商连接问题', ru: 'Временная ошибка поставщика' })}
        </h3>
        <p className="text-xs text-sub max-w-sm mx-auto mb-6 leading-relaxed">
          {error}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-brand text-surface font-bold text-xs hover:bg-brand-dark transition shadow-sm"
          >
            <RefreshCw size={14} />
            <span>{lt(locale, { fa: 'تلاش مجدد', en: 'Retry connection', ar: 'إعادة المحاولة', zh: '重试连接', ru: 'Повторить' })}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="text-center py-16 px-4 bg-surface border border-line rounded-3xl p-8 shadow-elev-1">
      <div className="w-16 h-16 rounded-2xl bg-soft text-sub grid place-items-center mx-auto mb-4">
        <Building2 size={32} />
      </div>
      <h3 className="text-lg font-bold text-ink mb-1.5">{lt(locale, { fa: 'با این فیلترها اقامتگاهی یافت نشد', en: 'No stays found with these filters', ar: 'لم نجد أي إقامة بهذه الفلاتر', zh: '未找到符合这些筛选条件的住宿', ru: 'С этими фильтрами ничего не найдено' })}</h3>
      <p className="text-xs text-sub max-w-sm mx-auto mb-6 leading-relaxed">
        {lt(locale, { fa: 'محدوده قیمت یا ستاره‌های انتخابی را کمی بازتر کنید تا نتایج بیشتری نمایش داده شود.', en: 'Try widening your price range or star filters to see more results.', ar: 'وسّع نطاق السعر أو خيارات النجوم قليلاً لعرض المزيد من النتائج.', zh: '请稍微放宽价格范围或星级筛选，以显示更多结果。', ru: 'Расширьте диапазон цен или параметры звёزدности, чтобы увидеть больше вариантов.' })}
      </p>
      <button
        type="button"
        onClick={onResetFilters}
        className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-brand text-surface font-bold text-xs hover:bg-brand-dark transition"
      >
        <RotateCcw size={14} />
        <span>{lt(locale, { fa: 'پاک کردن فیلترها', en: 'Clear filters', ar: 'مسح الفلاتر', zh: '清除筛选', ru: 'Сбросить фильтры' })}</span>
      </button>
    </div>
  );
}
