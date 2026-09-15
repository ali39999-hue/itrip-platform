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
import { formatMoney } from '@/lib/money';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';

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
  const { currency } = useDisplayCurrency();
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
                  {locale === 'fa' ? brand.badge.fa : brand.badge.en}
                </span>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-black text-ink m-0">
                    {locale === 'fa' ? brand.title.fa : brand.title.en}
                  </h4>
                  {isSelected && <Check size={16} className="text-brand" />}
                </div>

                <div className="text-lg font-black text-price font-price mb-4">
                  {formatMoney(calculatedPrice, currency, locale)}
                </div>

                {/* Inclusions List */}
                <div className="space-y-2.5 text-xs font-bold text-ink border-t border-line/60 pt-3">
                  <div className="flex items-center gap-2">
                    <Briefcase size={14} className="text-sub shrink-0" />
                    <span>
                      {lt(locale, { fa: 'بار کابین:', en: 'Cabin baggage:', ar: 'أمتعة المقصورة:', zh: '手提行李：', ru: 'Ручная кладь:' })}{' '}
                      {brand.cabinBaggage}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Luggage size={14} className="text-sub shrink-0" />
                    <span className={brand.checkedBaggage.includes('بدون') ? 'text-amber-700' : ''}>
                      {lt(locale, { fa: 'بار باربری:', en: 'Checked baggage:', ar: 'الأمتعة المسجلة:', zh: '托运行李：', ru: 'Багаж:' })}{' '}
                      {locale === 'fa'
                        ? brand.checkedBaggage
                        : brand.checkedBaggage.includes('بدون')
                        ? lt(locale, { fa: 'بدون بار', en: 'No checked baggage', ar: 'بدون أمتعة', zh: '无托运行李', ru: 'Без багажа' })
                        : brand.checkedBaggage}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Armchair size={14} className="text-sub shrink-0" />
                    <span>
                      {brand.freeSeatSelection
                        ? lt(locale, { fa: 'انتخاب رایگان صندلی', en: 'Free seat selection', ar: 'اختيار مجاني للمقعد', zh: '免费选座', ru: 'Бесплатный выбор места' })
                        : lt(locale, { fa: 'صندلی تصادفی سیستمی', en: 'Random system seat', ar: 'تخصيص مقعد عشوائي', zh: '系统随机分配', ru: 'Случайное место' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Utensils size={14} className="text-sub shrink-0" />
                    <span>
                      {lt(locale, { fa: 'پذیرایی کامل حین پرواز', en: 'Complimentary in-flight meal', ar: 'وجبة طعام مجانية', zh: '包含机上餐食', ru: 'Питание на борту' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <RotateCcw size={14} className="text-sub shrink-0" />
                    <span className={brand.isRefundable ? 'text-emerald-700' : 'text-rose-700'}>
                      {brand.isRefundable
                        ? `${lt(locale, { fa: 'امکان استرداد (جریمه ', en: 'Refundable (penalty ', ar: 'قابل للاسترداد (غرامة ', zh: '可退改（手续费 ', ru: 'Возвратный (штраф ' })}${brand.changePenaltyPercent}٪)`
                        : lt(locale, { fa: 'کاملاً غیرقابل استرداد', en: 'Non-refundable', ar: 'غير قابل للاسترداد', zh: '不可退款', ru: 'Невозвратный' })}
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
                  {isSelected
                    ? lt(locale, { fa: 'انتخاب شده', en: 'Selected', ar: 'محدد', zh: '已选择', ru: 'Выбрано' })
                    : lt(locale, { fa: 'انتخاب این کلاس نرخی', en: 'Select this fare', ar: 'اختر هذه الباقة', zh: '选择此等级', ru: 'Выбрать этот тариф' })}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
