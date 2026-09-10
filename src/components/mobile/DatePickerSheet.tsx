'use client';

import React, { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/Sheet';
import { CalendarDays, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { dualDate } from '@/lib/jalali';
import { daysFromNow } from '@/lib/utils';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

interface DatePickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value?: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  title?: string;
  minDate?: string;
}

export function DatePickerSheet({
  open,
  onOpenChange,
  value,
  onChange,
  title,
  minDate = daysFromNow(0),
}: DatePickerSheetProps) {
  const locale = useLocale();
  const [selectedDate, setSelectedDate] = useState<string>(value || daysFromNow(1));

  React.useEffect(() => {
    if (value) setSelectedDate(value);
  }, [value, open]);

  const presets = [
    { label: { fa: 'امروز', en: 'Today', ar: 'اليوم', zh: '今天', ru: 'Сегодня' }, date: daysFromNow(0) },
    { label: { fa: 'فردا', en: 'Tomorrow', ar: 'غداً', zh: '明天', ru: 'Завтра' }, date: daysFromNow(1) },
    { label: { fa: '۳ روز دیگر', en: 'In 3 Days', ar: 'بعد 3 أيام', zh: '3天后', ru: 'Через 3 дня' }, date: daysFromNow(3) },
    { label: { fa: 'آخر هفته', en: 'Weekend', ar: 'عطلة نهاية الأسبوع', zh: '周末', ru: 'Выходные' }, date: daysFromNow(4) },
    { label: { fa: 'هفته آینده', en: 'Next Week', ar: 'الأسبوع القادم', zh: '下周', ru: 'След. неделя' }, date: daysFromNow(7) },
  ];

  // Generate next 28 days for rapid touch selection
  const days = Array.from({ length: 28 }, (_, i) => daysFromNow(i));

  const handleSelect = (d: string) => {
    setSelectedDate(d);
  };

  const handleConfirm = () => {
    onChange(selectedDate);
    onOpenChange(false);
  };

  const selectedInfo = dualDate(selectedDate);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} side="bottom">
      <SheetContent className="max-w-lg mx-auto pb-6">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-line">
          <CalendarDays size={18} className="text-brand-dark" aria-hidden="true" />
          <h3 className="text-base font-black text-ink">
            {title ||
              lt(locale, {
                fa: 'انتخاب تاریخ حرکت',
                en: 'Select Travel Date',
                ar: 'تحديد موعد السفر',
                zh: '选择出发日期',
                ru: 'Выберите дату',
              })}
          </h3>
        </div>

        {/* Quick Presets Horizontal Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {presets.map((p, idx) => {
            const isSelected = selectedDate === p.date;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(p.date)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-black shrink-0 transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-soft text-sub hover:text-ink hover:bg-line/60 border border-line/60'
                }`}
              >
                {lt(locale, p.label)}
              </button>
            );
          })}
        </div>

        {/* Selected Date Summary Banner */}
        <div className="my-3 p-3.5 rounded-2xl bg-mint/50 border border-mint-bright/40 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-sub block">
              {lt(locale, {
                fa: 'تاریخ انتخاب‌شده:',
                en: 'Selected Date:',
                ar: 'التاريخ المحدد:',
                zh: '已选日期：',
                ru: 'Выбранная дата:',
              })}
            </span>
            <span className="text-base font-black text-ink">
              {selectedInfo.weekday}، {selectedInfo.j}
            </span>
          </div>
          <span className="text-xs font-bold text-brand-dark font-en bg-surface px-2.5 py-1 rounded-xl border border-line">
            {selectedInfo.g}
          </span>
        </div>

        {/* Rapid Touch Day Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 max-h-[42vh] overflow-y-auto p-1">
          {days.map((dStr) => {
            const info = dualDate(dStr);
            const isSelected = selectedDate === dStr;
            const isPast = dStr < minDate;

            return (
              <button
                key={dStr}
                type="button"
                disabled={isPast}
                onClick={() => handleSelect(dStr)}
                className={`min-h-[64px] p-2 rounded-2xl border text-center flex flex-col items-center justify-center transition-all ${
                  isPast
                    ? 'opacity-30 border-line bg-soft cursor-not-allowed'
                    : isSelected
                      ? 'bg-brand text-white border-brand shadow-brand scale-[1.02] font-black'
                      : 'bg-surface border-line/70 hover:border-brand/40 text-ink active:scale-95'
                }`}
              >
                <span
                  className={`text-[10px] ${
                    isSelected ? 'text-white/80' : 'text-sub'
                  } font-bold leading-tight`}
                >
                  {info.weekday?.slice(0, 3)}
                </span>
                <span className="text-sm font-black my-0.5 leading-tight">{info.j?.split(' ')[0]}</span>
                <span
                  className={`text-[9px] font-en ${
                    isSelected ? 'text-white/70' : 'text-sub/70'
                  }`}
                >
                  {info.g?.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sticky Confirm Button */}
        <div className="mt-4 pt-3 border-t border-line">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full min-h-[50px] rounded-2xl bg-brand hover:bg-brand-dark text-white font-black text-sm active:scale-95 transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Check size={18} />
            <span>
              {lt(locale, {
                fa: 'تایید و ادامه جستجو',
                en: 'Confirm Date',
                ar: 'تأكيد التاريخ والمتابعة',
                zh: '确认日期',
                ru: 'Подтвердить дату',
              })}
            </span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
