import { describe, it, expect } from 'vitest';
import { numberToWords, amountToWords, tomanToWords } from './number-to-words';

describe('number-to-words — فارسی', () => {
  it('spells whole numbers with scales', () => {
    expect(numberToWords(1250000)).toBe('یک میلیون و دویست و پنجاه هزار');
    expect(numberToWords(1000)).toBe('هزار'); // «هزار», not «یک هزار»
    expect(numberToWords(0)).toBe('صفر');
    expect(numberToWords(42)).toBe('چهل و دو');
  });

  it('accepts Persian digits and «٬» separators', () => {
    expect(numberToWords('۱٬۲۵۰٬۰۰۰')).toBe('یک میلیون و دویست و پنجاه هزار');
  });

  it('handles negatives and fractions', () => {
    expect(numberToWords(-42)).toBe('منفی چهل و دو');
    expect(numberToWords(12.5)).toBe('دوازده ممیز پنج');
  });

  it('amountToWords appends the unit and drops fractions', () => {
    expect(amountToWords(1250000, 'تومان')).toBe('یک میلیون و دویست و پنجاه هزار تومان');
    expect(tomanToWords(15000)).toBe('پانزده هزار تومان');
    expect(amountToWords(12.7, 'تومان')).toBe('دوازده تومان');
  });

  it('returns empty string for non-numeric input', () => {
    expect(numberToWords('abc')).toBe('');
    expect(amountToWords(NaN)).toBe('');
  });
});
