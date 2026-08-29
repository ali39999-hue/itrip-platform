/**
 * Pure Currency Domain Service
 * Encapsulates exchange rates, conversions, and money formatting.
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

export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  'IRR_USDT': 0.000000024,
  'USDT_IRR': 41_800_000,
  'IRR_AED': 0.00000088,
  'AED_IRR': 1_140_000,
  'USDT_AED': 3.67,
  'AED_USDT': 0.2725,
};

export class StaticRateProvider implements CurrencyRateProvider {
  constructor(private rates: Record<string, number> = DEFAULT_EXCHANGE_RATES) {}

  getRate(from: SupportedCurrency, to: SupportedCurrency): number {
    if (from === to) return 1;
    const key = `${from}_${to}`;
    return this.rates[key] ?? 1;
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
