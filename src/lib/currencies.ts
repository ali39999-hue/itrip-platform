import { toAsciiDigits, toPersianDigits, formatTomanHuman } from '@/lib/iranian-commerce';

export type TourCurrency = 'TOMAN' | 'IRR' | 'USD' | 'EUR' | 'AED' | 'CNY';

export interface CurrencyOption {
  code: TourCurrency;
  labelFa: string;
  labelEn: string;
  symbol: string;
}

export const TOUR_CURRENCIES: CurrencyOption[] = [
  { code: 'TOMAN', labelFa: 'تومان ایران (پیش‌فرض سایت)', labelEn: 'Iran Toman (Default)', symbol: 'تومان' },
  { code: 'IRR', labelFa: 'ریال ایران', labelEn: 'Iranian Rial', symbol: 'ریال' },
  { code: 'USD', labelFa: 'دلار آمریکا ($)', labelEn: 'US Dollar ($)', symbol: '$' },
  { code: 'EUR', labelFa: 'یورو (€)', labelEn: 'Euro (€)', symbol: '€' },
  { code: 'AED', labelFa: 'درهم امارات (د.إ)', labelEn: 'UAE Dirham (AED)', symbol: 'د.إ' },
  { code: 'CNY', labelFa: 'یوان چین (¥)', labelEn: 'Chinese Yuan (¥)', symbol: '¥' },
];

/**
 * Returns localized label or symbol for a currency code.
 */
export function getCurrencyLabel(currency: string = 'TOMAN', locale: string = 'fa'): string {
  const code = (currency || 'TOMAN').toUpperCase();
  switch (code) {
    case 'TOMAN':
      switch (locale) {
        case 'fa':
          return 'تومان';
        case 'ar':
          return 'تومان';
        case 'zh':
          return '图曼';
        case 'ru':
          return 'томанов';
        default:
          return 'Toman';
      }
    case 'IRR':
      switch (locale) {
        case 'fa':
          return 'ریال';
        case 'ar':
          return 'ريال';
        case 'zh':
          return '里亚尔';
        case 'ru':
          return 'риалов';
        default:
          return 'IRR';
      }
    case 'USD':
      return locale === 'fa' ? 'دلار ($)' : '$';
    case 'EUR':
      return locale === 'fa' ? 'یورو (€)' : '€';
    case 'AED':
      return locale === 'fa' || locale === 'ar' ? 'د.إ' : 'AED';
    case 'CNY':
      return locale === 'fa' ? 'یوان (¥)' : '¥';
    default:
      return currency;
  }
}

/**
 * Parses user numeric input: normalizes Persian/Arabic digits, removes commas/spaces.
 */
export function parsePriceInput(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  const ascii = toAsciiDigits(String(val)).replace(/,/g, '').replace(/٬/g, '').replace(/\s/g, '');
  const num = Number(ascii);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Formats a number with comma separators (e.g. 85000000 -> "85,000,000").
 */
export function formatNumberWithCommas(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '';
  const num = typeof val === 'number' ? val : parsePriceInput(val);
  if (!Number.isFinite(num)) return '';
  const parts = String(num).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

/**
 * Returns human-readable Persian words for an amount (e.g. «۸۵ میلیون تومان»).
 */
export function getHumanAmountWords(amount: number, currency: string = 'TOMAN'): string {
  if (!amount || amount <= 0) return '';
  const code = (currency || 'TOMAN').toUpperCase();

  if (code === 'TOMAN') {
    return formatTomanHuman(amount);
  }

  if (code === 'IRR') {
    const tomanEquivalent = Math.round(amount / 10);
    const irrHuman = formatTomanHuman(amount).replace(/تومان/g, 'ریال');
    return `${irrHuman} (معادل ${formatTomanHuman(tomanEquivalent)})`;
  }

  const formattedNum = toPersianDigits(amount.toLocaleString('en-US'));
  switch (code) {
    case 'USD':
      return `${formattedNum} دلار آمریکا`;
    case 'EUR':
      return `${formattedNum} یورو`;
    case 'AED':
      return `${formattedNum} درهم امارات`;
    case 'CNY':
      return `${formattedNum} یوان چین`;
    default:
      return `${formattedNum} ${currency}`;
  }
}

/**
 * Generates conversion and clarity hint for Rial vs Toman.
 */
export function getRialTomanConversionHint(amount: number, currency: string = 'TOMAN'): string | null {
  if (!amount || amount <= 0) return null;
  const code = (currency || 'TOMAN').toUpperCase();

  if (code === 'IRR') {
    const toman = Math.round(amount / 10);
    return `معادل به تومان: ${formatNumberWithCommas(toman)} تومان (یک صفر کمتر)`;
  }

  if (code === 'TOMAN') {
    const rial = Math.round(amount * 10);
    return `معادل ریال بانکی: ${formatNumberWithCommas(rial)} ریال (برای درگاه شتاب و شاپرک)`;
  }

  return null;
}
