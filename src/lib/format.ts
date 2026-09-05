const LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  fa: 'fa-IR',
  ar: 'ar-EG',
  ru: 'ru-RU',
  zh: 'zh-CN',
};

/** قالب عدد مطابق لوکال — برای en ارقام لاتین، برای fa/ar ارقام فارسی */
export function num(value: number, locale: string, options?: Intl.NumberFormatOptions): string {
  return Number(value).toLocaleString(LOCALE_MAP[locale] || locale, options);
}

/** واحد پول نمایشی بر اساس لوکال و کشور */
export function currencyLabel(currency: string, currencyFa: string, locale: string): string {
  return locale === 'en' ? currency : currencyFa;
}

/**
 * قالب‌بندی فاصله به متر یا کیلومتر بر اساس مقدار.
 * اگر زیر ۱ کیلومتر باشد به متر (مثلاً ۲۲۰ متر تا Wangfujing)
 * و اگر ۱ کیلومتر یا بیشتر باشد به کیلومتر (مثلاً ۳٫۶ کیلومتر تا Terminal 2) تبدیل می‌کند.
 */
export function formatDistance(
  rawDistanceKm: number | string | null | undefined,
  targetName?: string,
  locale: string = 'fa'
): string {
  if (rawDistanceKm === null || rawDistanceKm === undefined || rawDistanceKm === '') {
    return targetName ? targetName : '';
  }

  const km = typeof rawDistanceKm === 'number' ? rawDistanceKm : parseFloat(String(rawDistanceKm));
  if (isNaN(km) || km < 0) {
    return targetName ? targetName : '';
  }

  const target = targetName ? ` ${targetName}` : '';

  if (km < 1) {
    // Under 1km -> convert to meters, rounded to nearest meter (or rounded up/down gracefully)
    const meters = Math.round(km * 1000);
    const metersStr = num(meters, locale);

    switch (locale) {
      case 'fa':
        return targetName ? `${metersStr} متر تا${target}` : `${metersStr} متر`;
      case 'ar':
        return targetName ? `على بُعد ${metersStr} متر من${target}` : `${metersStr} متر`;
      case 'zh':
        return targetName ? `距${targetName}${metersStr}米` : `${metersStr}米`;
      case 'ru':
        return targetName ? `${metersStr} м до${target}` : `${metersStr} м`;
      case 'en':
      default:
        return targetName ? `${metersStr}m to${target}` : `${metersStr}m`;
    }
  } else {
    // 1km or more -> show rounded km (1 decimal if not whole)
    const rounded = Math.round(km * 10) / 10;
    const kmFormatted = num(rounded, locale, {
      minimumFractionDigits: rounded % 1 === 0 ? 0 : 1,
      maximumFractionDigits: 1,
    });

    switch (locale) {
      case 'fa':
        return targetName ? `${kmFormatted} کیلومتر تا${target}` : `${kmFormatted} کیلومتر`;
      case 'ar':
        return targetName ? `على بُعد ${kmFormatted} كم من${target}` : `${kmFormatted} كم`;
      case 'zh':
        return targetName ? `距${targetName}${kmFormatted}公里` : `${kmFormatted}公里`;
      case 'ru':
        return targetName ? `${kmFormatted} км до${target}` : `${kmFormatted} км`;
      case 'en':
      default:
        return targetName ? `${kmFormatted} km to${target}` : `${kmFormatted} km`;
    }
  }
}
