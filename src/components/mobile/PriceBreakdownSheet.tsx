'use client';

import React from 'react';
import { Sheet, SheetContent } from '@/components/ui/Sheet';
import { ShieldCheck, Info, Tag } from 'lucide-react';
import { num } from '@/lib/format';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

export interface PriceItem {
  label: string;
  amount: number;
  isDiscount?: boolean;
  note?: string;
}

export interface PriceBreakdownSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  items: PriceItem[];
  totalAmount: number;
  currencyLabel?: string;
  taxIncluded?: boolean;
  guaranteeNote?: string;
}

export function PriceBreakdownSheet({
  open,
  onOpenChange,
  title,
  items,
  totalAmount,
  currencyLabel = 'تومان',
  taxIncluded = true,
  guaranteeNote,
}: PriceBreakdownSheetProps) {
  const locale = useLocale();

  const defaultTitle = lt(locale, {
    fa: 'جزئیات شفاف قیمت و هزینه‌ها',
    en: 'Transparent Price Breakdown',
    ar: 'تفاصيل الأسعار والرسوم',
    zh: '明细费用详情',
    ru: 'Детализация стоимости',
  });

  const defaultGuarantee = lt(locale, {
    fa: 'تضمین بهترین نرخ و بدون هزینه پنهان',
    en: 'Best price guarantee & zero hidden fees',
    ar: 'ضمان أفضل الأسعار وبدون رسوم خفية',
    zh: '最优价格保证与无隐藏费用',
    ru: 'Гарантия лучшей цены без скрытых комиссий',
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange} side="bottom">
      <SheetContent className="max-w-lg mx-auto pb-8">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-line">
          <Info size={18} className="text-brand" aria-hidden="true" />
          <h3 className="text-base font-black text-ink">{title || defaultTitle}</h3>
        </div>

        <div className="space-y-3 divide-y divide-line/60">
          {items.map((item, idx) => (
            <div key={idx} className={`pt-2.5 flex items-center justify-between text-xs ${idx === 0 ? 'pt-0' : ''}`}>
              <div>
                <span className={`font-bold ${item.isDiscount ? 'text-emerald-700' : 'text-sub'}`}>
                  {item.label}
                </span>
                {item.note && (
                  <span className="block text-[10.5px] text-sub/70 mt-0.5">{item.note}</span>
                )}
              </div>
              <div className="flex items-center gap-1 font-black">
                {item.isDiscount && <Tag size={12} className="text-emerald-600" />}
                <span
                  className={`${
                    item.isDiscount ? 'text-emerald-700 font-extrabold' : 'text-ink'
                  }`}
                >
                  {item.isDiscount ? '-' : ''}
                  {num(item.amount, locale)}
                </span>
                <span className="text-[10px] text-sub">{currencyLabel}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Total Final Line */}
        <div className="mt-5 pt-4 border-t-2 border-line/80 flex items-center justify-between bg-soft/60 p-3.5 rounded-2xl">
          <div>
            <span className="text-xs font-black text-ink block">
              {lt(locale, {
                fa: 'مبلغ کل نهایی و قابل پرداخت:',
                en: 'Final Total Payable:',
                ar: 'المبلغ الإجمالي النهائي:',
                zh: '最终应付总额：',
                ru: 'Итого к оплате:',
              })}
            </span>
            {taxIncluded && (
              <span className="text-[10.5px] font-bold text-sub">
                {lt(locale, {
                  fa: 'شامل کلیه مالیات‌ها و عوارض رسمی',
                  en: 'All taxes and official fees included',
                  ar: 'شامل جميع الضرائب والرسوم الرسمية',
                  zh: '已含所有官方税费',
                  ru: 'Все налоги и сборы включены',
                })}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1 text-start">
            <span className="text-xl font-black text-price">{num(totalAmount, locale)}</span>
            <span className="text-xs font-black text-sub">{currencyLabel}</span>
          </div>
        </div>

        {/* Guarantee Badge */}
        <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/70 p-2.5 rounded-xl">
          <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
          <span>{guaranteeNote || defaultGuarantee}</span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
