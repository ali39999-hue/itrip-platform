'use client';

import React, { useState } from 'react';
import {
  Check,
  Luggage,
  Briefcase,
  Utensils,
  Armchair,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { lt } from '@/lib/lt';

export type FareBrandCode = 'LIGHT' | 'STANDARD' | 'FLEX_BUSINESS';

export interface FareBrandOption {
  code: FareBrandCode;
  title: { fa: string; en: string };
  priceMultiplier: number;
  cabinBaggage: string;
  checkedBaggage: string;
  hasMeal: boolean;
  freeSeatSelection: boolean;
  isRefundable: boolean;
  changePenaltyPercent: number;
  badge?: { fa: string; en: string };
}

export const FARE_BRANDS: FareBrandOption[] = [
  {
    code: 'LIGHT',
    title: { fa: 'اکونومی پایه (لایت)', en: 'Economy Light' },
    priceMultiplier: 1.0,
    cabinBaggage: '۷ کیلوگرم',
    checkedBaggage: 'بدون بار تحویلی',
    hasMeal: true,
    freeSeatSelection: false,
    isRefundable: false,
    changePenaltyPercent: 50,
  },
  {
    code: 'STANDARD',
    title: { fa: 'اکونومی استاندارد', en: 'Economy Standard' },
    priceMultiplier: 1.15,
    cabinBaggage: '۷ کیلوگرم',
    checkedBaggage: '۲۰ کیلوگرم',
    hasMeal: true,
    freeSeatSelection: true,
    isRefundable: true,
    changePenaltyPercent: 20,
    badge: { fa: 'محبوب‌ترین انتخاب', en: 'Most Popular' },
  },
  {
    code: 'FLEX_BUSINESS',
    title: { fa: 'بیزینس فلکس اختصاصی', en: 'Business Flex' },
    priceMultiplier: 1.6,
    cabinBaggage: '۱۰ کیلوگرم',
    checkedBaggage: '۳۵ کیلوگرم (۲ چمدان)',
    hasMeal: true,
    freeSeatSelection: true,
    isRefundable: true,
    changePenaltyPercent: 0, // Free change
    badge: { fa: 'حداکثر راحتی و انعطاف', en: 'Maximum Flexibility' },
  },
];

interface FareBrandedMatrixProps {
  basePrice: number;
  locale: string;
  selectedBrand?: FareBrandCode;
  onSelectBrand?: (brand: FareBrandOption) => void;
  className?: string;
}

export function FareBrandedMatrix({
  basePrice,
  locale,
  selectedBrand = 'STANDARD',
  onSelectBrand,
  className = '',
}: FareBrandedMatrixProps) {
  const [activeCode, setActiveCode] = useState<FareBrandCode>(selectedBrand);

  const handleSelect = (brand: FareBrandOption) => {
    setActiveCode(brand.code);
    if (onSelectBrand) onSelectBrand(brand);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm sm:text-base font-black text-ink m-0 flex items-center gap-2">
          <Sparkles size={16} className="text-brand" />
          <span>
            {lt(locale, {
              fa: 'انتخاب کلاس نرخی و امکانات پرواز',
              en: 'Select Fare Brand & Flight Inclusions',
              ar: 'اختر باقة السعر ومميزات الرحلة',
              zh: '选择机票票价等级与服务',
              ru: 'Выбор тарифного пакета',
            })}
          </span>
        </h3>
        <span className="text-xs text-sub font-bold">
          {lt(locale, {
            fa: 'مقایسه بار، صندلی و شرایط استرداد',
            en: 'Compare baggage, seat, and refund rules',
            ar: 'مقارنة الأمتعة والمقاعد والاسترداد',
            zh: '对比行李额、选座与退改签规则',
            ru: 'Сравнение багажа и условий возврата',
          })}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FARE_BRANDS.map((brand) => {
          const isSelected = activeCode === brand.code;
          const calculatedPrice = Math.round(basePrice * brand.priceMultiplier);

          return (
            <div
              key={brand.code}
              onClick={() => handleSelect(brand)}
              className={`rounded-2xl border-2 p-5 flex flex-col justify-between transition cursor-pointer relative ${
                isSelected
                  ? 'border-brand bg-brand/5 shadow-md dark:bg-brand/10'
                  : 'border-line bg-surface hover:border-brand/40 shadow-xs'
              }`}
            >
              {/* Badge */}
              {brand.badge && (
                <span className="absolute -top-3 start-4 px-2.5 py-0.5 rounded-full bg-brand-dark text-white text-[10px] font-black shadow-xs">
                  {isEnLocale(locale) ? brand.badge.en : brand.badge.fa}
                </span>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-black text-ink m-0">
                    {isEnLocale(locale) ? brand.title.en : brand.title.fa}
                  </h4>
                  {isSelected && <Check size={16} className="text-brand" />}
                </div>

                <div className="text-lg font-black text-price font-mono mb-4">
                  {calculatedPrice.toLocaleString('fa-IR')} تومان
                </div>

                {/* Inclusions List */}
                <div className="space-y-2.5 text-xs font-bold text-ink border-t border-line/60 pt-3">
                  <div className="flex items-center gap-2">
                    <Briefcase size={14} className="text-sub shrink-0" />
                    <span>بار کابین: {brand.cabinBaggage}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Luggage size={14} className="text-sub shrink-0" />
                    <span className={brand.checkedBaggage.includes('بدون') ? 'text-amber-700' : ''}>
                      بار باربری: {brand.checkedBaggage}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Armchair size={14} className="text-sub shrink-0" />
                    <span>
                      {brand.freeSeatSelection ? 'انتخاب رایگان صندلی' : 'صندلی تصادفی سیستمی'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Utensils size={14} className="text-sub shrink-0" />
                    <span>پذیرایی کامل و کترینگ حین پرواز</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <RotateCcw size={14} className="text-sub shrink-0" />
                    <span className={brand.isRefundable ? 'text-emerald-700' : 'text-rose-700'}>
                      {brand.isRefundable
                        ? `امکان استرداد (جریمه ${brand.changePenaltyPercent}٪)`
                        : 'کاملاً غیرقابل استرداد'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-line/60">
                <button
                  type="button"
                  className={`w-full h-10 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-brand text-surface shadow-xs'
                      : 'bg-soft hover:bg-line text-ink'
                  }`}
                >
                  {isSelected ? 'انتخاب شده' : 'انتخاب این کلاس نرخی'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function isEnLocale(locale: string): boolean {
  return locale === 'en' || locale === 'ru';
}
