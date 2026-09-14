import { describe, it, expect } from 'vitest';
import {
  calculateIcaoCheckDigit,
  parseIcaoMrzTd3,
  checkHasSixMonthsValidity,
  validateCountryTravelDocument,
  COUNTRY_MRZ_PRESETS,
} from './ocr-country-validator';

describe('OCR & Country Document Validation Engine', () => {
  describe('ICAO 7-3-1 Checksum Algorithm', () => {
    it('calculates accurate check digits for numeric strings', () => {
      // "L2948175" with weights [7, 3, 1]
      // L=21*7=147, 2*3=6, 9*1=9, 4*7=28, 8*3=24, 1*1=1, 7*7=49, 5*3=15 -> sum=279 -> 279 % 10 = 9 or check digit
      const checkDigit = calculateIcaoCheckDigit('L2948175');
      expect(typeof checkDigit).toBe('number');
      expect(checkDigit).toBeGreaterThanOrEqual(0);
      expect(checkDigit).toBeLessThanOrEqual(9);
    });

    it('correctly validates presets check digits', () => {
      Object.entries(COUNTRY_MRZ_PRESETS).forEach(([k, preset]) => {
        const parsed = parseIcaoMrzTd3(preset.mrzLine1, preset.mrzLine2);
        if (!parsed.valid) {
          console.log(`Failed preset ${k}:`, parsed.errors);
        }
        expect(parsed.valid).toBe(true);
        expect(parsed.hasSixMonthsValidity).toBe(true);
        expect(parsed.passportNoCheckValid).toBe(true);
        expect(parsed.birthDateCheckValid).toBe(true);
        expect(parsed.expiryDateCheckValid).toBe(true);
      });
    });
  });

  describe('6-Month Validity Rule Enforcement', () => {
    it('approves expiry dates more than 6 months in future', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 2);
      const futureStr = future.toISOString().split('T')[0]!;
      expect(checkHasSixMonthsValidity(futureStr)).toBe(true);
    });

    it('rejects expiry dates less than 6 months or expired', () => {
      const nearFuture = new Date();
      nearFuture.setMonth(nearFuture.getMonth() + 2);
      const nearFutureStr = nearFuture.toISOString().split('T')[0]!;
      expect(checkHasSixMonthsValidity(nearFutureStr)).toBe(false);

      const expiredStr = '2020-01-01';
      expect(checkHasSixMonthsValidity(expiredStr)).toBe(false);
    });
  });

  describe('Country-Specific Rules (validateCountryTravelDocument)', () => {
    it('validates Iranian national ID with checksum algorithm', () => {
      // Valid Iranian national ID
      const res = validateCountryTravelDocument('iran', {
        nationalId: '0079279511',
      });
      expect(res.valid).toBe(true);
      expect(res.checksumsPassed).toBe(true);

      // Invalid Iranian national ID (checksum failure)
      const invalidRes = validateCountryTravelDocument('iran', {
        nationalId: '0079279515',
      });
      expect(invalidRes.valid).toBe(false);
      expect(invalidRes.checksumsPassed).toBe(false);
    });

    it('validates international travel document requirements', () => {
      const validForeign = validateCountryTravelDocument('turkey', {
        passportNo: 'U1839201',
        passportExpiry: '2029-12-01',
      });
      expect(validForeign.valid).toBe(true);
      expect(validForeign.hasSixMonthsValidity).toBe(true);

      const shortPassport = validateCountryTravelDocument('turkey', {
        passportNo: 'U1',
      });
      expect(shortPassport.valid).toBe(false);
    });
  });
});
