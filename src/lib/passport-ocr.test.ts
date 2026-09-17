import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { extractPassportFields } from './passport-ocr';
import { generateMrzTd3 } from './ocr-country-validator';

const mrz = () => generateMrzTd3({
  countryCode: 'UTO', nationality: 'UTO', surname: 'SPECIMEN', givenNames: 'ALICE',
  passportNo: 'L898902C3', birthDateYYMMDD: '900101', expiryDateYYMMDD: '350101', gender: 'F',
});
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-17T00:00:00Z')); });
afterEach(() => vi.useRealTimers());

describe('Local OCR transcription', () => {
  it('extracts only observed, checksummed fields including blank OCR line separators', () => {
    const { line1, line2 } = mrz();
    expect(extractPassportFields(`PASSPORT\n${line1}\n\n${line2}\n`)).toEqual({
      firstName: 'ALICE', lastName: 'SPECIMEN', passportNo: 'L898902C3',
      birthDate: '1990-01-01', passportExpiryDate: '2035-01-01', gender: 'FEMALE',
      issuingCountry: 'UTO', hasSixMonthsValidity: true,
    });
  });
  it('rejects missing or malformed MRZ instead of returning preset data', () => {
    expect(() => extractPassportFields('ALICE SPECIMEN')).toThrow('MRZ_NOT_READABLE');
    const { line1, line2 } = mrz();
    expect(() => extractPassportFields(`${line1}\n${line2.slice(0, 43)}${(Number(line2[43]) + 1) % 10}`)).toThrow();
  });
  it('does not infer gender from invalid characters', () => {
    const { line1, line2 } = mrz();
    expect(() => extractPassportFields(`${line1}\n${line2.slice(0, 20)}X${line2.slice(21)}`)).toThrow();
  });
  it('preserves letters in alphanumeric passport and optional fields', () => {
    const { line1, line2 } = generateMrzTd3({
      countryCode: 'UTO', nationality: 'UTO', surname: 'SPECIMEN', givenNames: 'ALICE',
      passportNo: 'O12345678', personalNumber: 'OPTIONAL', birthDateYYMMDD: '900101', expiryDateYYMMDD: '350101', gender: 'F',
    });
    expect(extractPassportFields(`${line1}\n${line2}`).passportNo).toBe('O12345678');
  });
  it('normalizes O/0 only in fixed-alphabet fields and still requires checksums', () => {
    const { line1, line2 } = mrz();
    const text = `${line1}\n${line2.slice(0, 10)}UT0${line2.slice(13)}`;
    expect(extractPassportFields(text).firstName).toBe('ALICE');
    const bad = text.slice(0, -1) + ((Number(text.at(-1)) + 1) % 10);
    expect(() => extractPassportFields(bad)).toThrow('MRZ_NOT_READABLE');
  });
  it('reports short validity separately from successful transcription', () => {
    vi.setSystemTime(new Date('2035-01-02T00:00:00Z'));
    const { line1, line2 } = mrz();
    expect(extractPassportFields(`${line1}\n${line2}`).hasSixMonthsValidity).toBe(false);
  });
});
