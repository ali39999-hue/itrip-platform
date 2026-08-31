'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';
import type { HotelPriceHistogramProps } from './types';

export function HotelPriceHistogram({
  maxPrice,
  onMaxPriceChange,
  priceBuckets,
}: HotelPriceHistogramProps) {
  const locale = useLocale();
  const suffix = lt(locale, { fa: 'م', en: 'M', ar: 'م', zh: 'M', ru: 'M' });

  return (
    <div className="py-3.5 border-b border-line">
      <h3 className="m-0 mb-2.5 text-[12.5px] font-black flex items-center justify-between">
        {lt(locale, { fa: 'محدوده قیمت (هر شب)', en: 'Price range (per night)', ar: 'نطاق السعر (لكل ليلة)', zh: '价格范围（每晚）', ru: 'Диапазон цен (за ночь)' })}{' '}
        <span className="text-[10.5px] font-bold text-sub">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'Toman' })}</span>
      </h3>
      <div className="flex items-end gap-0.5 h-[34px] mb-1" dir="ltr">
        {priceBuckets.map((h, i) => (
          <i
            key={i}
            style={{ height: `${h}%` }}
            className={`flex-1 rounded-t-sm transition-colors ${
              i / 14 <= maxPrice / 160 ? 'bg-mint-bright' : 'bg-line'
            }`}
          />
        ))}
      </div>
      <input
        type="range"
        min={20}
        max={160}
        step={10}
        value={maxPrice}
        onChange={(e) => onMaxPriceChange(+e.target.value)}
        className="w-full accent-brand cursor-pointer"
        dir="ltr"
        aria-label={lt(locale, { fa: 'سقف قیمت هر شب', en: 'Maximum price per night', ar: 'أقصى سعر لكل ليلة', zh: '每晚最高价格', ru: 'Максимальная цена за ночь' })}
      />
      <div className="flex justify-between text-[11.5px] font-extrabold text-sub" dir="ltr">
        <span>{num(20, locale)}{suffix}</span>
        <span className="text-brand-dark">
          {maxPrice >= 160
            ? lt(locale, { fa: 'بدون سقف', en: 'No cap', ar: 'بلا حد أقصى', zh: '无上限', ru: 'Без ограничения' })
            : lt(locale, { fa: `تا ${num(maxPrice, locale)}م`, en: `Up to ${num(maxPrice, locale)}M`, ar: `حتى ${num(maxPrice, locale)}م`, zh: `最高 ${num(maxPrice, locale)}M`, ru: `До ${num(maxPrice, locale)}M` })}
        </span>
      </div>
    </div>
  );
}
