'use client';

import React from 'react';
import type { HotelPriceHistogramProps } from './types';

export function HotelPriceHistogram({
  maxPrice,
  onMaxPriceChange,
  priceBuckets,
}: HotelPriceHistogramProps) {
  return (
    <div className="py-3.5 border-b border-line">
      <h3 className="m-0 mb-2.5 text-[12.5px] font-black flex items-center justify-between">
        محدوده قیمت (هر شب) <span className="text-[10.5px] font-bold text-sub">تومان</span>
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
        aria-label="سقف قیمت هر شب"
      />
      <div className="flex justify-between text-[11.5px] font-extrabold text-sub" dir="ltr">
        <span>۲۰م</span>
        <span className="text-brand-dark">
          {maxPrice >= 160 ? 'بدون سقف' : `تا ${maxPrice.toLocaleString('fa-IR')}م`}
        </span>
      </div>
    </div>
  );
}
