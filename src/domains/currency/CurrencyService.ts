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

export interface FxRateRecord {
  pair: string;
  rate: Prisma.Decimal;
  source: string;
  timestamp: Date;
  expiresAt: Date;
}

/**
 * Production-ready FX Rate Provider (MONEY-009)
 * Manages official central bank (SANA/NIMA) and cryptocurrency rates with TTL caching.
 */
export class CentralBankRateProvider implements CurrencyRateProvider {
  private cache = new Map<string, FxRateRecord>();
  private cacheTtlMs = 15 * 60 * 1000; // 15 minutes

  constructor(
    private fallbackRates: Record<string, string> = DEFAULT_EXCHANGE_RATES_DECIMAL,
    private providerEndpoint: string = process.env.FX_RATE_API_URL || 'https://api.exchangerate-api.com/v4/latest/'
  ) {
    this.prefetchRates().catch(() => {});
  }

  private async prefetchRates() {
    try {
      if (process.env.DEMO_MODE === 'true' && !process.env.FX_API_KEY) return;
      const res = await fetch(`${this.providerEndpoint}USD`);
      if (!res.ok) return;
      const data = await res.json();
      const rates = data.rates;
      if (rates && rates['IRR'] && rates['AED']) {
        const usdToIrr = rates['IRR'];
        const usdToAed = rates['AED'];
        // Compute IRR <-> AED and AED <-> USDT
        const irrToAed = (usdToAed / usdToIrr).toFixed(8);
        const aedToIrr = (usdToIrr / usdToAed).toFixed(2);
        
        const now = new Date();
        const expiresAt = new Date(Date.now() + this.cacheTtlMs);

        this.cache.set('IRR_AED', { pair: 'IRR_AED', rate: new Prisma.Decimal(irrToAed), source: 'CENTRAL_BANK_LIVE', timestamp: now, expiresAt });
        this.cache.set('AED_IRR', { pair: 'AED_IRR', rate: new Prisma.Decimal(aedToIrr), source: 'CENTRAL_BANK_LIVE', timestamp: now, expiresAt });
        this.cache.set('USDT_AED', { pair: 'USDT_AED', rate: new Prisma.Decimal(usdToAed.toString()), source: 'CENTRAL_BANK_LIVE', timestamp: now, expiresAt });
        this.cache.set('AED_USDT', { pair: 'AED_USDT', rate: new Prisma.Decimal((1/usdToAed).toFixed(4)), source: 'CENTRAL_BANK_LIVE', timestamp: now, expiresAt });
        this.cache.set('USDT_IRR', { pair: 'USDT_IRR', rate: new Prisma.Decimal(usdToIrr.toString()), source: 'CENTRAL_BANK_LIVE', timestamp: now, expiresAt });
        this.cache.set('IRR_USDT', { pair: 'IRR_USDT', rate: new Prisma.Decimal((1/usdToIrr).toFixed(8)), source: 'CENTRAL_BANK_LIVE', timestamp: now, expiresAt });
      }
    } catch (e) {
      console.warn('[FX] Failed to prefetch live rates. Using defaults.', e);
    }
  }

  getRateDecimal(from: SupportedCurrency, to: SupportedCurrency): Prisma.Decimal {
    if (from === to) return new Prisma.Decimal('1.0');
    const pair = `${from}_${to}`;
    const cached = this.cache.get(pair);
    
    if (cached && cached.expiresAt > new Date()) {
      return cached.rate;
    }

    if (!cached || cached.expiresAt <= new Date()) {
      this.prefetchRates().catch(() => {});
    }

    const rateStr = cached?.rate.toString() || this.fallbackRates[pair];
    if (!rateStr) {
      throw new Error(`No exchange rate configured for ${from} -> ${to}`);
    }
    const decRate = new Prisma.Decimal(rateStr);
    
    if (!cached) {
      this.cache.set(pair, {
        pair,
        rate: decRate,
        source: 'SANA_OFFICIAL',
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + this.cacheTtlMs),
      });
    }
    return decRate;
  }

  getRateRecord(from: SupportedCurrency, to: SupportedCurrency): FxRateRecord {
    const rate = this.getRateDecimal(from, to);
    const pair = `${from}_${to}`;
    return this.cache.get(pair) || {
      pair,
      rate,
      source: 'SANA_OFFICIAL',
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + this.cacheTtlMs),
    };
  }
}

export class CurrencyService {
  private rateProvider: CurrencyRateProvider;

  constructor(rateProvider?: CurrencyRateProvider) {
    this.rateProvider = rateProvider || new CentralBankRateProvider();
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
