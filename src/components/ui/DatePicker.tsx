'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_en from 'react-date-object/locales/gregorian_en';
import gregorian_ar from 'react-date-object/locales/gregorian_ar';
import { CalendarDays, X } from 'lucide-react';
import { useLocale } from 'next-intl';

const DatePicker = dynamic(() => import('react-multi-date-picker'), {
  ssr: false,
});
// تقویم inline برای شیت موبایل
const Calendar = dynamic(() => import('react-multi-date-picker').then((m) => m.Calendar), {
  ssr: false,
});

interface JalaliDatePickerProps {
  value?: string | undefined;
  onChange?: (date: string | undefined) => void;
  label?: string;
  placeholder?: string;
  minDate?: Date | string | number | DateObject;
  maxDate?: Date | string | number | DateObject;
  className?: string;
  error?: boolean;
  id?: string;
  format?: string;
}

export function JalaliDatePicker({
  value,
  onChange,
  label,
  placeholder,
  minDate,
  maxDate,
  className = '',
  error,
  id = 'jalali-date-picker',
  format,
}: JalaliDatePickerProps) {
  const locale = useLocale();
  const isFa = locale === 'fa';

  // Convert incoming string (YYYY-MM-DD) to DateObject in local time without UTC rollback
  const parsedDate = value ? new Date(value.includes('T') ? value : `${value}T00:00:00`) : undefined;
  const dateObj = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : undefined;

  const defaultPlaceholder = locale === 'fa'
    ? 'انتخاب تاریخ'
    : locale === 'ar'
      ? 'اختر التاريخ'
      : locale === 'zh'
        ? '选择日期'
        : locale === 'ru'
          ? 'Выберите дату'
          : 'Select date';

  const getLocale = () => {
    if (locale === 'fa') return persian_fa;
    if (locale === 'ar') return gregorian_ar;
    return gregorian_en;
  };

  // ---------- موبایل: bottom-sheet (قاعده <768px) — دسکتاپ: پاپ‌آپ مثل قبل ----------
  const [isMobile, setIsMobile] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const displayValue = dateObj
    ? new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR-u-ca-persian' : locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(dateObj)
    : '';

  const fieldClasses = `relative w-full min-h-[50px] sm:min-h-[58px] px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-surface border transition flex items-center gap-2.5 ${
    error
      ? 'border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20'
      : 'border-line/80 hover:border-brand focus-within:border-brand focus-within:ring-2 focus-within:ring-brand'
  } ${className}`;

  const commit = (d: DateObject | null) => {
    if (!onChange) return;
    if (!d) {
      onChange(undefined);
      return;
    }
    // Always return ISO format string (YYYY-MM-DD) for backend compatibility
    onChange(d.convert(gregorian, gregorian_en).format('YYYY-MM-DD'));
  };

  if (isMobile) {
    return (
      <>
        <div
          role="button"
          tabIndex={0}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          onClick={() => setSheetOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSheetOpen(true);
            }
          }}
          className={`${fieldClasses} cursor-pointer active:scale-[0.99]`}
        >
          <CalendarDays size={18} className="text-brand-dark shrink-0" aria-hidden="true" />
          <div className="w-full min-w-0 flex flex-col justify-center">
            {label && (
              <span className="block text-[11px] font-bold text-sub select-none leading-none mb-1">
                {label}
              </span>
            )}
            <span
              id={id}
              className={`w-full bg-transparent border-0 outline-0 p-0 text-base md:text-[13px] font-bold leading-tight truncate ${
                displayValue ? 'text-ink' : 'text-sub'
              }`}
            >
              {displayValue || placeholder || defaultPlaceholder}
            </span>
          </div>
        </div>

        {sheetOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={label || defaultPlaceholder}
            className="fixed inset-0 z-[200] flex items-end justify-center bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setSheetOpen(false)}
          >
            <div
              className="w-full max-w-md bg-surface rounded-t-3xl border-t border-line shadow-elev-3 animate-in slide-in-from-bottom-4 duration-200 pb-[max(1rem,env(safe-area-inset-bottom))]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pt-3 pb-1" aria-hidden="true">
                <div className="w-10 h-1 rounded-full bg-line mx-auto" />
              </div>
              <div className="flex items-center justify-between px-5 pb-2">
                <h3 className="text-sm font-black text-ink m-0">{label || defaultPlaceholder}</h3>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  aria-label="بستن"
                  className="min-w-[44px] min-h-[44px] -me-2 rounded-full bg-soft text-sub grid place-items-center hover:text-ink transition"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="px-3 pb-2 flex justify-center">
                <Calendar
                  value={dateObj}
                  onChange={(d: DateObject | null) => {
                    commit(d);
                    setSheetOpen(false);
                  }}
                  calendar={isFa ? persian : gregorian}
                  locale={getLocale()}
                  minDate={minDate}
                  maxDate={maxDate}
                  format={format || (isFa ? 'YYYY/MM/DD' : 'YYYY-MM-DD')}
                  className="rmdp-mobile-sheet"
                />
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className={fieldClasses}>
      <CalendarDays size={18} className="text-brand-dark shrink-0" aria-hidden="true" />
      <div className="w-full min-w-0 flex flex-col justify-center">
        {label && (
          <label htmlFor={id} className="block text-[11px] font-bold text-sub select-none leading-none mb-1">
            {label}
          </label>
        )}
        <DatePicker
          id={id}
          value={dateObj}
          onChange={commit}
          calendar={isFa ? persian : gregorian}
          locale={getLocale()}
          calendarPosition="bottom-center"
          minDate={minDate}
          maxDate={maxDate}
          containerClassName="w-full"
          inputClass="w-full bg-transparent border-0 outline-0 p-0 text-base md:text-[13px] font-bold text-ink cursor-pointer placeholder:text-sub focus:ring-0 leading-tight"
          placeholder={placeholder || defaultPlaceholder}
          format={format || (isFa ? 'YYYY/MM/DD' : 'YYYY-MM-DD')}
        />
      </div>
    </div>
  );
}

export { JalaliDatePicker as DatePicker };
