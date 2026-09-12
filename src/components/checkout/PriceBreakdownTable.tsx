'use client';

import { useTranslations, useLocale } from 'next-intl';
import { formatMoney } from '@/lib/money';
import { ESIM_PRICE, INSURANCE_PRICE } from './AddonsSection';
import { Luggage, ShieldCheck, Tag, ReceiptText, CreditCard } from 'lucide-react';
import { lt } from '@/lib/lt';

interface PriceBreakdownTableProps {
  baseAmount: number;
  currency: string;
  addEsim: boolean;
  addInsurance: boolean;
  itemTitle: string;
  discountAmount?: number;
  referralCode?: string;
  taxRate?: number;
  taxLabel?: string;
  gatewayFeeRate?: number;
  gatewayFeeLabel?: string;
  paymentMethod?: string;
}

export function PriceBreakdownTable({
  baseAmount,
  currency,
  addEsim,
  addInsurance,
  itemTitle,
  discountAmount = 0,
  referralCode,
  taxRate,
  taxLabel,
  gatewayFeeRate,
  gatewayFeeLabel,
  paymentMethod,
}: PriceBreakdownTableProps) {
  const t = useTranslations('Checkout');
  const locale = useLocale();
  const addonsTotal = (addEsim ? ESIM_PRICE : 0) + (addInsurance ? INSURANCE_PRICE : 0);
  const subtotalBeforeTax = Math.max(0, baseAmount + addonsTotal - discountAmount);

  // Dynamic country-aware tax calculation
  const effectiveTaxRate = taxRate !== undefined ? taxRate : 0.09;
  const taxAmount = effectiveTaxRate > 0 ? Math.round(subtotalBeforeTax * effectiveTaxRate) : 0;

  // Dynamic gateway transaction fee (0% for Shetab / internal wallet)
  const isFreeGateway =
    paymentMethod === 'gateway_shetab' ||
    paymentMethod === 'wallet_irr' ||
    paymentMethod === 'wallet';
  const effectiveGatewayRate = isFreeGateway
    ? 0
    : gatewayFeeRate !== undefined
      ? gatewayFeeRate
      : 0.02;
  const gatewayFeeAmount =
    effectiveGatewayRate > 0
      ? Math.round((subtotalBeforeTax + taxAmount) * effectiveGatewayRate)
      : 0;

  const totalPayable = subtotalBeforeTax + taxAmount + gatewayFeeAmount;

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
            <span className="font-bold text-ink font-mono">+{formatMoney(ESIM_PRICE, currency, locale)}</span>
          </div>
        )}

        {addInsurance && (
          <div className="flex justify-between items-center py-1 text-mint-dark">
            <span className="text-sub font-bold flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-brand-dark" aria-hidden="true" />
              <span>+ {lt(locale, { fa: 'بیمه مسافرتی', en: 'Travel Insurance', ar: 'تأمين السفر', zh: '旅行保险', ru: 'Туристическая страховка' })}</span>
            </span>
            <span className="font-bold text-ink font-mono">+{formatMoney(INSURANCE_PRICE, currency, locale)}</span>
          </div>
        )}

        {discountAmount > 0 && (
          <div className="flex justify-between items-center py-1 text-success">
            <span className="font-bold flex items-center gap-1.5">
              <Tag size={14} aria-hidden="true" />
              <span>
                {referralCode
                  ? lt(locale, {
                      fa: `تخفیف معرف (${referralCode})`,
                      en: `Referral Discount (${referralCode})`,
                      ar: `خصم كود الإحالة (${referralCode})`,
                      zh: `推荐码折扣 (${referralCode})`,
                      ru: `Сکیдка по промокоду (${referralCode})`,
                    })
                  : lt(locale, { fa: 'تخفیف ویژه', en: 'Special Discount', ar: 'خصم خاص', zh: '特别折扣', ru: 'Специальная скидка' })}
              </span>
            </span>
            <span className="font-bold font-mono">-{formatMoney(discountAmount, currency, locale)}</span>
          </div>
        )}

        {/* 3. Country-Specific Tax (VAT / Tourism tax) */}
        <div className="flex justify-between items-center py-1">
          <span className="text-sub font-bold flex items-center gap-1.5">
            <ReceiptText size={14} className="text-brand-dark" aria-hidden="true" />
            <span>
              {taxLabel ||
                lt(locale, {
                  fa: 'مالیات و عوارض قانونی',
                  en: 'Taxes & Fees',
                  ar: 'الضرائب والرسوم',
                  zh: '法定税费',
                  ru: 'Налоги и сборы',
                })}
            </span>
          </span>
          <span className="font-bold text-ink font-mono">
            {taxAmount > 0 ? `+${formatMoney(taxAmount, currency, locale)}` : lt(locale, { fa: 'معاف', en: 'Exempt', ar: 'معفى', zh: '免税', ru: 'Освобождено' })}
          </span>
        </div>

        {/* 4. Payment Gateway Processing Fee */}
        <div className="flex justify-between items-center py-1">
          <span className="text-sub font-bold flex items-center gap-1.5">
            <CreditCard size={14} className="text-brand-dark" aria-hidden="true" />
            <span>
              {gatewayFeeLabel ||
                lt(locale, {
                  fa: 'کارمزد درگاه پرداخت',
                  en: 'Gateway Fee',
                  ar: 'رسوم بوابة الدفع',
                  zh: '网关手续费',
                  ru: 'Комиссия шлюза',
                })}
            </span>
          </span>
          <span className={`font-bold font-mono ${gatewayFeeAmount === 0 ? 'text-success' : 'text-ink'}`}>
            {gatewayFeeAmount === 0
              ? lt(locale, { fa: 'رایگان', en: 'Free', ar: 'مجاناً', zh: '免费', ru: 'Бесплатно' })
              : `+${formatMoney(gatewayFeeAmount, currency, locale)}`}
          </span>
        </div>
      </div>

      {/* 5. Total Payable (Dominant) */}
      <div className="pt-3 border-t border-line/80 flex items-baseline justify-between">
        <div>
          <strong className="block text-[14px] font-black text-ink">
            {lt(locale, { fa: 'مبلغ نهایی قابل پرداخت', en: 'Total Amount Payable', ar: 'المبلغ الإجمالي المستحق', zh: '应付总金额', ru: 'Итого к оплате' })}
          </strong>
          <span className="text-[11px] text-sub">
            {lt(locale, { fa: 'شامل مالیات و کارمزد درگاه', en: 'Includes country tax & gateway fee', ar: 'شامل الضريبة ورسوم البوابة', zh: '含税及网关费用', ru: 'Включая налог и комиссию' })}
          </span>
        </div>
        <span className="text-[20px] md:text-[22px] font-black text-price font-mono">
          {formatMoney(totalPayable, currency, locale)}
        </span>
      </div>
    </div>
  );
}
