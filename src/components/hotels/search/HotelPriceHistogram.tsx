'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import { num } from '@/lib/format';
import { lt } from '@/lib/lt';
import type { HotelPriceHistogramProps } from './types';

export function HotelPriceHistogram({
  maxPrice,
  onMaxPriceChange,
  minPrice = 0,
  onMinPriceChange,
  priceBuckets,
}: HotelPriceHistogramProps) {
  const locale = useLocale();

  const presets = [
    {
      label: lt(locale, { fa: 'همه', en: 'All', ar: 'الكل', zh: '全部', ru: 'Все' }),
      min: 0,
      max: 20,
    },
    {
      label: lt(locale, { fa: 'زیر ۳ م', en: '< 3M', ar: 'أقل من 3م', zh: '< 3M', ru: '< 3М' }),
      min: 0,
      max: 3,
    },
    {
      label: lt(locale, { fa: '۳ تا ۶ م', en: '3-6M', ar: '3-6م', zh: '3-6M', ru: '3-6М' }),
      min: 3,
      max: 6,
    },
    {
      label: lt(locale, { fa: '۶ تا ۱۰ م', en: '6-10M', ar: '6-10م', zh: '6-10M', ru: '6-10М' }),
      min: 6,
      max: 10,
    },
    {
      label: lt(locale, { fa: '۱۰ م به بالا', en: '10M+', ar: '10م+', zh: '10M+', ru: '10М+' }),
      min: 10,
      max: 20,
    },
  ];

  function applyPreset(pMin: number, pMax: number) {
    onMinPriceChange?.(pMin);
    onMaxPriceChange(pMax);
  }

  const isPresetActive = (pMin: number, pMax: number) => {
    return minPrice === pMin && maxPrice === pMax;
  };

  return (
    <div className="py-3.5 border-b border-line">
      {/* Title & Unit */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="m-0 text-[12.5px] font-black text-ink">
          {lt(locale, { fa: 'محدوده قیمت (هر شب)', en: 'Price per night', ar: 'نطاق السعر (لكل ليلة)', zh: '每晚价格范围', ru: 'Цена за ночь' })}
        </h3>
        <span className="text-[10.5px] font-black px-1.5 py-0.5 rounded bg-soft text-brand-dark border border-line/60">
          {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'Томан' })}
        </span>
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap items-center gap-1 mb-3">
        {presets.map((preset) => {
          const active = isPresetActive(preset.min, preset.max);
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset.min, preset.max)}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                active
                  ? 'bg-brand text-surface shadow-2xs font-black'
                  : 'bg-soft text-sub hover:text-ink hover:bg-line/60'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Price Histogram Bars */}
      <div className="flex items-end gap-1 h-[40px] mb-2 px-1" dir="ltr">
        {priceBuckets.map((h, i) => {
          // 14 buckets representing 0 to 20M Toman
          const bucketValue = (i / 14) * 20;
          const isActive = bucketValue >= minPrice && bucketValue <= (maxPrice >= 20 ? 20 : maxPrice);
          return (
            <i
              key={i}
              style={{ height: `${Math.max(12, h)}%` }}
              className={`flex-1 rounded-t-sm transition-all duration-200 ${
                isActive
                  ? 'bg-brand shadow-2xs'
                  : 'bg-line/80 opacity-40'
              }`}
              title={`${Math.round((i / 14) * 20)}M`}
            />
          );
        })}
      </div>

      {/* Range Slider for Max Price */}
      <div className="space-y-1.5">
        <input
          type="range"
          min={1}
          max={20}
          step={1}
          value={maxPrice >= 20 ? 20 : maxPrice}
          onChange={(e) => onMaxPriceChange(+e.target.value)}
          className="w-full accent-brand cursor-pointer h-1.5 bg-soft rounded-lg appearance-none"
          dir="ltr"
          aria-label={lt(locale, { fa: 'سقف قیمت هر شب', en: 'Maximum price per night', ar: 'أقصى سعر لكل ليلة', zh: '每晚最高价格', ru: 'Максимальная цена за ночь' })}
        />

        {/* Min & Max Labels */}
        <div className="flex items-center justify-between text-[11.5px] font-black text-sub pt-0.5">
          <span>
            {minPrice > 0
              ? lt(locale, {
                  fa: `از ${num(minPrice, locale)} م`,
                  en: `From ${num(minPrice, locale)}M`,
                  ar: `من ${num(minPrice, locale)} م`,
                  zh: `起 ${num(minPrice, locale)}M`,
                  ru: `От ${num(minPrice, locale)}M`,
                })
              : lt(locale, { fa: 'از ۱ میلیون', en: 'From 1M', ar: 'من 1 مليون', zh: '1M 起', ru: 'От 1M' })}
          </span>
          <span className="text-brand font-black px-2 py-0.5 rounded-md bg-brand/10">
            {maxPrice >= 20
              ? lt(locale, { fa: 'بدون سقف قیمت', en: 'No maximum limit', ar: 'بلا سقف للسعر', zh: '不限上限', ru: 'Без ограничения' })
              : lt(locale, {
                  fa: `تا ${num(maxPrice, locale)} میلیون تومان`,
                  en: `Up to ${num(maxPrice, locale)}M Toman`,
                  ar: `حتى ${num(maxPrice, locale)} مليون تومان`,
                  zh: `最高 ${num(maxPrice, locale)}M 图曼`,
                  ru: `До ${num(maxPrice, locale)}M томан`,
                })}
          </span>
        </div>
      </div>
    </div>
  );
}
