export const gShort = new Intl.DateTimeFormat('fa-IR-u-ca-gregory', { day: 'numeric', month: 'long' });
export const gFmt = new Intl.DateTimeFormat('fa-IR-u-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' });
export const wFmt = new Intl.DateTimeFormat('fa-IR-u-ca-gregory', { weekday: 'long' });
export const jFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long' });
export const jFmtY = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long', year: 'numeric' });

export const fa = (n: number | string) => Number(n).toLocaleString('fa-IR');
export const fa1 = (n: number | string) => Number(n).toLocaleString('fa-IR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Locale-aware stay dates: Jalali for fa/ar readers (hotel dates are consumed
 * in Jalali in Iran), Gregorian otherwise. Centralizes the fa/ar branch so
 * every hotel surface stays consistent.
 */
export function stayDate(d: Date, locale: string): string {
  return locale === 'fa' || locale === 'ar' ? jFmtY.format(d) : gFmt.format(d);
}

export function stayDateShort(d: Date, locale: string): string {
  return locale === 'fa' || locale === 'ar' ? jFmt.format(d) : gShort.format(d);
}
