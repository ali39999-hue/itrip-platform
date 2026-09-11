'use client';

import React from 'react';
import { Briefcase, Luggage, ShieldAlert } from 'lucide-react';
import { lt } from '@/lib/lt';

interface BaggagePillProps {
  cabinBaggage?: string; // e.g. "7kg" or "1 x 7kg"
  checkedBaggage?: string; // e.g. "20kg", "30kg", "0kg"
  locale: string;
  className?: string;
}

export function BaggagePill({
  cabinBaggage = '7kg',
  checkedBaggage = '20kg',
  locale,
  className = '',
}: BaggagePillProps) {
  const isNoChecked =
    !checkedBaggage ||
    checkedBaggage.toLowerCase() === '0kg' ||
    checkedBaggage.toLowerCase() === 'none' ||
    checkedBaggage === 'بدون بار';

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {/* Cabin Luggage */}
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs font-bold"
        title={lt(locale, {
          fa: 'بار مجاز کابین (همراه داخل هواپیما)',
          en: 'Cabin Baggage Allowance',
          ar: 'الأمتعة المحمولة في المقصورة',
          zh: '手提行李额度',
          ru: 'Ручная кладь',
        })}
      >
        <Briefcase size={13} className="shrink-0 text-sky-600 dark:text-sky-400" />
        <span>
          {lt(locale, {
            fa: `کابین: ${cabinBaggage}`,
            en: `Cabin: ${cabinBaggage}`,
            ar: `المقصورة: ${cabinBaggage}`,
            zh: `手提: ${cabinBaggage}`,
            ru: `Кабина: ${cabinBaggage}`,
          })}
        </span>
      </div>

      {/* Checked Baggage */}
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
          isNoChecked
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
        }`}
        title={lt(locale, {
          fa: 'بار مجاز تحویل به باربری (قسمت بار)',
          en: 'Checked Baggage Allowance',
          ar: 'أمتعة الشحن المسجلة',
          zh: '托运行李额度',
          ru: 'Регистрируемый багаж',
        })}
      >
        {isNoChecked ? (
          <ShieldAlert size={13} className="shrink-0 text-amber-600 dark:text-amber-400" />
        ) : (
          <Luggage size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
        )}
        <span>
          {isNoChecked
            ? lt(locale, {
                fa: 'بدون بار تحویلی',
                en: 'No Checked Bag',
                ar: 'بدون أمتعة مسجلة',
                zh: '无托运行李',
                ru: 'Без багажа',
              })
            : lt(locale, {
                fa: `بار: ${checkedBaggage}`,
                en: `Checked: ${checkedBaggage}`,
                ar: `الأمتعة: ${checkedBaggage}`,
                zh: `托运: ${checkedBaggage}`,
                ru: `Багаж: ${checkedBaggage}`,
              })}
        </span>
      </div>
    </div>
  );
}
