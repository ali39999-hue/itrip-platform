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
  USD?: number;
  CNY?: number;
}

export type SupportedCurrency = 'IRR' | 'TOMAN' | 'USDT' | 'AED' | 'USD' | 'CNY';

export interface CurrencyRateProvider {
  getRateDecimal(from: SupportedCurrency, to: SupportedCurrency): Prisma.Decimal;
}

export const DEFAULT_EXCHANGE_RATES_DECIMAL: Record<string, string> = {
  'IRR_USDT': '0.00000181818', // 1 / 550,000
  'USDT_IRR': '550000',
  'IRR_USD': '0.00000181818',  // 1 / 550,000
  'USD_IRR': '550000',
  'IRR_AED': '0.0000060606',   // 1 / 165,000
  'AED_IRR': '165000',
  'USDT_AED': '3.33',
  'AED_USDT': '0.3003',
  'USD_AED': '3.6725',
  'AED_USD': '0.2723',
  'IRR_CNY': '0.00001315789',  // 1 / 76,000 (1 CNY ~ 76,000 IRR)
  'CNY_IRR': '76000',
  'USD_CNY': '7.23',
  'CNY_USD': '0.1383',
  'USDT_CNY': '7.23',
  'CNY_USDT': '0.1383',
  'USD_USDT': '1.0',
  'USDT_USD': '1.0',
};

export class StaticRateProvider implements CurrencyRateProvider {
  constructor(private rates: Record<string, string> = DEFAULT_EXCHANGE_RATES_DECIMAL) {}

  getRateDecimal(from: SupportedCurrency, to: SupportedCurrency): Prisma.Decimal {
    if (from === to) return new Prisma.Decimal('1.0');
    const rateStr = this.rates[`${from}_${to}`];
    if (rateStr) return new Prisma.Decimal(rateStr);

    // Dynamic cross-rate via IRR
    const fromToIrr = from === 'IRR' ? '1.0' : this.rates[`${from}_IRR`];
    const irrToTarget = to === 'IRR' ? '1.0' : this.rates[`IRR_${to}`];
    if (fromToIrr && irrToTarget) {
      return new Prisma.Decimal(fromToIrr).mul(new Prisma.Decimal(irrToTarget));
    }

    throw new Error(`No exchange rate configured for ${from} -> ${to}`);
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
      if (typeof window !== 'undefined') return;
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
      source: 'STATIC_FALLBACK',
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + this.cacheTtlMs),
    };
  }
}

/**
 * Live FX Rate Provider (SCRAPING-ROADMAP: live currency feed)
 *
 * Replaces the SIMULATED static-rate conversion with a market feed chain that
 * is fail-closed to the static table on ANY error — conversion must never
 * break. Sources, in priority order (first success wins):
 *   1. `fxapi`  — FX_RATE_API_URL (+FX_API_KEY) when the operator configured it.
 *   2. `tgju`   — TGJU public market quotes (free-market USD/USDT/AED/CNY vs IRR).
 *   3. `erapi`  — open.er-api.com (explicit FX_LIVE_SOURCE=erapi ONLY: it
 *                 reports the official pegged IRR, not the market rate).
 * Static table otherwise. IRR market truth: an OTA must use the free-market
 * rate, so official/pegged feeds are never applied to IRR pairs in auto mode.
 *
 * Env: FX_LIVE_SOURCE = auto | tgju | fxapi | erapi | off (default auto).
 */
export class LiveFxRateProvider implements CurrencyRateProvider {
  private cache = new Map<string, FxRateRecord>();
  private inflight: Promise<void> | null = null;
  private lastRefreshAt: Date | null = null;
  private readonly ttlMs: number;
  private readonly staticRates: Record<string, string>;
  private readonly fetchImpl: typeof fetch;

  constructor(opts?: { ttlMs?: number; fetchImpl?: typeof fetch; staticRates?: Record<string, string> }) {
    const envTtl = Number(process.env.FX_CACHE_TTL_MS);
    this.ttlMs = opts?.ttlMs ?? (Number.isFinite(envTtl) && envTtl > 0 ? envTtl : 15 * 60_000);
    this.staticRates = opts?.staticRates ?? DEFAULT_EXCHANGE_RATES_DECIMAL;
    this.fetchImpl = opts?.fetchImpl ?? fetch;
    if (typeof window === 'undefined' && this.isLive()) {
      this.prefetch().catch(() => {});
    }
  }

  private isLive(): boolean {
    if (process.env.DEMO_MODE === 'true') return false;
    const flag = (process.env.FX_LIVE_SOURCE || 'auto').toLowerCase();
    return flag !== 'off' && flag !== 'static';
  }

  private sourceOrder(): Array<'fxapi' | 'tgju' | 'erapi'> {
    const flag = (process.env.FX_LIVE_SOURCE || 'auto').toLowerCase();
    if (flag === 'tgju') return ['tgju'];
    if (flag === 'erapi' || flag === 'er-api') return ['erapi'];
    if (flag === 'fxapi') return ['fxapi'];
    // auto — an explicitly configured FX endpoint keeps today's first-priority spot.
    return process.env.FX_RATE_API_URL || process.env.FX_API_KEY ? ['fxapi', 'tgju'] : ['tgju'];
  }

  private async prefetch(): Promise<void> {
    for (const source of this.sourceOrder()) {
      try {
        const rates =
          source === 'tgju' ? await this.fetchTgju() : source === 'erapi' ? await this.fetchErApi() : await this.fetchFxApi();
        if (rates) {
          this.populate(rates, source === 'tgju' ? 'TGJU_MARKET' : source === 'erapi' ? 'ERAPI_OFFICIAL' : 'FXAPI_LIVE');
          return;
        }
      } catch {
        // try the next source
      }
    }
    // Rate-limit the warning so a permanently dead feed doesn't spam the logs.
    const warnAge = this.lastRefreshAt === null || Date.now() - this.lastRefreshAt.getTime() > 30 * 60_000;
    if (warnAge) console.warn('[FX] all live rate sources failed — serving static fallback rates');
    this.lastRefreshAt = new Date();
  }

  private async fetchJson(url: string, headers?: Record<string, string>): Promise<Record<string, unknown> | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    try {
      const res = await this.fetchImpl(url, { headers: { 'Accept': 'application/json', ...headers }, signal: controller.signal });
      if (!res.ok) return null;
      return (await res.json()) as Record<string, unknown>;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  /** TGJU market quotes → rial prices per unit. Tolerant row parser (ajax.json or summary-table-data). */
  private async fetchTgju(): Promise<Record<string, number> | null> {
    // 1. Try ajax.json (fastest, most reliable live market endpoint)
    try {
      const ajax = await this.fetchJson('https://call.tgju.org/ajax.json');
      const current = (ajax?.['current'] || {}) as Record<string, { p?: string }>;
      if (current && typeof current === 'object') {
        const out: Record<string, number> = {};
        const usd = parsePriceCell(current['price_dollar_rl']?.p || current['price_dollar']?.p);
        if (usd >= 1000) out['USD_IRR'] = usd;

        const usdt = parsePriceCell(current['crypto-tether-irr']?.p || current['usdt-irr']?.p || current['price_usdt_rl']?.p);
        if (usdt >= 1000) out['USDT_IRR'] = usdt;

        const aed = parsePriceCell(current['price_aed']?.p || current['price_aed_rl']?.p);
        if (aed >= 1000) out['AED_IRR'] = aed;

        const cny = parsePriceCell(current['price_cny']?.p || current['price_cny_rl']?.p);
        if (cny >= 1000) out['CNY_IRR'] = cny;

        if (Object.keys(out).length >= 2) return out;
      }
    } catch {
      // fallback to summary-table-data
    }

    // 2. Fallback to summary-table-data (also satisfies unit test fixtures)
    const base = 'https://api.tgju.org/v1/market/indicator/summary-table-data/';
    const keys = ['price_dollar_rl', 'price_usdt_rl', 'price_aed_rl', 'price_cny_rl'];
    let rows: unknown[] | null = null;
    const joined = await this.fetchJson(`${base}${keys.join(',')}?lang=en&order_dir=asc`);
    if (joined && Array.isArray(joined['data'])) rows = joined['data'] as unknown[];
    if (!rows) {
      // Older deployments reject the comma-joined form — fall back per key.
      rows = [];
      for (const key of keys) {
        const single = await this.fetchJson(`${base}${key}?lang=en&order_dir=asc`);
        if (single && Array.isArray(single['data'])) {
          for (const item of single['data'] as unknown[]) {
            if (Array.isArray(item)) rows.push([key, ...item]);
            else rows.push(item);
          }
        }
      }
    }
    if (!rows || rows.length === 0) return null;

    const byKey = new Map<string, number>();
    for (const row of rows) {
      if (!Array.isArray(row) || row.length < 2) continue;
      const key = String(row[0]);
      let price = 0;
      for (let i = row.length - 1; i >= 1; i--) {
        const n = parsePriceCell(row[i]);
        if (n >= 1000) {
          price = n;
          break;
        }
      }
      if (price > 0) byKey.set(key, price);
    }

    const out: Record<string, number> = {};
    const map: Array<[string, string]> = [
      ['price_dollar_rl', 'USD_IRR'],
      ['price_usdt_rl', 'USDT_IRR'],
      ['price_aed_rl', 'AED_IRR'],
      ['price_cny_rl', 'CNY_IRR'],
    ];
    for (const [key, pair] of map) {
      const v = byKey.get(key);
      if (v && v > 0) out[pair] = v;
    }
    return Object.keys(out).length > 0 ? out : null;
  }

  /** Explicitly opted-in configured feed (same contract as CentralBankRateProvider). */
  private async fetchFxApi(): Promise<Record<string, number> | null> {
    const endpoint = process.env.FX_RATE_API_URL || 'https://api.exchangerate-api.com/v4/latest/';
    const data = await this.fetchJson(`${endpoint}USD`, process.env.FX_API_KEY ? { Authorization: `Bearer ${process.env.FX_API_KEY}` } : undefined);
    const rates = data?.['rates'] as Record<string, number> | undefined;
    if (!rates || !rates['IRR'] || rates['IRR'] <= 0) return null;
    const out: Record<string, number> = { USD_IRR: Number(rates['IRR']) };
    if (rates['AED']) out['AED_IRR'] = Number(rates['IRR']) / Number(rates['AED']);
    if (rates['CNY']) out['CNY_IRR'] = Number(rates['IRR']) / Number(rates['CNY']);
    return out;
  }

  /** open.er-api.com — explicit operator override only (pegged official IRR). */
  private async fetchErApi(): Promise<Record<string, number> | null> {
    const data = await this.fetchJson('https://open.er-api.com/v6/latest/USD');
    const rates = data?.['rates'] as Record<string, number> | undefined;
    if (!rates || !rates['IRR'] || rates['IRR'] <= 0) return null;
    const out: Record<string, number> = { USD_IRR: Number(rates['IRR']) };
    if (rates['AED']) out['AED_IRR'] = Number(rates['IRR']) / Number(rates['AED']);
    if (rates['CNY']) out['CNY_IRR'] = Number(rates['IRR']) / Number(rates['CNY']);
    return out;
  }

  private populate(rates: Record<string, number>, source: string): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlMs);
    for (const [pair, value] of Object.entries(rates)) {
      if (!value || value <= 0) continue;
      const rate = new Prisma.Decimal(value.toString());
      this.cache.set(pair, { pair, rate, source, timestamp: now, expiresAt });
      const [from, to] = pair.split('_');
      if (from && to && from !== to) {
        const inversePair = `${to}_${from}`;
        this.cache.set(inversePair, {
          pair: inversePair,
          rate: new Prisma.Decimal('1.0').div(rate),
          source,
          timestamp: now,
          expiresAt,
        });
      }
    }
    this.lastRefreshAt = now;
  }

  private maybeRefresh(): void {
    const stale = this.lastRefreshAt === null || Date.now() - this.lastRefreshAt.getTime() > this.ttlMs;
    if (this.inflight || !stale || !this.isLive()) return;
    this.inflight = this.prefetch().finally(() => {
      this.inflight = null;
    });
  }

  getRateDecimal(from: SupportedCurrency, to: SupportedCurrency): Prisma.Decimal {
    if (from === to) return new Prisma.Decimal('1.0');
    const now = new Date();
    this.maybeRefresh();

    // Fully-live path: both legs must come from the same live snapshot.
    const fromRec = from === 'IRR' ? this.cache.get(`IRR_${to}`) : this.cache.get(`${from}_IRR`);
    const toRec = to === 'IRR' ? this.cache.get(`${from}_IRR`) : this.cache.get(`IRR_${to}`);
    const liveDirect = from !== 'IRR' && to !== 'IRR' ? this.cache.get(`${from}_${to}`) : undefined;
    const liveViaIrr =
      from === 'IRR'
        ? toRec && toRec.expiresAt > now
          ? toRec.rate
          : null
        : to === 'IRR'
          ? fromRec && fromRec.expiresAt > now
            ? fromRec.rate
            : null
          : fromRec && toRec && fromRec.expiresAt > now && toRec.expiresAt > now
            ? fromRec.rate.mul(toRec.rate)
            : null;

    if (liveViaIrr && !liveDirect) return liveViaIrr;
    if (liveDirect && liveDirect.expiresAt > now) return liveDirect.rate;

    // Static fallback (fully-static path — never mix live and static legs).
    const rateStr = this.staticRates[`${from}_${to}`];
    if (rateStr) return new Prisma.Decimal(rateStr);
    const fromToIrr = from === 'IRR' ? '1.0' : this.staticRates[`${from}_IRR`];
    const irrToTarget = to === 'IRR' ? '1.0' : this.staticRates[`IRR_${to}`];
    if (fromToIrr && irrToTarget) {
      return new Prisma.Decimal(fromToIrr).mul(new Prisma.Decimal(irrToTarget));
    }
    throw new Error(`No exchange rate configured for ${from} -> ${to}`);
  }

  getRateRecord(from: SupportedCurrency, to: SupportedCurrency): FxRateRecord {
    const pair = `${from}_${to}`;
    const cached = this.cache.get(pair);
    if (cached) {
      const rate = this.getRateDecimal(from, to);
      return { ...cached, rate };
    }
    return {
      pair,
      rate: this.getRateDecimal(from, to),
      source: 'STATIC_FALLBACK',
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + this.ttlMs),
    };
  }
}

export class CurrencyService {
  private rateProvider: CurrencyRateProvider;

  constructor(rateProvider?: CurrencyRateProvider) {
    // Live feed chain (fail-closed to the static table) — see LiveFxRateProvider.
    this.rateProvider = rateProvider || new LiveFxRateProvider();
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
      case 'USD':
        return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      case 'CNY':
        return `¥${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
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

/** "618,500" | "۶۱۸٬۵۰۰" | "618500.00" → 618500 (0 when unparseable). */
function parsePriceCell(cell: unknown): number {
  if (typeof cell === 'number') return Number.isFinite(cell) ? cell : 0;
  if (typeof cell !== 'string') return 0;
  const faDigits = '۰۱۲۳۴۵۶۷۸۹';
  const normalized = cell.replace(/[۰-۹]/g, (d) => String(faDigits.indexOf(d)));
  const cleaned = normalized.replace(/[^\d.]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}
