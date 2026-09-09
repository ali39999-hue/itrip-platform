export const gShort = new Intl.DateTimeFormat('fa-IR-u-ca-gregory', { day: 'numeric', month: 'long' });
export const gFmt = new Intl.DateTimeFormat('fa-IR-u-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' });
export const wFmt = new Intl.DateTimeFormat('fa-IR-u-ca-gregory', { weekday: 'long' });
export const jFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long' });
export const jFmtY = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long', year: 'numeric' });

export const fa = (n: number | string) => Number(n).toLocaleString('fa-IR');
export const fa1 = (n: number | string) => Number(n).toLocaleString('fa-IR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const localeTag = (locale: string): string => {
  switch (locale) {
    case 'en': return 'en-US';
    case 'ar': return 'ar-SA';
    case 'zh': return 'zh-CN';
    case 'ru': return 'ru-RU';
    default: return 'fa-IR';
  }
};

const dateFmtCache = new Map<string, Intl.DateTimeFormat>();

function getCachedDateFmt(locale: string, options: Intl.DateTimeFormatOptions, calendar?: string): Intl.DateTimeFormat {
  const tag = localeTag(locale) + (calendar ? `-u-ca-${calendar}` : '');
  const key = `${tag}_${JSON.stringify(options)}`;
  let fmt = dateFmtCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(tag, options);
    dateFmtCache.set(key, fmt);
  }
  return fmt;
}

export function formatNum(n: number | string, locale = 'fa'): string {
  const num = Number(n);
  if (isNaN(num)) return String(n);
  return num.toLocaleString(localeTag(locale));
}

/**
 * Locale-aware stay dates:
 * - Jalali calendar for Persian (fa) readers
 * - Gregorian calendar localized for en, ar, zh, ru readers
 */
export function stayDate(d: Date, locale: string): string {
  if (locale === 'fa') {
    return jFmtY.format(d);
  }
  return getCachedDateFmt(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

export function stayDateShort(d: Date, locale: string): string {
  if (locale === 'fa') {
    return jFmt.format(d);
  }
  return getCachedDateFmt(locale, { day: 'numeric', month: 'long' }).format(d);
}
