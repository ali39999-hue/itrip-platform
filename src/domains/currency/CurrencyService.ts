/**
 * Pure Currency Domain Service (MONEY-001, MONEY-004)
 * Encapsulates exchange rates, conversions, and money formatting using Prisma Decimal Money kernel.
 * Rate units: 1 unit of `from` buys X units of `to`.
 */

import { Money, FxSnapshot } from '@/lib/finance';
import { Prisma } from '@prisma/client';

export interface WalletBalances {
  IRR: number;
  USDT: number;
  AED: number;
}

export type SupportedCurrency = keyof WalletBalances;

export interface CurrencyRateProvider {
  getRateDecimal(from: SupportedCurrency, to: SupportedCurrency): Prisma.Decimal;
}

export const DEFAULT_EXCHANGE_RATES_DECIMAL: Record<string, string> = {
  'IRR_USDT': '0.00000181818', // 1 / 550,000
  'USDT_IRR': '550000',
  'IRR_AED': '0.0000060606',   // 1 / 165,000
  'AED_IRR': '165000',
  'USDT_AED': '3.33',
  'AED_USDT': '0.3003',
};

export class StaticRateProvider implements CurrencyRateProvider {
  constructor(private rates: Record<string, string> = DEFAULT_EXCHANGE_RATES_DECIMAL) {}

  getRateDecimal(from: SupportedCurrency, to: SupportedCurrency): Prisma.Decimal {
    if (from === to) return new Prisma.Decimal('1.0');
    const rateStr = this.rates[`${from}_${to}`];
    if (!rateStr) {
      throw new Error(`No exchange rate configured for ${from} -> ${to}`);
    }
    return new Prisma.Decimal(rateStr);
  }
}

export class CurrencyService {
  private rateProvider: CurrencyRateProvider;

  constructor(rateProvider?: CurrencyRateProvider) {
    this.rateProvider = rateProvider || new StaticRateProvider();
  }

  /**
   * Authoritative Decimal-based Money conversion preserving FX snapshots (MONEY-004)
   */
  convertMoney(source: Money, targetCurrency: SupportedCurrency): { converted: Money; snapshot: FxSnapshot } {
    if (source.currency === targetCurrency) {
      const snap: FxSnapshot = {
        transactionCurrency: source.currency,
        transactionAmount: source,
        baseCurrency: targetCurrency,
        baseAmount: source,
        fxRate: new Prisma.Decimal('1.0'),
        fxSource: 'PARITY',
        fxTimestamp: new Date(),
      };
      return { converted: source, snapshot: snap };
    }

    const rate = this.rateProvider.getRateDecimal(source.currency as SupportedCurrency, targetCurrency);
    const snapshot = source.convert(rate, targetCurrency, 'CENTRAL_BANK_RATE');
    const { rounded } = snapshot.baseAmount.roundForCurrency();

    return {
      converted: rounded,
      snapshot,
    };
  }

  /**
   * Compatibility wrapper for UI layers, backed by Money kernel (zero float error)
   */
  convert(amount: number, from: SupportedCurrency, to: SupportedCurrency): number {
    if (from === to) return amount;
    const sourceMoney = new Money(amount, from);
    const { converted } = this.convertMoney(sourceMoney, to);
    return converted.toNumber();
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
    return (
      new Intl.NumberFormat(locale, {
        style: 'decimal',
        maximumFractionDigits: currency === 'IRR' ? 0 : 2,
      }).format(amount) + ` ${currency}`
    );
  }
}

export const defaultCurrencyService = new CurrencyService();
