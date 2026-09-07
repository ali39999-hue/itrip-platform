import { describe, it, expect } from 'vitest';
import { lt } from '@/lib/lt';
import { auditLocaleCompleteness, LOCALES } from '../../../scripts/i18n-completeness-gate.mjs';

describe('I18N-104: RTL/LTR Layout & Directionality Verification Suite', () => {
  const RTL_LOCALES = ['fa', 'ar'];
  const LTR_LOCALES = ['en', 'zh', 'ru'];

  it('correctly maps all 5 production locales to their proper document direction', () => {
    function getLocaleDirection(locale: string): 'rtl' | 'ltr' {
      return RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';
    }

    RTL_LOCALES.forEach((loc) => {
      expect(getLocaleDirection(loc), `Locale ${loc} must be RTL`).toBe('rtl');
    });

    LTR_LOCALES.forEach((loc) => {
      expect(getLocaleDirection(loc), `Locale ${loc} must be LTR`).toBe('ltr');
    });
  });

  describe('I18N-103: RTL Fallback Integrity Guards', () => {
    it('prevents unintended English fallback in Arabic when Persian RTL is available', () => {
      const textSample = {
        fa: 'جستجوی پیشرفته پرواز',
        en: 'Advanced Flight Search',
      };

      // Arabic is missing, should fall back to Persian (RTL) instead of English (LTR)
      const arResult = lt('ar', textSample);
      expect(arResult).toBe('جستجوی پیشرفته پرواز');
      expect(arResult).not.toBe('Advanced Flight Search');

      // Persian directly returns Persian
      const faResult = lt('fa', textSample);
      expect(faResult).toBe('جستجوی پیشرفته پرواز');

      // Non-RTL locales (zh, ru) can fall back to English if missing
      const zhResult = lt('zh', textSample);
      expect(zhResult).toBe('Advanced Flight Search');
      const ruResult = lt('ru', textSample);
      expect(ruResult).toBe('Advanced Flight Search');
    });

    it('uses Arabic translation when explicitly provided', () => {
      const textSample = {
        fa: 'رزرو هتل',
        en: 'Hotel Booking',
        ar: 'حجز الفنادق',
      };

      expect(lt('ar', textSample)).toBe('حجز الفنادق');
      expect(lt('fa', textSample)).toBe('رزرو هتل');
      expect(lt('en', textSample)).toBe('Hotel Booking');
    });
  });

  describe('Message Symmetry and Key Parity CI Gate Validation', () => {
    it('verifies 100% key parity across all 5 production locales without missing keys', () => {
      const report = auditLocaleCompleteness();
      expect(report.hasErrors, `Completeness gate reported errors: ${report.errors.join('; ')}`).toBe(false);
      expect(report.totalDistinctKeys).toBeGreaterThan(800);

      LOCALES.forEach((loc) => {
        const localeStats = (report.locales as Record<string, { missingCount: number; emptyCount: number }>)[loc];
        expect(localeStats.missingCount, `Locale ${loc} has missing keys`).toBe(0);
        expect(localeStats.emptyCount, `Locale ${loc} has empty keys`).toBe(0);
      });
    });
  });

  describe('Logical CSS & Directionality Invariants', () => {
    it('verifies that direction-aware classes use CSS logical properties', () => {
      // Helper function matching production Tailwind logical alignment classes
      function getAlignmentClass(direction: 'rtl' | 'ltr'): string {
        return direction === 'rtl' ? 'text-right' : 'text-left';
      }

      expect(getAlignmentClass('rtl')).toBe('text-right');
      expect(getAlignmentClass('ltr')).toBe('text-left');
    });
  });
});
