import { describe, it, expect } from 'vitest';
import {
  getCurrencyLabel,
  parsePriceInput,
  formatNumberWithCommas,
  getHumanAmountWords,
  getRialTomanConversionHint,
} from './currencies';

describe('Currencies & Price Formatting Utility', () => {
  describe('getCurrencyLabel', () => {
    it('returns proper labels for TOMAN in different locales', () => {
      expect(getCurrencyLabel('TOMAN', 'fa')).toBe('تومان');
      expect(getCurrencyLabel('TOMAN', 'en')).toBe('Toman');
      expect(getCurrencyLabel('TOMAN', 'ar')).toBe('تومان');
      expect(getCurrencyLabel('TOMAN', 'zh')).toBe('图曼');
      expect(getCurrencyLabel('TOMAN', 'ru')).toBe('томанов');
    });

    it('returns proper labels for IRR in different locales', () => {
      expect(getCurrencyLabel('IRR', 'fa')).toBe('ریال');
      expect(getCurrencyLabel('IRR', 'en')).toBe('IRR');
      expect(getCurrencyLabel('IRR', 'ar')).toBe('ريال');
      expect(getCurrencyLabel('IRR', 'zh')).toBe('里亚尔');
      expect(getCurrencyLabel('IRR', 'ru')).toBe('риалов');
    });

    it('returns proper symbols for international currencies', () => {
      expect(getCurrencyLabel('USD', 'fa')).toBe('دلار ($)');
      expect(getCurrencyLabel('USD', 'en')).toBe('$');
      expect(getCurrencyLabel('EUR', 'fa')).toBe('یورو (€)');
      expect(getCurrencyLabel('EUR', 'en')).toBe('€');
      expect(getCurrencyLabel('AED', 'fa')).toBe('د.إ');
      expect(getCurrencyLabel('AED', 'en')).toBe('AED');
      expect(getCurrencyLabel('CNY', 'fa')).toBe('یوان (¥)');
      expect(getCurrencyLabel('CNY', 'en')).toBe('¥');
    });

    it('defaults to TOMAN when undefined or empty', () => {
      expect(getCurrencyLabel(undefined, 'fa')).toBe('تومان');
      expect(getCurrencyLabel('', 'fa')).toBe('تومان');
    });
  });

  describe('parsePriceInput', () => {
    it('normalizes Persian digits and strips commas', () => {
      expect(parsePriceInput('۸۵,۰۰۰,۰۰۰')).toBe(85000000);
      expect(parsePriceInput('۵,۰۰۰')).toBe(5000);
    });

    it('handles Arabic-Indic digits and spaces', () => {
      expect(parsePriceInput('١٢,٠٠٠,٠٠٠')).toBe(12000000);
      expect(parsePriceInput(' 10,000,000 ')).toBe(10000000);
    });

    it('handles numeric input and null/undefined gracefully', () => {
      expect(parsePriceInput(45000000)).toBe(45000000);
      expect(parsePriceInput(null)).toBe(0);
      expect(parsePriceInput(undefined)).toBe(0);
      expect(parsePriceInput('')).toBe(0);
      expect(parsePriceInput('invalid')).toBe(0);
    });
  });

  describe('formatNumberWithCommas', () => {
    it('formats number with commas', () => {
      expect(formatNumberWithCommas(85000000)).toBe('85,000,000');
      expect(formatNumberWithCommas('1234567')).toBe('1,234,567');
      expect(formatNumberWithCommas('۸۵۰۰۰۰۰۰')).toBe('85,000,000');
      expect(formatNumberWithCommas(null)).toBe('');
      expect(formatNumberWithCommas(undefined)).toBe('');
      expect(formatNumberWithCommas('')).toBe('');
    });
  });

  describe('getHumanAmountWords', () => {
    it('formats Toman amounts into Persian words', () => {
      expect(getHumanAmountWords(85000000, 'TOMAN')).toBe('۸۵ میلیون تومان');
      expect(getHumanAmountWords(1500000000, 'TOMAN')).toBe('۱.۵ میلیارد تومان');
      expect(getHumanAmountWords(500000, 'TOMAN')).toBe('۵۰۰ هزار تومان');
    });

    it('formats Rial amounts and includes Toman equivalent', () => {
      const irrText = getHumanAmountWords(850000000, 'IRR');
      expect(irrText).toContain('۸۵۰ میلیون ریال');
      expect(irrText).toContain('۸۵ میلیون تومان');
    });

    it('formats international currencies', () => {
      expect(getHumanAmountWords(1500, 'USD')).toContain('دلار آمریکا');
      expect(getHumanAmountWords(1500, 'EUR')).toContain('یورو');
      expect(getHumanAmountWords(1500, 'AED')).toContain('درهم امارات');
      expect(getHumanAmountWords(1500, 'CNY')).toContain('یوان چین');
    });

    it('returns empty string for zero or negative values', () => {
      expect(getHumanAmountWords(0, 'TOMAN')).toBe('');
      expect(getHumanAmountWords(-100, 'TOMAN')).toBe('');
    });
  });

  describe('getRialTomanConversionHint', () => {
    it('provides Toman equivalent hint for Rial inputs (one less zero)', () => {
      const hint = getRialTomanConversionHint(850000000, 'IRR');
      expect(hint).toBe('معادل به تومان: 85,000,000 تومان (یک صفر کمتر)');
    });

    it('provides banking Rial equivalent hint for Toman inputs (one more zero)', () => {
      const hint = getRialTomanConversionHint(85000000, 'TOMAN');
      expect(hint).toBe('معادل ریال بانکی: 850,000,000 ریال (برای درگاه شتاب و شاپرک)');
    });

    it('returns null for foreign currencies or zero', () => {
      expect(getRialTomanConversionHint(1000, 'USD')).toBeNull();
      expect(getRialTomanConversionHint(0, 'TOMAN')).toBeNull();
    });
  });
});
