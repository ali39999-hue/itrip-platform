'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import { X, ArrowLeft, Scale, AlertCircle } from 'lucide-react';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import type { Flight } from '@/lib/types';
import { AirlineLogo } from './AirlineLogo';

export interface FlightCompareBarProps {
  cmp: Set<string>;
  flights: Flight[];
  onToggleCmp: (id: string) => void;
  onClearCmp: () => void;
  onCompareAction: () => void;
}

export function FlightCompareBar({
  cmp,
  flights,
  onToggleCmp,
  onClearCmp,
  onCompareAction,
}: FlightCompareBarProps) {
  const locale = useLocale();

  if (cmp.size === 0) return null;

  const canCompare = cmp.size >= 2;

  return (
    <aside
      aria-label={lt(locale, { fa: 'نوار مقایسه پروازها', en: 'Flight comparison bar', ar: 'شريط مقارنة الرحلات', zh: '航班对比栏', ru: 'Панель сравнения рейсов' })}
      className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] lg:bottom-6 start-3 end-3 sm:start-auto sm:end-8 sm:w-[490px] bg-surface/95 backdrop-blur-md border border-brand/35 rounded-2xl p-3.5 sm:p-4 shadow-elev-3 z-50 animate-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <Scale size={18} className="text-brand shrink-0" />
          <span className="text-xs sm:text-sm font-black text-ink">
            {lt(locale, {
              fa: `مقایسه پروازها (${num(cmp.size, locale)} از ۳)`,
              en: `Compare flights (${num(cmp.size, locale)} of 3)`,
              ar: `مقارنة الرحلات (${num(cmp.size, locale)} من ٣)`,
              zh: `比较航班（${num(cmp.size, locale)}/3）`,
              ru: `Сравнение рейсов (${num(cmp.size, locale)} из 3)`,
            })}
          </span>
        </div>
        <button
          type="button"
          onClick={onClearCmp}
          className="text-[11px] sm:text-xs font-bold text-sub hover:text-destructive transition"
        >
          {lt(locale, { fa: 'پاک کردن همه', en: 'Clear all', ar: 'مسح الكل', zh: '清除全部', ru: 'Сбросить всё' })}
        </button>
      </div>

      {/* Selected Flight Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none snap-x touch-pan-x">
        {Array.from(cmp).map((id) => {
          const fl = flights.find((x) => x.id === id);
          return (
            <div
              key={id}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-soft border border-line text-xs shrink-0"
            >
              {fl && (
                <AirlineLogo
                  airline={fl.airline}
                  airlineEn={fl.airlineEn}
                  size={20}
                />
              )}
              <div className="flex flex-col">
                <span className="font-extrabold text-ink text-[11.5px] leading-tight">
                  {fl ? fl.airline : `Flight #${id}`}
                </span>
                <span className="font-mono text-[10px] text-sub">
                  {fl ? `${fl.flightNo} · ${num(fl.price, locale)}` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onToggleCmp(id)}
                aria-label={lt(locale, { fa: 'حذف از مقایسه', en: 'Remove from comparison', ar: 'إزالة من المقارنة', zh: '移出对比', ru: 'Удалить из сравнения' })}
                className="text-sub hover:text-destructive ms-1 p-0.5"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Action CTA Button */}
      <button
        type="button"
        onClick={onCompareAction}
        disabled={!canCompare}
        className="w-full min-h-[44px] px-4 rounded-xl bg-action hover:bg-action-hover disabled:bg-soft disabled:text-sub/60 disabled:cursor-not-allowed text-ink text-xs sm:text-sm font-black shadow-sm transition active:scale-[0.98] flex items-center justify-center gap-2"
      >
        <span>
          {canCompare
            ? lt(locale, {
                fa: 'مقایسه رو در روی پروازهای انتخابی',
                en: 'Compare Selected Flights',
                ar: 'مقارنة الرحلات المحددة جنباً إلى جنب',
                zh: '对比所选航班详情',
                ru: 'Сравнить выбранные рейсы',
              })
            : lt(locale, {
                fa: 'حداقل ۲ پرواز برای مقایسه انتخاب کنید',
                en: 'Select at least 2 flights to compare',
                ar: 'اختر رحلتين على الأقل للمقارنة',
                zh: '请至少选择 2 个航班进行对比',
                ru: 'Выберите минимум 2 рейса для сравнения',
              })}
        </span>
        {canCompare ? (
          <ArrowLeft size={16} className="ltr:rotate-180 shrink-0" />
        ) : (
          <AlertCircle size={15} className="shrink-0" />
        )}
      </button>
    </aside>
  );
}
