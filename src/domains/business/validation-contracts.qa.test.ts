/**
 * QA LAYER 3 — Form validation contract, straight from the spec table
 * (فیروزو بیزنس سند تحویل فنی §اعتبارسنجی فرم).
 *
 * Owns: src/domains/business/**\/*.test.ts (QA session, exclusive).
 *
 * ⚠️ STATUS: the backend session has NOT yet delivered the request/traveler
 * validation schemas (no `src/domains/business/validation.ts` or API route
 * exists on `feat/biz-backend` as of 2026-09-30). Per the coordination rule,
 * QA must NOT implement backend code. This file therefore does two things:
 *
 *  1. It defines the REFERENCE CONTRACT for each spec rule as an executable
 *     Zod schema + acceptance table, so the moment the backend schemas land
 *     these tests are repointed at them (swap the `import` on the marked line)
 *     and any divergence becomes a red test.
 *  2. Every rule below cites the exact spec error message it must produce.
 *
 * When the backend schemas exist, DELETE the reference block and test the real
 * implementation. If the real implementation disagrees with this contract,
 * that is a BUG REPORT to the backend session — not something QA fixes here.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ─── Reference contract (temporary, until backend delivers the real schemas) ──

/** Exactly 11 digits — «شناسه ملی باید ۱۱ رقم باشد». */
export const companyNationalIdContract = z
  .string()
  .regex(/^\d{11}$/, 'شناسه ملی باید ۱۱ رقم باشد');

/** `09xxxxxxxxx` — «شماره موبایل معتبر نیست». */
export const repMobileContract = z
  .string()
  .regex(/^09\d{9}$/, 'شماره موبایل معتبر نیست');

/** Latin letters and spaces only — «نام باید مطابق پاسپورت و لاتین باشد». */
export const travelerLatinNameContract = z
  .string()
  .min(1)
  .regex(/^[A-Za-z]+(?: [A-Za-z]+)*$/, 'نام باید مطابق پاسپورت و لاتین باشد');

/** 6–9 alphanumeric — «شماره پاسپورت معتبر نیست». */
export const passportNoContract = z
  .string()
  .regex(/^[A-Za-z0-9]{6,9}$/, 'شماره پاسپورت معتبر نیست');

/** JPG/PNG/PDF ≤ 5MB — «فرمت یا حجم فایل مجاز نیست». */
export const documentFileContract = z
  .object({
    mimeType: z.enum(['image/jpeg', 'image/png', 'application/pdf']),
    sizeBytes: z.number().int().positive().max(5 * 1024 * 1024),
  })
  .refine(() => true, { message: 'فرمت یا حجم فایل مجاز نیست' });

/** Terms must be accepted — «برای ادامه باید شرایط را بپذیرید». */
export const termsAcceptedContract = z
  .literal(true, { message: 'برای ادامه باید شرایط را بپذیرید' });

/**
 * Passport expiry must be ≥ 6 months after the RETURN date —
 * «اعتبار پاسپورت برای این تاریخ کافی نیست».
 */
export function passportExpiryOk(passportExpiry: Date, returnDate: Date): boolean {
  const sixMonthsAfterReturn = new Date(returnDate);
  sixMonthsAfterReturn.setMonth(sixMonthsAfterReturn.getMonth() + 6);
  return passportExpiry.getTime() >= sixMonthsAfterReturn.getTime();
}

/** Traveller list must match paxCount exactly — «تعداد مسافران با تعداد انتخابی نمی‌خواند». */
export function travelerCountOk(travelerCount: number, paxCount: number, remainingCapacity: number): boolean {
  return travelerCount === paxCount && paxCount <= remainingCapacity;
}

// ─── Acceptance tests ─────────────────────────────────────────────────────────

describe('QA — company national ID: exactly 11 digits', () => {
  it.each(['12345678901', '00123456789', '00000000000'])('accepts %s', (v) => {
    expect(companyNationalIdContract.safeParse(v).success).toBe(true);
  });

  it.each(['1234567890', '123456789012', '1234567890a', '۱۲۳۴۵۶۷۸۹۰۱', '', ' 1234567890'])(
    'rejects %s (wrong length, non-digit, Persian digits, padding)',
    (v) => {
      expect(companyNationalIdContract.safeParse(v).success).toBe(false);
    },
  );
});

describe('QA — representative mobile: 09xxxxxxxxx', () => {
  it.each(['09123456789', '09000000000'])('accepts %s', (v) => {
    expect(repMobileContract.safeParse(v).success).toBe(true);
  });

  it.each(['0912345678', '091234567890', '08123456789', '9123456789', '+989123456789', ''], 'rejects')(
    'rejects %s (wrong prefix, length, or format)',
    (v) => {
      expect(repMobileContract.safeParse(v).success).toBe(false);
    },
  );
});

describe('QA — traveller Latin name: letters and spaces only', () => {
  it.each(['Ali Rezaei', 'Maryam', 'Jean-Luc With Hyphen Is Rejected Below', 'ALI REZAEI'])(
    'parses the LATIN-only subset correctly',
    (v) => {
      // Hyphens are NOT in the spec's "letters and spaces" rule — pin that.
      const expected = v === 'Jean-Luc With Hyphen Is Rejected Below' ? false : true;
      expect(travelerLatinNameContract.safeParse(v).success).toBe(expected);
    },
  );

  it.each(['علی رضایی', 'Ali رضایی', 'Ali123', 'Ali_Rezaei', '', ' Ali'])(
    'rejects %s (Persian, mixed, digits, symbols, empty, edge spaces)',
    (v) => {
      expect(travelerLatinNameContract.safeParse(v).success).toBe(false);
    },
  );
});

describe('QA — passport number: 6–9 alphanumeric', () => {
  it.each(['A1234567', 'X123456789'.slice(0, 9), 'A1b2C3'])('accepts %s', (v) => {
    expect(passportNoContract.safeParse(v).success).toBe(true);
  });

  it.each(['A1234', 'A123456789', 'A1234 567', '۱۲۳۴۵۶', ''])('rejects %s (length 5 or 10+, spaces, Persian)', (v) => {
    expect(passportNoContract.safeParse(v).success).toBe(false);
  });
});

describe('QA — passport expiry: ≥ 6 months after the return date', () => {
  const returnDate = new Date('2026-11-08T00:00:00Z');

  it('accepts exactly 6 months after return (boundary)', () => {
    expect(passportExpiryOk(new Date('2027-05-08T00:00:00Z'), returnDate)).toBe(true);
  });

  it('rejects one day short of the boundary', () => {
    expect(passportExpiryOk(new Date('2027-05-07T00:00:00Z'), returnDate)).toBe(false);
  });

  it('rejects an expiry before return outright', () => {
    expect(passportExpiryOk(new Date('2026-11-07T00:00:00Z'), returnDate)).toBe(false);
  });
});

describe('QA — traveller count matches paxCount and remaining capacity', () => {
  it('accepts an exact match within capacity', () => {
    expect(travelerCountOk(4, 4, 30)).toBe(true);
    expect(travelerCountOk(30, 30, 30)).toBe(true); // boundary: fills capacity
  });

  it('rejects a mismatch or an over-capacity request', () => {
    expect(travelerCountOk(3, 4, 30)).toBe(false);
    expect(travelerCountOk(5, 4, 30)).toBe(false);
    expect(travelerCountOk(31, 31, 30)).toBe(false);
  });
});

describe('QA — document file: JPG/PNG/PDF and ≤ 5MB', () => {
  it.each([
    ['image/jpeg', 4_500_000],
    ['image/png', 5_242_880], // exactly 5MB — boundary
    ['application/pdf', 1],
  ])('accepts %s at %s bytes', (mime, size) => {
    expect(documentFileContract.safeParse({ mimeType: mime, sizeBytes: size }).success).toBe(true);
  });

  it.each([
    ['image/gif', 1000],
    ['image/webp', 1000],
    ['application/msword', 1000],
    ['image/jpeg', 5_242_881], // one byte over — the boundary matters
    ['image/jpeg', 0],
    ['image/jpeg', -1],
  ])('rejects %s at %s bytes', (mime, size) => {
    expect(documentFileContract.safeParse({ mimeType: mime, sizeBytes: size }).success).toBe(false);
  });
});

describe('QA — terms acceptance is mandatory before submit', () => {
  it('accepts only an explicit true', () => {
    expect(termsAcceptedContract.safeParse(true).success).toBe(true);
    expect(termsAcceptedContract.safeParse(false).success).toBe(false);
    expect(termsAcceptedContract.safeParse('true').success).toBe(false);
    expect(termsAcceptedContract.safeParse(undefined).success).toBe(false);
  });
});
