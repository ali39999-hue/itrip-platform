'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_en from 'react-date-object/locales/gregorian_en';
import { CalendarDays, X, Check, ChevronDown } from 'lucide-react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';

const ITEM_HEIGHT = 42; // height of each wheel item in px
const VISIBLE_COUNT = 5; // 5 visible rows
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT; // 210px
const SPACER_HEIGHT = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2; // 84px (2 rows above, 2 rows below)

export const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const FIRST_JALALI_YEAR = 1310;
// Current Jalali year dynamically evaluated
const CURRENT_JALALI_YEAR = (() => {
  try {
    const d = new DateObject({ date: new Date().toISOString().slice(0, 10) }).convert(persian);
    return typeof d.year === 'number' ? d.year : 1404;
  } catch {
    return 1404;
  }
})();

export function toPersianDigits(n: number | string): string {
  const str = String(n);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/\d/g, (d) => persianDigits[parseInt(d, 10)] || d);
}

export function formatYear(year: number, locale: string): string {
  if (['fa', 'ar'].includes(locale)) {
    return toPersianDigits(year);
  }
  return String(year);
}

const DECADE_SHORTCUTS = [
  { decade: 1350, year: 1355 },
  { decade: 1360, year: 1365 },
  { decade: 1370, year: 1375 },
  { decade: 1380, year: 1385 },
  { decade: 1390, year: 1395 },
  { decade: 1400, year: 1400 },
];

export function daysInJalaliMonth(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  try {
    const leap = new DateObject({ calendar: persian, year, month: 1, day: 1 }).isLeap;
    return leap ? 30 : 29;
  } catch {
    return 29;
  }
}

export function jalaliPartsFromIso(iso: string | undefined | null) {
  if (!iso || typeof iso !== 'string') return null;
  const clean = iso.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return null;
  try {
    const g = new DateObject({ date: clean });
    if (!g.isValid) return null;
    const p = g.convert(persian);
    return { year: p.year as number, month: p.month.number as number, day: p.day as number };
  } catch {
    return null;
  }
}

export function isoFromJalali(year: number, month: number, day: number): string {
  try {
    const j = new DateObject({ calendar: persian, year, month, day });
    if (!j.isValid) return '';
    return j.convert(gregorian, gregorian_en).format('YYYY-MM-DD');
  } catch {
    return '';
  }
}

export function formatJalaliDisplay(iso: string | undefined | null, locale: string): string {
  const p = jalaliPartsFromIso(iso);
  if (!p) return '';
  const monthName = JALALI_MONTHS[p.month - 1] || '';
  return `${num(p.day, locale)} ${monthName} ${formatYear(p.year, locale)}`;
}

interface SingleWheelProps {
  items: Array<{ value: number | string; label: string }>;
  selectedIndex: number;
  onSelect: (index: number) => void;
  ariaLabel: string;
}

function SingleWheel({ items, selectedIndex, onSelect, ariaLabel }: SingleWheelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const isProgrammatic = useRef(false);

  // Scroll to selected item when programmatic alignment is requested
  const scrollToItem = useCallback((idx: number, smooth = true) => {
    const el = containerRef.current;
    if (!el) return;
    isProgrammatic.current = true;
    if (typeof el.scrollTo === 'function') {
      el.scrollTo({
        top: idx * ITEM_HEIGHT,
        behavior: smooth ? 'smooth' : 'auto',
      });
    } else {
      el.scrollTop = idx * ITEM_HEIGHT;
    }
    setTimeout(() => {
      isProgrammatic.current = false;
    }, 250);
  }, []);

  // Sync scroll position when selectedIndex changes externally or on mount
  useEffect(() => {
    scrollToItem(selectedIndex, false);
  }, [selectedIndex, scrollToItem]);

  const handleScroll = () => {
    if (isProgrammatic.current) return;
    if (scrollDebounceTimer.current) clearTimeout(scrollDebounceTimer.current);

    scrollDebounceTimer.current = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      const newIdx = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM_HEIGHT)));
      if (newIdx !== selectedIndex) {
        onSelect(newIdx);
      }
    }, 60);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = Math.max(0, selectedIndex - 1);
      scrollToItem(next, true);
      onSelect(next);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const next = Math.min(items.length - 1, selectedIndex + 1);
      scrollToItem(next, true);
      onSelect(next);
    }
  };

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label={ariaLabel}
      tabIndex={0}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      className="relative flex-1 min-w-0 overflow-y-auto snap-y snap-mandatory no-scrollbar touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-xl select-none"
      style={{ height: WHEEL_HEIGHT }}
    >
      <div style={{ height: SPACER_HEIGHT }} aria-hidden="true" />
      {items.map((item, idx) => {
        const isSelected = idx === selectedIndex;
        return (
          <div
            key={item.value}
            role="option"
            aria-selected={isSelected}
            onClick={() => {
              scrollToItem(idx, true);
              onSelect(idx);
            }}
            className={`h-[42px] flex items-center justify-center snap-center text-center cursor-pointer transition-all ${
              isSelected
                ? 'text-brand-dark font-black text-[15px] sm:text-[16px] scale-105'
                : 'text-sub/60 hover:text-sub font-bold text-[13px] sm:text-[14px]'
            }`}
          >
            {item.label}
          </div>
        );
      })}
      <div style={{ height: SPACER_HEIGHT }} aria-hidden="true" />
    </div>
  );
}

export interface JalaliWheelDatePickerProps {
  value?: string | undefined;
  onChange?: (iso: string | undefined) => void;
  error?: boolean;
  className?: string;
  id?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Shamsi (Jalali) Birth Date Wheel Picker
 * - Form-friendly trigger input displaying formatted Persian date.
 * - Mobile bottom sheet / Desktop centered modal.
 * - 3 smooth snap-scroll wheels (Year, Month, Day) with touch & wheel support.
 * - Quick decade jump chips (۱۳۵۰، ۱۳۶۰، ۱۳۷۰، ۱۳۸۰، ۱۳۹۰، ۱۴۰۰).
 * - Emits standard Gregorian ISO YYYY-MM-DD for backend/zod compatibility.
 */
export function JalaliWheelDatePicker({
  value,
  onChange,
  error = false,
  className = '',
  id,
  label,
  placeholder,
  disabled = false,
}: JalaliWheelDatePickerProps) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Parse existing ISO value or fallback to sensible default (approx age 30)
  const initialParts = useMemo(() => {
    return jalaliPartsFromIso(value) || {
      year: Math.min(1374, CURRENT_JALALI_YEAR - 25),
      month: 1,
      day: 1,
    };
  }, [value]);

  // Working state while dialog is open
  const [selectedYear, setSelectedYear] = useState(initialParts.year);
  const [selectedMonth, setSelectedMonth] = useState(initialParts.month);
  const [selectedDay, setSelectedDay] = useState(initialParts.day);

  // Sync working state when dialog opens
  const handleOpen = () => {
    if (disabled) return;
    const parts = jalaliPartsFromIso(value) || {
      year: Math.min(1374, CURRENT_JALALI_YEAR - 25),
      month: 1,
      day: 1,
    };
    setSelectedYear(parts.year);
    setSelectedMonth(parts.month);
    setSelectedDay(parts.day);
    setOpen(true);
  };

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  // Build wheel data arrays
  const years = useMemo(() => {
    const list: Array<{ value: number; label: string }> = [];
    for (let y = CURRENT_JALALI_YEAR; y >= FIRST_JALALI_YEAR; y--) {
      list.push({ value: y, label: formatYear(y, locale) });
    }
    return list;
  }, [locale]);

  const months = useMemo(() => {
    return JALALI_MONTHS.map((name, i) => ({
      value: i + 1,
      label: name,
    }));
  }, []);

  const maxDays = daysInJalaliMonth(selectedYear, selectedMonth);

  const days = useMemo(() => {
    const list: Array<{ value: number; label: string }> = [];
    for (let d = 1; d <= maxDays; d++) {
      list.push({ value: d, label: num(d, locale) });
    }
    return list;
  }, [maxDays, locale]);

  // Auto-clamp day if month changes and current day exceeds maxDays
  useEffect(() => {
    if (selectedDay > maxDays) {
      setSelectedDay(maxDays);
    }
  }, [maxDays, selectedDay]);

  const yearIndex = Math.max(0, years.findIndex((y) => y.value === selectedYear));
  const monthIndex = Math.max(0, selectedMonth - 1);
  const dayIndex = Math.max(0, Math.min(days.length - 1, selectedDay - 1));

  // Current preview string inside dialog
  const activeIso = useMemo(() => {
    return isoFromJalali(selectedYear, selectedMonth, selectedDay);
  }, [selectedYear, selectedMonth, selectedDay]);

  const activeDisplay = `${num(selectedDay, locale)} ${JALALI_MONTHS[selectedMonth - 1]} ${num(selectedYear, locale)}`;

  // Confirm selection
  const handleConfirm = () => {
    if (onChange) {
      const iso = isoFromJalali(selectedYear, selectedMonth, selectedDay);
      onChange(iso);
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onChange) onChange(undefined);
  };

  const formattedDisplay = value ? formatJalaliDisplay(value, locale) : '';

  const defaultPlaceholder = lt(locale, {
    fa: 'انتخاب تاریخ تولد (شمسی)',
    en: 'Select date of birth (Jalali)',
    ar: 'اختر تاريخ الميلاد (شمسي)',
    zh: '选择出生日期（波斯历）',
    ru: 'Выберите дату рождения (персидский)',
  });

  return (
    <>
      {label && (
        <label className="block text-[12px] font-bold text-ink mb-1.5" htmlFor={id}>
          {label}
        </label>
      )}

      {/* Input Trigger Field */}
      <div
        id={id}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpen();
          }
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`w-full min-h-[48px] sm:min-h-[52px] px-3.5 py-2 rounded-xl sm:rounded-2xl bg-surface border transition flex items-center justify-between gap-2.5 cursor-pointer shadow-xs ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-soft'
            : error
              ? 'border-rose-500 ring-2 ring-rose-500/20'
              : 'border-line/80 hover:border-brand hover:shadow-sm focus-visible:ring-2 focus-visible:ring-brand'
        } ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-mint/50 text-brand-dark flex items-center justify-center shrink-0">
            <CalendarDays size={16} aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1 text-start">
            {formattedDisplay ? (
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-[13px] sm:text-[14px] font-black text-ink truncate">
                  {formattedDisplay}
                </span>
                <span className="text-[10.5px] font-mono text-sub font-bold" dir="ltr">
                  ({value})
                </span>
              </div>
            ) : (
              <span className="text-[12.5px] sm:text-[13px] font-bold text-sub truncate block">
                {placeholder || defaultPlaceholder}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              aria-label={lt(locale, { fa: 'پاک کردن تاریخ', en: 'Clear date', ar: 'مسح التاريخ', zh: '清空日期', ru: 'Очистить' })}
              className="min-w-[44px] min-h-[44px] rounded-full text-sub hover:text-ink hover:bg-soft flex items-center justify-center transition cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown size={16} className="text-sub/70" />
        </div>
      </div>

      {/* Modal / Bottom Sheet */}
      {open && mounted && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="wheel-picker-title"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[260] bg-ink/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-surface border-t sm:border border-line shadow-2xl rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
          >
            {/* Mobile Drag Indicator */}
            <div className="sm:hidden -mt-1 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 id="wheel-picker-title" className="text-sm sm:text-base font-black text-ink m-0">
                  {lt(locale, {
                    fa: 'انتخاب تاریخ تولد (تقویم شمسی)',
                    en: 'Select Date of Birth (Jalali)',
                    ar: 'تحديد تاريخ الميلاد (التقويم الهجري الشمسي)',
                    zh: '选择出生日期（波斯历）',
                    ru: 'Выберите дату рождения (солнечная хиджра)',
                  })}
                </h3>
                <span className="text-[11px] text-sub font-bold block mt-0.5">
                  {lt(locale, {
                    fa: 'مطابق با کارت ملی یا شناسنامه',
                    en: 'Matching National ID / Passport',
                    ar: 'مطابق لبطاقة الهوية أو الجواز',
                    zh: '须与有效证件一致',
                    ru: 'Согласно удостоверению личности',
                  })}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={lt(locale, { fa: 'بستن', en: 'Close', ar: 'إغلاق', zh: '关闭', ru: 'Закрыть' })}
                className="min-w-[44px] min-h-[44px] rounded-full bg-soft hover:bg-line/60 text-sub flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Live Preview Display */}
            <div className="p-3 rounded-2xl bg-mint/40 border border-brand/20 flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-bold text-sub block">
                  {lt(locale, { fa: 'تاریخ انتخاب شده:', en: 'Selected date:', ar: 'التاريخ المحدد:', zh: '已选日期：', ru: 'Выбранная дата:' })}
                </span>
                <span className="text-base sm:text-lg font-black text-brand-dark">
                  {activeDisplay}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-sub bg-surface/80 px-2.5 py-1 rounded-lg border border-line" dir="ltr">
                {activeIso}
              </span>
            </div>

            {/* Decade Quick Jump Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-sub block">
                {lt(locale, { fa: 'پرش سریع به دهه تولد:', en: 'Quick Jump by Decade:', ar: 'الانتقال السريع للعقد:', zh: '快速跳转年代：', ru: 'Быстрый выбор десятилетия:' })}
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {DECADE_SHORTCUTS.map((dec) => {
                  const isNear = Math.abs(selectedYear - dec.year) <= 5;
                  return (
                    <button
                      key={dec.decade}
                      type="button"
                      onClick={() => setSelectedYear(dec.year)}
                      className={`min-h-[32px] px-3 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                        isNear
                          ? 'bg-brand text-surface shadow-xs'
                          : 'bg-soft hover:bg-mint/40 text-ink border border-line'
                      }`}
                    >
                      {formatYear(dec.decade, locale)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-3 gap-2 px-1 text-center text-[11.5px] font-black text-sub">
              <div>{lt(locale, { fa: 'سال', en: 'Year', ar: 'السنة', zh: '年份', ru: 'Год' })}</div>
              <div>{lt(locale, { fa: 'ماه', en: 'Month', ar: 'الشهر', zh: '月份', ru: 'Месяц' })}</div>
              <div>{lt(locale, { fa: 'روز', en: 'Day', ar: 'اليوم', zh: '日期', ru: 'День' })}</div>
            </div>

            {/* 3 Wheel Columns Container with Central Highlight Band */}
            <div className="relative rounded-2xl bg-soft/60 border border-line p-1">
              {/* Highlight Band across all 3 wheels */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-1 top-1/2 -translate-y-1/2 h-[42px] rounded-xl bg-mint/80 border border-brand/40 shadow-xs z-0"
              />

              {/* Gradient Fade Top & Bottom */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-2xl bg-gradient-to-b from-surface via-surface/70 to-transparent z-10"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-16 rounded-b-2xl bg-gradient-to-t from-surface via-surface/70 to-transparent z-10"
              />

              {/* 3 Columns */}
              <div className="relative z-0 flex items-center gap-1">
                {/* Year Column */}
                <SingleWheel
                  items={years}
                  selectedIndex={yearIndex}
                  onSelect={(idx) => setSelectedYear(years[idx]?.value || selectedYear)}
                  ariaLabel={lt(locale, { fa: 'سال', en: 'Year', ar: 'السنة', zh: '年', ru: 'Год' })}
                />

                {/* Month Column */}
                <SingleWheel
                  items={months}
                  selectedIndex={monthIndex}
                  onSelect={(idx) => setSelectedMonth(months[idx]?.value || selectedMonth)}
                  ariaLabel={lt(locale, { fa: 'ماه', en: 'Month', ar: 'الشهر', zh: 'ماه', ru: 'Месяц' })}
                />

                {/* Day Column */}
                <SingleWheel
                  items={days}
                  selectedIndex={dayIndex}
                  onSelect={(idx) => setSelectedDay(days[idx]?.value || selectedDay)}
                  ariaLabel={lt(locale, { fa: 'روز', en: 'Day', ar: 'اليوم', zh: 'روز', ru: 'День' })}
                />
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 min-h-[48px] rounded-xl bg-soft hover:bg-line/60 text-sub font-black text-xs sm:text-sm cursor-pointer transition active:scale-[0.98]"
              >
                {lt(locale, { fa: 'انصراف', en: 'Cancel', ar: 'إلغاء', zh: '取消', ru: 'Отмена' })}
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className="flex-2 min-h-[48px] rounded-xl bg-action hover:bg-action-hover active:bg-action-active text-ink font-black text-xs sm:text-sm shadow-md shadow-action/25 flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.98]"
              >
                <Check size={16} />
                <span>
                  {lt(locale, {
                    fa: 'تایید تاریخ تولد',
                    en: 'Confirm Date of Birth',
                    ar: 'تأكيد تاريخ الميلاد',
                    zh: '确认出生日期',
                    ru: 'Подтвердить дату',
                  })}
                </span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
