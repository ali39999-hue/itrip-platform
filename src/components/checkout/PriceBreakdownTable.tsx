'use client';

import { useTranslations, useLocale } from 'next-intl';
import { formatMoney } from '@/lib/money';
import { ESIM_PRICE, INSURANCE_PRICE } from './AddonsSection';
import { Luggage, ShieldCheck, Tag } from 'lucide-react';
import { lt } from '@/lib/lt';

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
  const t = useTranslations('Checkout');
  const locale = useLocale();
  const addonsTotal = (addEsim ? ESIM_PRICE : 0) + (addInsurance ? INSURANCE_PRICE : 0);
  const totalPayable = Math.max(0, baseAmount + addonsTotal - discountAmount);

  return (
    <div className="p-6 rounded-2xl bg-surface border border-line shadow-elev-1 space-y-4">
      <h3 className="text-[16px] font-black text-ink">{t('priceBreakdown')}</h3>

      <div className="space-y-2.5 text-[13px] pt-1">
        {/* 1. What I'm buying */}
        <div className="flex justify-between items-center py-1">
          <span className="text-sub font-bold flex items-center gap-1.5">
            <Luggage size={15} className="text-brand-dark" aria-hidden="true" />
            <span>{itemTitle || lt(locale, { fa: 'سرویس اصلی', en: 'Main Service', ar: 'الخدمة الأساسية', zh: '主服务', ru: 'Основная услуга' })}</span>
          </span>
          <span className="font-bold text-ink font-mono">{formatMoney(baseAmount, currency, locale)}</span>
        </div>

        {/* 2. Add-ons */}
        {addEsim && (
          <div className="flex justify-between items-center py-1 text-mint-dark">
            <span className="text-sub font-bold flex items-center gap-1.5">
              <span>+ {lt(locale, { fa: 'سیم‌کارت eSIM', en: 'eSIM Card', ar: 'شريحة eSIM', zh: 'eSIM 卡', ru: 'eSIM карта' })}</span>
            </span>
            <span className="font-bold text-ink font-mono">+{formatMoney(ESIM_PRICE, 'IRR', locale)}</span>
          </div>
        )}

        {addInsurance && (
          <div className="flex justify-between items-center py-1 text-mint-dark">
            <span className="text-sub font-bold flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-brand-dark" aria-hidden="true" />
              <span>+ {lt(locale, { fa: 'بیمه مسافرتی', en: 'Travel Insurance', ar: 'تأمين السفر', zh: '旅行保险', ru: 'Туристическая страховка' })}</span>
            </span>
            <span className="font-bold text-ink font-mono">+{formatMoney(INSURANCE_PRICE, 'IRR', locale)}</span>
          </div>
        )}

        {discountAmount > 0 && (
          <div className="flex justify-between items-center py-1 text-success">
            <span className="font-bold flex items-center gap-1.5">
              <Tag size={14} aria-hidden="true" />
              <span>{lt(locale, { fa: 'تخفیف ویژه', en: 'Special Discount', ar: 'خصم خاص', zh: '特别折扣', ru: 'Специальная скидка' })}</span>
            </span>
            <span className="font-bold font-mono">-{formatMoney(discountAmount, currency, locale)}</span>
          </div>
        )}

        {/* Tax note */}
        <div className="flex justify-between items-center py-1 text-[12px] text-sub">
          <span>{lt(locale, { fa: 'مالیات و عوارض قانونی', en: 'Taxes & Fees', ar: 'الضرائب والرسوم القانونية', zh: '税费', ru: 'Налоги и сборы' })}</span>
          <span className="font-bold text-success">{lt(locale, { fa: 'محاسبه‌شده در قیمت', en: 'Included in price', ar: 'مشمول في السعر', zh: '已包含在价格中', ru: 'Включено в стоимость' })}</span>
        </div>
      </div>

      {/* 3. Total Payable (Dominant) */}
      <div className="pt-3 border-t border-line/80 flex items-baseline justify-between">
        <div>
          <strong className="block text-[14px] font-black text-ink">
            {lt(locale, { fa: 'مبلغ نهایی قابل پرداخت', en: 'Total Amount Payable', ar: 'المبلغ الإجمالي المستحق', zh: '应付总金额', ru: 'Итого к оплате' })}
          </strong>
          <span className="text-[11px] text-sub">
            {lt(locale, { fa: 'بدون هزینه مخفی و کارمزد اضافه', en: 'No hidden fees or extra charges', ar: 'بدون رسوم خفية أو تكاليف إضافية', zh: '无隐藏费用或附加费', ru: 'Без скрытых комиссий и сборов' })}
          </span>
        </div>
        <span className="text-[20px] md:text-[22px] font-black text-price font-mono">
          {formatMoney(totalPayable, currency, locale)}
        </span>
      </div>
    </div>
  );
}
