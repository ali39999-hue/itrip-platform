import { describe, it, expect } from 'vitest';
import { normalizePassportNo, isValidPassportNo } from './passport-format';

describe('passport-format: real-world passport numbers must not be rejected', () => {
  it('accepts the standard IRI format (1 letter + 8 digits)', () => {
    expect(isValidPassportNo('A12345678')).toBe(true);
    expect(isValidPassportNo('X12345678')).toBe(true);
  });

  it('accepts lowercase and stray spaces/dashes the user may type', () => {
    expect(isValidPassportNo('a12345678')).toBe(true);
    expect(isValidPassportNo('A12345678 ')).toBe(true);
    expect(isValidPassportNo(' A1 234-5678 ')).toBe(true);
    expect(isValidPassportNo('A12345678–')).toBe(true);
  });

  it('accepts MRZ-style input with < fillers', () => {
    expect(isValidPassportNo('A12345678<<')).toBe(true);
    expect(normalizePassportNo('A1<<2345678')).toBe('A12345678');
  });

  it('accepts older IRI (6-7 digit) and 2-letter international booklets', () => {
    expect(isValidPassportNo('B123456')).toBe(true);
    expect(isValidPassportNo('AB1234567')).toBe(true);
    expect(isValidPassportNo('12345678')).toBe(true);
  });

  it('rejects clearly invalid values', () => {
    expect(isValidPassportNo('12345')).toBe(false);        // too short
    expect(isValidPassportNo('ABC1234567890123')).toBe(false); // too long
    expect(isValidPassportNo('')).toBe(false);
    expect(isValidPassportNo('ABC')).toBe(false);          // no digits at all
    expect(isValidPassportNo('۱۲۳۴۵۶۷۸')).toBe(false);     // Persian digits are not passport chars
  });

  it('normalizes consistently for storage/display', () => {
    expect(normalizePassportNo(' a1-2345 678 ')).toBe('A12345678');
  });
});
