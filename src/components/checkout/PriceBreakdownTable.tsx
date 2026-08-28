'use client';

import { formatMoney } from '@/lib/money';
import { ESIM_PRICE, INSURANCE_PRICE } from './AddonsSection';
import { Luggage, ShieldCheck, Tag } from 'lucide-react';

interface PriceBreakdownTableProps {
  baseAmount: number;
  currency: string;
  addEsim: boolean;
  addInsurance: boolean;
  itemTitle: string;
  discountAmount?: number;
}

export function PriceBreakdownTable({
  baseAmount,
  currency,
  addEsim,
  addInsurance,
  itemTitle,
  discountAmount = 0,
}: PriceBreakdownTableProps) {
  const addonsTotal = (addEsim ? ESIM_PRICE : 0) + (addInsurance ? INSURANCE_PRICE : 0);
  const totalPayable = Math.max(0, baseAmount + addonsTotal - discountAmount);

  return (
    <div className="p-6 rounded-2xl bg-surface border border-line shadow-sm space-y-4">
      <h3 className="text-[16px] font-black text-ink">جزئیات صورت‌حساب شفاف</h3>

      <div className="space-y-2.5 text-[13px] pt-1">
        {/* 1. What I'm buying */}
        <div className="flex justify-between items-center py-1">
          <span className="text-sub font-bold flex items-center gap-1.5">
            <Luggage size={15} className="text-brand-dark" />
            <span>{itemTitle || 'سرویس اصلی'}</span>
          </span>
          <span className="font-bold text-ink font-mono">{formatMoney(baseAmount, currency)}</span>
        </div>

        {/* 2. Add-ons */}
        {addEsim && (
          <div className="flex justify-between items-center py-1 text-mint-dark">
            <span className="text-sub font-bold flex items-center gap-1.5">
              <span>+ سیم‌کارت eSIM</span>
            </span>
            <span className="font-bold text-ink font-mono">+{formatMoney(ESIM_PRICE, 'IRR')}</span>
          </div>
        )}

        {addInsurance && (
          <div className="flex justify-between items-center py-1 text-mint-dark">
            <span className="text-sub font-bold flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-brand-dark" />
              <span>+ بیمه مسافرتی</span>
            </span>
            <span className="font-bold text-ink font-mono">+{formatMoney(INSURANCE_PRICE, 'IRR')}</span>
          </div>
        )}

        {discountAmount > 0 && (
          <div className="flex justify-between items-center py-1 text-success">
            <span className="font-bold flex items-center gap-1.5">
              <Tag size={14} />
              <span>تخفیف ویژه</span>
            </span>
            <span className="font-bold font-mono">-{formatMoney(discountAmount, currency)}</span>
          </div>
        )}

        {/* Tax note */}
        <div className="flex justify-between items-center py-1 text-[12px] text-sub">
          <span>مالیات و عوارض قانونی</span>
          <span className="font-bold text-success">محاسبه‌شده در قیمت</span>
        </div>
      </div>

      {/* 3. Total Payable (Dominant) */}
      <div className="pt-3 border-t border-line/80 flex items-baseline justify-between">
        <div>
          <strong className="block text-[14px] font-black text-ink">مبلغ نهایی قابل پرداخت</strong>
          <span className="text-[11px] text-sub">بدون هزینه مخفی و کارمزد اضافه</span>
        </div>
        <span className="text-[20px] md:text-[22px] font-black text-price font-mono">
          {formatMoney(totalPayable, currency)}
        </span>
      </div>
    </div>
  );
}
