/**
 * Dynamic Multi-Currency Pricing Calculator & Converter.
 * Adapted from Spree Commerce Storefront & ShopVerse models.
 */

export type SupportedCurrency = 'IRR' | 'IRT' | 'USD' | 'USDT' | 'AED' | 'EUR' | 'TRY' | 'CNY' | 'RUB';

export interface CurrencyRateTable {
  base: 'USD';
  rates: Record<SupportedCurrency, number>;
  lastUpdated: string;
}

/**
 * Standard offline fallback rates anchored to USD
 */
export const DEFAULT_OFFLINE_FX_RATES: CurrencyRateTable = {
  base: 'USD',
  rates: {
    USD: 1.0,
    USDT: 1.0,
    EUR: 0.92,
    AED: 3.67,
    CNY: 7.24,
    TRY: 34.2,
    RUB: 91.5,
    IRR: 900_000, // 900,000 Rials per USD (~90,000 Tomans)
    IRT: 90_000, // 90,000 Tomans per USD
  },
  lastUpdated: '2026-09-11',
};

export class DynamicCurrencyCalculator {
  /**
   * Converts an amount from one currency to another using current or fallback rates
   */
  static convert(
    amount: number,
    from: SupportedCurrency,
    to: SupportedCurrency,
    customRates?: Partial<Record<SupportedCurrency, number>>
  ): number {
    if (from === to) return amount;

    const rates = { ...DEFAULT_OFFLINE_FX_RATES.rates, ...(customRates || {}) };
    const fromRate = rates[from] || 1.0;
    const toRate = rates[to] || 1.0;

    // Convert to base (USD) first, then to target currency
    const amountInUsd = from === 'USD' ? amount : amount / fromRate;
    const converted = to === 'USD' ? amountInUsd : amountInUsd * toRate;

    // Rials and Tomans rounded to whole numbers; others rounded to 2 decimals
    if (to === 'IRR' || to === 'IRT') {
      return Math.round(converted);
    }
    return Math.round(converted * 100) / 100;
  }

  /**
   * Formats currency display logically with appropriate symbol and punctuation
   */
  static formatDisplay(amount: number, currency: SupportedCurrency, locale = 'fa'): string {
    const formattedNum = amount.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US');

    const symbols: Record<SupportedCurrency, { fa: string; en: string }> = {
      IRR: { fa: 'ریال', en: 'IRR' },
      IRT: { fa: 'تومان', en: 'Toman' },
      USD: { fa: '$', en: '$' },
      USDT: { fa: 'USDT', en: 'USDT' },
      AED: { fa: 'درهم', en: 'AED' },
      EUR: { fa: '€', en: '€' },
      TRY: { fa: 'لیر', en: 'TRY' },
      CNY: { fa: 'یوان', en: 'CNY' },
      RUB: { fa: 'روبل', en: 'RUB' },
    };

    const s = symbols[currency] || { fa: currency, en: currency };
    const symbolText = locale === 'fa' ? s.fa : s.en;

    if (currency === 'USD' || currency === 'EUR') {
      return locale === 'fa' ? `${formattedNum} ${symbolText}` : `${symbolText}${formattedNum}`;
    }

    return `${formattedNum} ${symbolText}`;
  }
}
