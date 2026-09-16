// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import {
  JalaliWheelDatePicker,
  daysInJalaliMonth,
  isoFromJalali,
  jalaliPartsFromIso,
  formatJalaliDisplay,
} from './JalaliWheelDatePicker';

const messages = {
  Common: {},
};

function renderPicker(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="fa" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe('JalaliWheelDatePicker Component & Arithmetic', () => {
  describe('Jalali Calendar Math', () => {
    it('calculates 31 days for months 1 through 6', () => {
      for (let m = 1; m <= 6; m++) {
        expect(daysInJalaliMonth(1403, m)).toBe(31);
      }
    });

    it('calculates 30 days for months 7 through 11', () => {
      for (let m = 7; m <= 11; m++) {
        expect(daysInJalaliMonth(1403, m)).toBe(30);
      }
    });

    it('handles Esfand (month 12) leap vs non-leap years correctly', () => {
      // 1403 is a leap year in the Jalali calendar (30 days)
      expect(daysInJalaliMonth(1403, 12)).toBe(30);
      // 1402 is not a leap year (29 days)
      expect(daysInJalaliMonth(1402, 12)).toBe(29);
    });

    it('converts Jalali date to ISO string accurately', () => {
      // 1370-05-25 -> 1991-08-16
      const iso = isoFromJalali(1370, 5, 25);
      expect(iso).toBe('1991-08-16');

      // 1367-03-25 -> 1988-06-15
      const iso2 = isoFromJalali(1367, 3, 25);
      expect(iso2).toBe('1988-06-15');
    });

    it('extracts Jalali parts from ISO string', () => {
      const parts = jalaliPartsFromIso('1991-08-16');
      expect(parts).toEqual({ year: 1370, month: 5, day: 25 });
    });

    it('formats display string in Persian format', () => {
      const display = formatJalaliDisplay('1991-08-16', 'fa');
      expect(display).toContain('مرداد');
      expect(display).toContain('۱۳۷۰');
      expect(display).toContain('۲۵');
    });

    it('formats display string in English format', () => {
      const display = formatJalaliDisplay('1991-08-16', 'en');
      expect(display).toContain('مرداد');
      expect(display).toContain('1370');
      expect(display).toContain('25');
    });
  });

  describe('UI Interaction', () => {
    it('renders placeholder when value is empty', () => {
      renderPicker(<JalaliWheelDatePicker value="" />);
      expect(screen.getByText('انتخاب تاریخ تولد (شمسی)')).toBeTruthy();
    });

    it('renders formatted date when value is provided', () => {
      renderPicker(<JalaliWheelDatePicker value="1991-08-16" />);
      expect(screen.getByText(/مرداد/)).toBeTruthy();
      expect(screen.getByText('(1991-08-16)')).toBeTruthy();
    });

    it('opens dialog on click and displays preview and wheel columns', () => {
      renderPicker(<JalaliWheelDatePicker value="1991-08-16" />);
      const trigger = screen.getByRole('button', { name: /مرداد/ });
      fireEvent.click(trigger);

      // Dialog opens
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByText('انتخاب تاریخ تولد (تقویم شمسی)')).toBeTruthy();
      expect(screen.getByText('پرش سریع به دهه تولد:')).toBeTruthy();

      // Check for confirm and cancel buttons
      expect(screen.getByRole('button', { name: /تایید تاریخ تولد/ })).toBeTruthy();
      expect(screen.getByRole('button', { name: /انصراف/ })).toBeTruthy();
    });

    it('confirms and calls onChange with ISO date', () => {
      const handleChange = vi.fn();
      renderPicker(<JalaliWheelDatePicker value="1991-08-16" onChange={handleChange} />);

      const trigger = screen.getByRole('button', { name: /مرداد/ });
      fireEvent.click(trigger);

      const confirmBtn = screen.getByRole('button', { name: /تایید تاریخ تولد/ });
      fireEvent.click(confirmBtn);

      expect(handleChange).toHaveBeenCalledWith('1991-08-16');
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('allows clearing the date with the clear button', () => {
      const handleChange = vi.fn();
      renderPicker(<JalaliWheelDatePicker value="1991-08-16" onChange={handleChange} />);

      const clearBtn = screen.getByRole('button', { name: 'پاک کردن تاریخ' });
      fireEvent.click(clearBtn);

      expect(handleChange).toHaveBeenCalledWith(undefined);
    });

    it('closes dialog on cancel without modifying date', () => {
      const handleChange = vi.fn();
      renderPicker(<JalaliWheelDatePicker value="1991-08-16" onChange={handleChange} />);

      const trigger = screen.getByRole('button', { name: /مرداد/ });
      fireEvent.click(trigger);

      const cancelBtn = screen.getByRole('button', { name: /انصراف/ });
      fireEvent.click(cancelBtn);

      expect(handleChange).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});
