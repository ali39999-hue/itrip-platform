/**
 * Pure Currency Domain Service
 * Encapsulates exchange rates, conversions, and money formatting.
 *
 * Rate units: 1 unit of `from` buys X units of `to`, amounts in IRR (Rials).
 * The canonical single source for Toman display rates lives in lib/money.ts
 * (CURRENCY_TO_TOMAN); keep both tables in sync when updating rates.
 */

export interface WalletBalances {
  IRR: number;
  USDT: number;
  AED: number;
}

export type SupportedCurrency = keyof WalletBalances;

export interface CurrencyRateProvider {
  getRate(from: SupportedCurrency, to: SupportedCurrency): number;
}

/** 1 USDT = 550,000 IRR (55,000 Toman); 1 AED = 165,000 IRR (16,500 Toman). */
export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  'IRR_USDT': 1 / 550_000,
  'USDT_IRR': 550_000,
  'IRR_AED': 1 / 165_000,
  'AED_IRR': 165_000,
  'USDT_AED': 3.33,
  'AED_USDT': 0.3,
};

export class StaticRateProvider implements CurrencyRateProvider {
  constructor(private rates: Record<string, number> = DEFAULT_EXCHANGE_RATES) {}

  getRate(from: SupportedCurrency, to: SupportedCurrency): number {
    if (from === to) return 1;
    const rate = this.rates[`${from}_${to}`];
    // Silent 1:1 conversion of unconfigured pairs corrupts money math — fail loudly.
    if (rate === undefined) {
      throw new Error(`No exchange rate configured for ${from} -> ${to}`);
    }
    return rate;
  }
}

export class CurrencyService {
  private rateProvider: CurrencyRateProvider;

  constructor(rateProvider?: CurrencyRateProvider) {
    this.rateProvider = rateProvider || new StaticRateProvider();
  }

  convert(amount: number, from: SupportedCurrency, to: SupportedCurrency): number {
    if (from === to) return amount;
    const rate = this.rateProvider.getRate(from, to);
    const converted = amount * rate;
    return to === 'IRR' ? Math.round(converted) : Number(converted.toFixed(2));
  }

  formatMoney(amount: number, currency: SupportedCurrency = 'IRR'): string {
    const formatted = Math.round(amount).toLocaleString('fa-IR');
    switch (currency) {
      case 'IRR':
        return `${formatted} ریال`;
      case 'USDT':
        return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT`;
      case 'AED':
        return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} درهم`;
      default:
        return `${formatted} ${currency}`;
    }
  }

  formatCurrency(amount: number, currency: SupportedCurrency = 'IRR', locale: string = 'fa'): string {
    if (locale === 'fa') {
      return this.formatMoney(amount, currency);
    }
    return new Intl.NumberFormat(locale, {
      style: 'decimal',
      maximumFractionDigits: currency === 'IRR' ? 0 : 2,
    }).format(amount) + ` ${currency}`;
  }
}

export const defaultCurrencyService = new CurrencyService();
