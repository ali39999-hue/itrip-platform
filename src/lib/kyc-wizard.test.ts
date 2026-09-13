import { describe, it, expect } from 'vitest';
import {
  normalizeNationalId,
  isIdentityStepValid,
  isVerificationStepValid,
  isKycDataComplete,
  buildKycProfilePayload,
} from './kyc-wizard';

describe('kyc-wizard gates', () => {
  describe('normalizeNationalId', () => {
    it('converts Persian/Arabic digits and strips separators', () => {
      expect(normalizeNationalId('۰۰۱۲۳۴۵۶۷۸')).toBe('0012345678');
      expect(normalizeNationalId('٠٠١٢٣٤٥٦٧٨')).toBe('0012345678');
      expect(normalizeNationalId(' 001-234-5678 ')).toBe('0012345678');
      expect(normalizeNationalId('')).toBe('');
    });
  });

  describe('isIdentityStepValid', () => {
    it('requires both Persian first and last name', () => {
      expect(isIdentityStepValid({ firstNameFa: 'علی', lastNameFa: 'آزمونی' })).toBe(true);
      expect(isIdentityStepValid({ firstNameFa: 'علی', lastNameFa: '  ' })).toBe(false);
      expect(isIdentityStepValid({ firstNameFa: '', lastNameFa: 'آزمونی' })).toBe(false);
    });
  });

  describe('isVerificationStepValid', () => {
    it('accepts a checksum-valid Iranian national ID', () => {
      // 0079279511 passes the modulo-11 check digit algorithm
      expect(isVerificationStepValid({ nationalId: '0079279511', passportNo: '' })).toBe(true);
      expect(isVerificationStepValid({ nationalId: '0079279511', passportNo: 'A1234567' })).toBe(true);
    });

    it('rejects checksum failures, repetitive digits and wrong lengths', () => {
      expect(isVerificationStepValid({ nationalId: '0079279515', passportNo: '' })).toBe(false);
      expect(isVerificationStepValid({ nationalId: '1111111111', passportNo: '' })).toBe(false);
      expect(isVerificationStepValid({ nationalId: '12345', passportNo: '' })).toBe(false);
      expect(isVerificationStepValid({ nationalId: '', passportNo: '' })).toBe(false);
    });

    it('accepts a passport for foreign nationals when no national ID is given', () => {
      expect(isVerificationStepValid({ nationalId: '', passportNo: 'A12345678' })).toBe(true);
      expect(isVerificationStepValid({ nationalId: '   ', passportNo: 'AB12345' })).toBe(true);
      // a too-short passport does not satisfy the gate
      expect(isVerificationStepValid({ nationalId: '', passportNo: '12' })).toBe(false);
      // a checksum-invalid national ID is rescued by a valid passport
      expect(isVerificationStepValid({ nationalId: '0012345678', passportNo: 'A12345678' })).toBe(true);
    });
  });

  describe('isKycDataComplete (server mirror)', () => {
    it('completes with nationalId or passport, never with names only', () => {
      expect(isKycDataComplete({ firstNameFa: 'علی', lastNameFa: 'آزمونی', nationalId: '0079279511' })).toBe(true);
      expect(isKycDataComplete({ firstNameFa: 'علی', lastNameFa: 'آزمونی', passportNo: 'A12345678' })).toBe(true);
      expect(isKycDataComplete({ firstNameFa: 'علی', lastNameFa: 'آزمونی' })).toBe(false);
      expect(isKycDataComplete({ firstNameFa: '', lastNameFa: '', nationalId: '0079279511' })).toBe(false);
      expect(isKycDataComplete(null)).toBe(false);
      expect(isKycDataComplete(undefined)).toBe(false);
    });
  });

  describe('buildKycProfilePayload', () => {
    it('omits empty strings so zod .optional() accepts the payload', () => {
      const payload = buildKycProfilePayload({
        firstNameFa: ' علی ',
        lastNameFa: ' آزمونی ',
        firstNameEn: '',
        lastNameEn: '',
        nationalId: '۰۰۷۹۲۷۹۵۱۱',
        passportNo: '',
        passportExpiry: '',
      });
      expect(payload).toEqual({
        firstNameFa: 'علی',
        lastNameFa: 'آزمونی',
        nationalId: '0079279511',
        name: 'علی آزمونی',
      });
      expect(Object.keys(payload)).not.toContain('firstNameEn');
      expect(Object.keys(payload)).not.toContain('passportNo');
    });

    it('uppercases passport numbers and includes optional fields when present', () => {
      const payload = buildKycProfilePayload({
        firstNameFa: 'علی',
        lastNameFa: 'آزمونی',
        firstNameEn: 'ali',
        lastNameEn: 'azamoni',
        nationalId: '',
        passportNo: ' a12345678 ',
        passportExpiry: '2030-01-02',
      });
      expect(payload.firstNameEn).toBe('ALI');
      expect(payload.passportNo).toBe('A12345678');
      expect(payload.passportExpiry).toBe('2030-01-02');
      expect(payload.nationalId).toBeUndefined();
    });
  });
});
