import { describe, expect, it } from 'vitest';
import { lt } from './lt';

describe('lt() inline localization resolver', () => {
  const sample = {
    fa: 'پرواز',
    en: 'Flight',
    ar: 'رحلة طيران',
    zh: '航班',
    ru: 'Рейс',
  };

  it('resolves exact locales correctly', () => {
    expect(lt('fa', sample)).toBe('پرواز');
    expect(lt('en', sample)).toBe('Flight');
    expect(lt('ar', sample)).toBe('رحلة طيران');
    expect(lt('zh', sample)).toBe('航班');
    expect(lt('ru', sample)).toBe('Рейс');
  });

  it('normalizes regional language tags (e.g. fa-IR, ar-AE, en-US)', () => {
    expect(lt('fa-IR', sample)).toBe('پرواز');
    expect(lt('ar-AE', sample)).toBe('رحلة طيران');
    expect(lt('en-US', sample)).toBe('Flight');
    expect(lt('zh-CN', sample)).toBe('航班');
    expect(lt('ru-RU', sample)).toBe('Рейс');
  });

  it('respects I18N-103 RTL fallback: Arabic falls back to Persian before English', () => {
    const missingArabic = {
      fa: 'رزرو هتل',
      en: 'Hotel Booking',
    };
    expect(lt('ar', missingArabic)).toBe('رزرو هتل');
  });

  it('handles missing locale text with fallback to English then Persian', () => {
    const onlyPersian = { fa: 'فقط فارسی', en: '' };
    expect(lt('en', onlyPersian)).toBe('فقط فارسی');
    expect(lt('unknown', onlyPersian)).toBe('فقط فارسی');
  });

  it('safely handles empty or missing text', () => {
    expect(lt('fa', null as never)).toBe('');
    expect(lt('fa', undefined as never)).toBe('');
  });
});
