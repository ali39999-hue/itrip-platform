'use client';

import { Wifi, ShieldCheck } from 'lucide-react';
import { formatMoney } from '@/lib/money';

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
  return (
    <div className="p-6 rounded-2xl bg-surface border border-line shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-black text-ink">سرویس‌های تکمیلی سفر</h2>
          <p className="text-[13px] font-bold text-sub">خدمات پیشنهادی و اختیاری برای راحتی بیشتر</p>
        </div>
        <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-mint text-brand-dark">
          اختیاری
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        {/* eSIM Addon */}
        <label
          className={`flex items-start gap-3.5 p-4 rounded-xl border transition cursor-pointer select-none ${
            addEsim
              ? 'border-brand bg-mint/30 shadow-sm'
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
              <Wifi size={16} className="text-brand-dark shrink-0" />
              <strong className="text-[13.5px] font-bold text-ink">سیم‌کارت الکترونیکی (eSIM)</strong>
            </div>
            <p className="text-[12px] text-sub mb-2">اینترنت پرسرعت 4G در {countryName}</p>
            <span className="text-[13px] font-black text-brand-dark font-mono">
              +{formatMoney(ESIM_PRICE, 'IRR')}
            </span>
          </div>
        </label>

        {/* Travel Insurance Addon */}
        <label
          className={`flex items-start gap-3.5 p-4 rounded-xl border transition cursor-pointer select-none ${
            addInsurance
              ? 'border-brand bg-mint/30 shadow-sm'
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
              <ShieldCheck size={16} className="text-brand-dark shrink-0" />
              <strong className="text-[13.5px] font-bold text-ink">بیمه مسافرتی سامان</strong>
            </div>
            <p className="text-[12px] text-sub mb-2">پوشش کامل درمان، بار و تاخیر پرواز</p>
            <span className="text-[13px] font-black text-brand-dark font-mono">
              +{formatMoney(INSURANCE_PRICE, 'IRR')}
            </span>
          </div>
        </label>
      </div>
    </div>
  );
}
