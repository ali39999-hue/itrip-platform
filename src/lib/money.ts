import type { CountryId } from './countries';

export const CURRENCY_TO_TOMAN: Record<string, number> = {
  IRR: 1,
  TRY: 2900,
  AED: 27000,
  GEL: 37000,
  RUB: 1200,
  OMR: 260000,
  CNY: 14000,
};

export const CURRENCY_FA: Record<string, string> = {
  IRR: 'تومان',
  TRY: 'لیر',
  AED: 'درهم',
  GEL: 'لاری',
  RUB: 'روبل',
  OMR: 'ریال عمان',
  CNY: 'یوان',
};

export function toLocalCurrency(amountToman: number, currency: string): number {
  const rate = CURRENCY_TO_TOMAN[currency] ?? 1;
  const v = amountToman / rate;
  return currency === 'IRR' ? Math.round(v) : Math.round(v * 10) / 10;
}

export function formatMoney(amountToman: number, currency: string): string {
  const v = toLocalCurrency(amountToman, currency);
  return `${v.toLocaleString('fa-IR')} ${CURRENCY_FA[currency] ?? currency}`;
}

export function chargeContext(countryId: CountryId): {
  currency: string;
  label: string;
  gateway: string;
  isHome: boolean;
} {
  const map: Record<CountryId, { currency: string; label: string; gateway: string }> = {
    iran: { currency: 'IRR', label: 'تومان', gateway: 'درگاه ریالی شتاب' },
    turkey: { currency: 'TRY', label: 'لیر ترکیه', gateway: 'درگاه TRY' },
    uae: { currency: 'AED', label: 'درهم امارات', gateway: 'درگاه AED بین‌المللی' },
    georgia: { currency: 'GEL', label: 'لاری گرجستان', gateway: 'درگاه GEL محلی' },
    russia: { currency: 'RUB', label: 'روبل روسیه', gateway: 'درگاه RUB' },
    oman: { currency: 'OMR', label: 'ریال عمان', gateway: 'درگاه OMR' },
    china: { currency: 'CNY', label: 'یوان چین', gateway: 'درگاه CNY' },
  };
  const m = map[countryId];
  return { ...m, isHome: countryId === 'iran' };
}
