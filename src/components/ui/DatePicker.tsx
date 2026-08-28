'use client';

import React from 'react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_en from 'react-date-object/locales/gregorian_en';
import { CalendarIcon } from 'lucide-react';
import { useLocale } from 'next-intl';

interface JalaliDatePickerProps {
  value: string | undefined;
  onChange: (date: string | undefined) => void;
  placeholder?: string;
  minDate?: Date | string | number | DateObject;
  maxDate?: Date | string | number | DateObject;
  className?: string;
  error?: boolean;
}

export function JalaliDatePicker({ value, onChange, placeholder, minDate, maxDate, className, error }: JalaliDatePickerProps) {
  const locale = useLocale();
  const isRtl = ['fa', 'ar'].includes(locale);

  // Convert incoming string (YYYY-MM-DD) to DateObject if needed
  const dateObj = value ? new Date(value) : undefined;

  return (
    <div className={`relative ${className || ''}`}>
      <DatePicker
        value={dateObj}
        onChange={(d: DateObject | null) => {
          if (!d) {
            onChange(undefined);
            return;
          }
          // Always return ISO format string (YYYY-MM-DD) for backend compatibility
          onChange(d.convert(gregorian, gregorian_en).format('YYYY-MM-DD'));
        }}
        calendar={(isRtl ? persian : undefined) as any}
        locale={(isRtl ? persian_fa : undefined) as any}
        calendarPosition="bottom-center"
        minDate={minDate}
        maxDate={maxDate}
        containerClassName="w-full"
        inputClass={`w-full h-12 px-4 py-2 border rounded-xl text-[14px] font-bold outline-none transition-all focus:ring-2 bg-transparent ps-11 text-start ${
          error ? 'border-rose-warm focus:ring-rose-warm/20 text-rose-warm' : 'border-line focus:ring-brand/20 text-ink'
        }`}
        placeholder={placeholder}
        format={isRtl ? 'YYYY/MM/DD' : 'MM/DD/YYYY'}
      />
      <CalendarIcon 
        size={20} 
        className="absolute top-1/2 -translate-y-1/2 text-sub pointer-events-none start-4" 
      />
    </div>
  );
}
