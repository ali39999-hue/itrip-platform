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
