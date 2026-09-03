'use client';

import { Wifi, ShieldCheck } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

export const ESIM_PRICE = 2800000;
export const INSURANCE_PRICE = 1900000;

interface AddonsSectionProps {
  addEsim: boolean;
  setAddEsim: (v: boolean) => void;
  addInsurance: boolean;
  setAddInsurance: (v: boolean) => void;
  countryName: string;
}

export function AddonsSection({
  addEsim,
  setAddEsim,
  addInsurance,
  setAddInsurance,
  countryName,
}: AddonsSectionProps) {
  const locale = useLocale();

  return (
    <div className="p-6 rounded-2xl bg-surface border border-line shadow-elev-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-black text-ink">
            {lt(locale, {
              fa: 'سرویس‌های تکمیلی سفر',
              en: 'Additional Travel Services',
              ar: 'خدمات السفر الإضافية',
              zh: '附加旅行服务',
              ru: 'Дополнительные услуги'
            })}
          </h2>
          <p className="text-[13px] font-bold text-sub">
            {lt(locale, {
              fa: 'خدمات پیشنهادی و اختیاری برای راحتی بیشتر',
              en: 'Recommended optional services for extra comfort',
              ar: 'خدمات مقترحة واختيارية لمزيد من الراحة',
              zh: '推荐的可选服务，带来更多便利',
              ru: 'Рекомендуемые услуги для вашего удобства'
            })}
          </p>
        </div>
        <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-mint text-brand-dark">
          {lt(locale, { fa: 'اختیاری', en: 'Optional', ar: 'اختياري', zh: '可选', ru: 'Опционально' })}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        {/* eSIM Addon */}
        <label
          className={`flex items-start gap-3.5 p-4 rounded-xl border transition cursor-pointer select-none ${
            addEsim
              ? 'border-brand bg-mint/30 shadow-elev-1'
              : 'border-line/80 bg-surface hover:border-brand/40'
          }`}
        >
          <input
            type="checkbox"
            checked={addEsim}
            onChange={(e) => setAddEsim(e.target.checked)}
            className="mt-1 w-4 h-4 rounded text-brand focus:ring-brand accent-brand cursor-pointer"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Wifi size={16} className="text-brand-dark shrink-0" aria-hidden="true" />
              <strong className="text-[13.5px] font-bold text-ink">
                {lt(locale, {
                  fa: 'سیم‌کارت الکترونیکی (eSIM)',
                  en: 'Electronic SIM (eSIM)',
                  ar: 'شريحة إلكترونية (eSIM)',
                  zh: '电子 SIM 卡 (eSIM)',
                  ru: 'Электронная SIM (eSIM)'
                })}
              </strong>
            </div>
            <p className="text-[12px] text-sub mb-2">
              {lt(locale, {
                fa: `اینترنت پرسرعت 4G در ${countryName}`,
                en: `High-speed 4G internet in ${countryName}`,
                ar: `إنترنت 4G فائق السرعة في ${countryName}`,
                zh: `${countryName}的高速 4G 网络`,
                ru: `Высокоскоростной 4G интернет в ${countryName}`
              })}
            </p>
            <span className="text-[13px] font-black text-brand-dark font-mono">
              +{formatMoney(ESIM_PRICE, 'IRR', locale)}
            </span>
          </div>
        </label>

        {/* Travel Insurance Addon */}
        <label
          className={`flex items-start gap-3.5 p-4 rounded-xl border transition cursor-pointer select-none ${
            addInsurance
              ? 'border-brand bg-mint/30 shadow-elev-1'
              : 'border-line/80 bg-surface hover:border-brand/40'
          }`}
        >
          <input
            type="checkbox"
            checked={addInsurance}
            onChange={(e) => setAddInsurance(e.target.checked)}
            className="mt-1 w-4 h-4 rounded text-brand focus:ring-brand accent-brand cursor-pointer"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={16} className="text-brand-dark shrink-0" aria-hidden="true" />
              <strong className="text-[13.5px] font-bold text-ink">
                {lt(locale, {
                  fa: 'بیمه مسافرتی سامان',
                  en: 'Travel Insurance',
                  ar: 'تأمين السفر',
                  zh: '旅行保险',
                  ru: 'Туристическая страховка'
                })}
              </strong>
            </div>
            <p className="text-[12px] text-sub mb-2">
              {lt(locale, {
                fa: 'پوشش کامل درمان، بار و تاخیر پرواز',
                en: 'Comprehensive medical, baggage, and flight delay coverage',
                ar: 'تغطية شاملة للعلاج والأمتعة وتأخر الرحلات',
                zh: '全面覆盖医疗、行李及航班延误',
                ru: 'Полное покрытие лечения, багажа и задержек рейсов'
              })}
            </p>
            <span className="text-[13px] font-black text-brand-dark font-mono">
              +{formatMoney(INSURANCE_PRICE, 'IRR', locale)}
            </span>
          </div>
        </label>
      </div>
    </div>
  );
}
