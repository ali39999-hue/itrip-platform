import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calculateIcaoCheckDigit,
  checkHasSixMonthsValidity,
  COUNTRY_MRZ_PRESETS,
  generateMrzTd3,
  parseIcaoMrzTd3,
  parseMrzDate,
} from './ocr-country-validator';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-17T15:30:00Z'));
});
afterEach(() => vi.useRealTimers());

const sample = (birthDateYYMMDD = '880615', expiryDateYYMMDD = '291015') =>
  generateMrzTd3({
    countryCode: 'IRN', surname: 'SAMPLE', givenNames: 'TEST',
    passportNo: 'L2948175', nationality: 'IRN', gender: 'M',
    birthDateYYMMDD, expiryDateYYMMDD,
  });

describe('MRZ calendar dates', () => {
  it.each(['', 'abcdef', '2a0101', '260000', '261301', '260431', '250229', '260230']) (
    'rejects invalid date %s rather than formatting or rolling it over', (value) => {
      expect(parseMrzDate(value)).toBe('');
      expect(parseMrzDate(value, true)).toBe('');
    },
  );

  it('accepts leap days and keeps expiry dates in the 2000s', () => {
    expect(parseMrzDate('240229')).toBe('2024-02-29');
    expect(parseMrzDate('300101', true)).toBe('2030-01-01');
  });

  it('resolves birth years relative to the current date, not a fixed 2026 cutoff', () => {
    vi.setSystemTime(new Date('2027-09-17T12:00:00Z'));
    expect(parseMrzDate('270101')).toBe('2027-01-01');
    expect(parseMrzDate('271201')).toBe('1927-12-01');
    vi.setSystemTime(new Date('2025-09-17T12:00:00Z'));
    expect(parseMrzDate('260101')).toBe('1926-01-01');
  });
});

describe('Passport validity date boundaries', () => {
  it('accepts the exact six-month calendar date regardless of time of day', () => {
    expect(checkHasSixMonthsValidity('2027-03-17')).toBe(true);
    expect(checkHasSixMonthsValidity('2027-03-16')).toBe(false);
  });

  it('clamps month-end dates instead of rolling into the following month', () => {
    vi.setSystemTime(new Date('2026-08-31T15:30:00Z'));
    expect(checkHasSixMonthsValidity('2027-02-28')).toBe(true);
    expect(checkHasSixMonthsValidity('2027-02-27')).toBe(false);
  });

  it.each(['2027-02-30', '2027-13-01', 'not-a-date', '03/17/2027']) (
    'rejects non-calendar expiry %s', (value) => {
      expect(checkHasSixMonthsValidity(value)).toBe(false);
    },
  );
});

describe('TD3 validation consistency', () => {
  it('still rejects a correctly checksummed passport with less than six months validity', () => {
    const { line1, line2 } = sample('880615', '261015');
    const parsed = parseIcaoMrzTd3(line1, line2);
    expect(parsed.compositeCheckValid).toBe(true);
    expect(parsed.hasSixMonthsValidity).toBe(false);
    expect(parsed.valid).toBe(false);
    expect(parsed.errors).toContain('Passport has less than 6 months validity from today.');
  });
  it('rejects a mismatched composite checksum', () => {
    const { line1, line2 } = sample();
    const changed = line2.slice(0, 43) + ((Number(line2[43]) + 1) % 10);
    const parsed = parseIcaoMrzTd3(line1, changed);
    expect(parsed.compositeCheckValid).toBe(false);
    expect(parsed.valid).toBe(false);
  });

  it.each([['250230', '291015'], ['880615', '290230']]) (
    'rejects impossible calendar dates even with matching checksums (%s, %s)', (birth, expiry) => {
      const { line1, line2 } = sample(birth, expiry);
      expect(parseIcaoMrzTd3(line1, line2).valid).toBe(false);
    },
  );

  it('requires exactly 44 characters in each normalized line', () => {
    const { line1, line2 } = sample();
    expect(parseIcaoMrzTd3(line1 + '<', line2).valid).toBe(false);
    expect(parseIcaoMrzTd3(line1, line2 + '0').valid).toBe(false);
  });

  it('rejects non-ICAO characters in the name section', () => {
    const { line1, line2 } = sample();
    expect(parseIcaoMrzTd3(line1.slice(0, 5) + '!' + line1.slice(6), line2).valid).toBe(false);
  });

  it('validates the optional-data checksum independently of the composite', () => {
    const { line1, line2 } = sample();
    const changed = line2.slice(0, 42) + '1';
    const composite = calculateIcaoCheckDigit(changed.slice(0, 10) + changed.slice(13, 20) + changed.slice(21, 43));
    expect(parseIcaoMrzTd3(line1, changed + composite).valid).toBe(false);
  });

  it('accepts filler for an unused optional-data check digit', () => {
    const { line1, line2 } = sample();
    const changed = line2.slice(0, 42) + '<';
    const composite = calculateIcaoCheckDigit(changed.slice(0, 10) + changed.slice(13, 20) + changed.slice(21, 43));
    expect(parseIcaoMrzTd3(line1, changed + composite).valid).toBe(true);
  });

  it('keeps all country presets valid and error-free', () => {
    for (const preset of Object.values(COUNTRY_MRZ_PRESETS)) {
      const parsed = parseIcaoMrzTd3(preset.mrzLine1, preset.mrzLine2);
      expect(parsed.valid).toBe(true);
      expect(parsed.errors).toEqual([]);
    }
  });
});
