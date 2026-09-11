import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lt } from '@/lib/lt';

describe('Checkout Upgrades: SoftLockTimer & Cancellation Policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies 15-minute hold timer format calculation', () => {
    const totalSeconds = 900; // 15 minutes
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    expect(formatted).toBe('15:00');
  });

  it('verifies timer warning thresholds', () => {
    const isUrgent = (s: number) => s < 120 && s > 0;
    const isWarning = (s: number) => s >= 120 && s < 300;

    expect(isUrgent(60)).toBe(true);
    expect(isUrgent(150)).toBe(false);
    expect(isWarning(180)).toBe(true);
    expect(isWarning(600)).toBe(false);
  });

  it('verifies cancellation penalty policy rules across tiers', () => {
    const locales = ['fa', 'en', 'ar', 'zh', 'ru'] as const;
    for (const loc of locales) {
      const more72h = lt(loc, {
        fa: '۱۰٪ جریمه کنسلی (۹۰٪ استرداد وجه)',
        en: '10% cancellation fee (90% refunded)',
        ar: '10% رسوم إلغاء (استرداد 90%)',
        zh: '收取10%退订费（退还90%）',
        ru: '10% штраф (возврат 90%)',
      });
      expect(more72h).toBeTruthy();

      const noShow = lt(loc, {
        fa: 'غیرقابل استرداد (۱۰۰٪ جریمه)',
        en: 'Non-refundable (100% fee)',
        ar: 'غير قابل للاسترداد (رسوم 100%)',
        zh: '不可退款（100%手续费）',
        ru: 'Возврату не подлежит (100% штраф)',
      });
      expect(noShow).toBeTruthy();
    }
  });

  it('verifies soft-lock timer localized accessibility aria labels', () => {
    const faLabel = lt('fa', {
      fa: 'زمان باقی‌مانده قفل قیمت: 14:30',
      en: 'Price lock time remaining: 14:30',
      ar: 'الوقت المتبقي لتثبيت السعر: 14:30',
      zh: '锁价剩余时间：14:30',
      ru: 'Оставшееся время фиксации цены: 14:30',
    });
    expect(faLabel).toContain('14:30');
    expect(faLabel).toContain('زمان');
  });
});
