import { COUNTRIES, type CountryId } from './countries';
import { lt, LText } from './lt';

// Toman display rates — single source of truth for UI conversions.
// Keep in sync with DEFAULT_EXCHANGE_RATES in domains/currency/CurrencyService.ts
// (those values are in IRR/Rials; these are Toman = IRR / 10).
export const CURRENCY_TO_TOMAN: Record<string, number> = {
  IRR: 1,
  USDT: 55000,
  USD: 55000,
  CNY: 7600,
  AED: 16500,
  TRY: 2900,
  GEL: 37000,
  RUB: 1200,
  OMR: 260000,
};

export const CURRENCY_LABEL: Record<string, LText> = {
  IRR: { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'Toman' },
  USDT: { fa: 'تتر', en: 'USDT', ar: 'تيثر', zh: '泰达币', ru: 'USDT' },
  USD: { fa: 'دلار', en: 'USD', ar: 'دولار', zh: '美元', ru: 'USD' },
  CNY: { fa: 'یوان', en: 'Yuan', ar: 'يوان', zh: '元', ru: 'юань' },
  TRY: { fa: 'لیر', en: 'Lira', ar: 'ليرة', zh: '里拉', ru: 'лир' },
  AED: { fa: 'درهم', en: 'Dirham', ar: 'درهم', zh: '迪拉姆', ru: 'дирхам' },
  GEL: { fa: 'لاری', en: 'Lari', ar: 'لاري', zh: '拉里', ru: 'лари' },
  RUB: { fa: 'روبل', en: 'Ruble', ar: 'روبل', zh: '卢布', ru: 'рубль' },
  OMR: { fa: 'ریال عمان', en: 'Omani Rial', ar: 'ريال عماني', zh: '阿曼里亚尔', ru: 'оманский риал' },
};

/** @deprecated use CURRENCY_LABEL with lt() */
export const CURRENCY_FA: Record<string, string> = Object.fromEntries(
  Object.entries(CURRENCY_LABEL).map(([k, v]) => [k, v.fa])
);

export function toLocalCurrency(amountToman: number, currency: string): number {
  const rate = CURRENCY_TO_TOMAN[currency] ?? 1;
  const v = amountToman / rate;
  return currency === 'IRR' ? Math.round(v) : Math.round(v * 100) / 100;
}

export function formatMoney(amountToman: number, currency: string, locale = 'fa'): string {
  const v = toLocalCurrency(amountToman, currency);
  const localeMap: Record<string, string> = {
    fa: 'fa-IR',
    en: 'en-US',
    ar: 'ar-EG',
    zh: 'zh-CN',
    ru: 'ru-RU',
  };
  const digits = v.toLocaleString(localeMap[locale] || locale);
  const label = CURRENCY_LABEL[currency] ? lt(locale, CURRENCY_LABEL[currency]) : currency;
  return `${digits} ${label}`;
}

export function chargeContext(countryId: CountryId): {
  currency: string;
  label: LText;
  gateway: LText;
  isHome: boolean;
  taxRate: number;
  taxLabel: LText;
  gatewayFeeRate: number;
  gatewayFeeLabel: LText;
} {
  const c = COUNTRIES[countryId] || COUNTRIES.iran;
  const isHome = countryId === 'iran';
  return {
    currency: c.currency,
    label: CURRENCY_LABEL[c.currency] || { fa: c.currencyFa, en: c.currency },
    gateway: { fa: c.gateway, en: c.gatewayEn },
    isHome,
    taxRate: c.taxRate,
    taxLabel: c.taxLabel,
    gatewayFeeRate: c.gatewayFeeRate,
    gatewayFeeLabel: c.gatewayFeeLabel,
  };
}

export interface CountryPricingCalculation {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  taxLabel: LText;
  gatewayFeeRate: number;
  gatewayFeeAmount: number;
  gatewayFeeLabel: LText;
  totalPayable: number;
}

/**
 * Authoritative client/server calculation for country-specific tax and gateway fees.
 * Dynamically reacts to country switcher changes:
 * - Checkout: itemizes country VAT (5%-20%) + gateway processing fee.
 * - Wallet Top-up: deposit balance is tax-exempt; gateway processing fee (0%-2.5%) applies.
 */
export function calculateCountryPricing(params: {
  subtotal: number;
  countryId: CountryId;
  gateway?: 'shetab' | 'ecardo' | 'wallet' | string;
  isWalletTopUp?: boolean;
}): CountryPricingCalculation {
  const ctx = chargeContext(params.countryId);
  const subtotal = Math.max(0, params.subtotal);

  // Pure wallet deposit is VAT-free (tax is collected when services are purchased).
  const isTopUp = Boolean(params.isWalletTopUp);
  const taxRate = isTopUp ? 0 : ctx.taxRate;
  const taxAmount = taxRate > 0 ? (params.countryId === 'iran' ? Math.round(subtotal * taxRate) : Number((subtotal * taxRate).toFixed(2))) : 0;

  // Shetab or internal wallet payment has 0% gateway fee.
  const isFreeGateway = params.gateway === 'shetab' || params.gateway === 'wallet' || params.gateway === 'wallet_irr';
  const gatewayFeeRate = isFreeGateway ? 0 : ctx.gatewayFeeRate;
  const gatewayFeeAmount = gatewayFeeRate > 0
    ? (params.countryId === 'iran'
        ? Math.round((subtotal + taxAmount) * gatewayFeeRate)
        : Number(((subtotal + taxAmount) * gatewayFeeRate).toFixed(2)))
    : 0;

  const totalPayable = subtotal + taxAmount + gatewayFeeAmount;

  return {
    subtotal,
    taxRate,
    taxAmount,
    taxLabel: ctx.taxLabel,
    gatewayFeeRate,
    gatewayFeeAmount,
    gatewayFeeLabel: ctx.gatewayFeeLabel,
    totalPayable,
  };
}
