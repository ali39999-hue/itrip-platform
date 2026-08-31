'use client';

import React from 'react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_en from 'react-date-object/locales/gregorian_en';
import { CalendarDays } from 'lucide-react';
import { useLocale } from 'next-intl';

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
}: JalaliDatePickerProps) {
  const locale = useLocale();
  const isRtl = ['fa', 'ar'].includes(locale);

  // Convert incoming string (YYYY-MM-DD) to DateObject if needed
  const dateObj = value ? new Date(value) : undefined;

  return (
    <div
      className={`relative w-full min-h-[48px] md:min-h-[52px] px-3.5 py-2 rounded-2xl bg-surface border transition flex items-center gap-2.5 ${
        error
          ? 'border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20'
          : 'border-line/80 hover:border-brand focus-within:border-brand focus-within:ring-2 focus-within:ring-brand'
      } ${className}`}
    >
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
          onChange={(d: DateObject | null) => {
            if (!onChange) return;
            if (!d) {
              onChange(undefined);
              return;
            }
            // Always return ISO format string (YYYY-MM-DD) for backend compatibility
            onChange(d.convert(gregorian, gregorian_en).format('YYYY-MM-DD'));
          }}
          calendar={isRtl ? persian : gregorian}
          locale={isRtl ? persian_fa : gregorian_en}
          calendarPosition="bottom-center"
          minDate={minDate}
          maxDate={maxDate}
          containerClassName="w-full"
          inputClass="w-full bg-transparent border-0 outline-0 p-0 text-[13px] font-bold text-ink cursor-pointer placeholder:text-sub focus:ring-0 leading-tight"
          placeholder={placeholder || (isRtl ? 'انتخاب تاریخ' : 'Select date')}
          format={isRtl ? 'YYYY/MM/DD' : 'MM/DD/YYYY'}
        />
      </div>
    </div>
  );
}

export { JalaliDatePicker as DatePicker };

