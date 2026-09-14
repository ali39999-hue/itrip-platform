import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LiveFxRateProvider } from './CurrencyService';

/**
 * Live FX feed chain (tgju → configured fxapi → erapi → static). Unit tests
 * inject fetch — no network. IRR pairs must only ever come from market feeds;
 * pegged/official feeds (erapi) are explicit-override only and never in auto.
 */

function tgjuResponse(usd: number, usdt: number, aed: number, cny?: number) {
  const row = (key: string, price: number) => [key, '1404/06/22', '12:00:00', '0', '0', '0', price.toLocaleString('en-US'), '0'];
  return {
    data: [
      row('price_dollar_rl', usd),
      row('price_usdt_rl', usdt),
      row('price_aed_rl', aed),
      ...(cny ? [row('price_cny_rl', cny)] : []),
    ],
  };
}

function fetchMockReturning(responses: Record<string, unknown>) {
  return vi.fn().mockImplementation(async (url: unknown) => {
    const key = String(url);
    for (const [needle, body] of Object.entries(responses)) {
      if (key.includes(needle)) {
        return { ok: true, status: 200, json: async () => body };
      }
    }
    return { ok: false, status: 404, json: async () => ({}) };
  });
}

describe('LiveFxRateProvider (live currency feed — fail-closed)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.DEMO_MODE;
    delete process.env.FX_LIVE_SOURCE;
    delete process.env.FX_RATE_API_URL;
    delete process.env.FX_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('serves tgju market rates for IRR pairs', async () => {
    const fetchImpl = fetchMockReturning({ 'summary-table-data': tgjuResponse(618_500, 621_000, 168_500, 86_000) });
    const provider = new LiveFxRateProvider({ fetchImpl });

    await vi.waitFor(() => {
      expect(provider.getRateRecord('USD', 'IRR').source).toBe('TGJU_MARKET');
    });
    expect(provider.getRateDecimal('USD', 'IRR').toNumber()).toBe(618_500);
    expect(provider.getRateDecimal('USDT', 'IRR').toNumber()).toBe(621_000);
    expect(provider.getRateDecimal('AED', 'IRR').toNumber()).toBe(168_500);
    expect(provider.getRateDecimal('CNY', 'IRR').toNumber()).toBe(86_000);
    // inverse direction
    expect(provider.getRateDecimal('IRR', 'USD').toNumber()).toBeCloseTo(1 / 618_500, 12);
  });

  it('computes live cross rates via the IRR leg (USD → AED)', async () => {
    const fetchImpl = fetchMockReturning({ 'summary-table-data': tgjuResponse(600_000, 600_000, 150_000) });
    const provider = new LiveFxRateProvider({ fetchImpl });

    await vi.waitFor(() => {
      expect(provider.getRateRecord('USD', 'IRR').source).toBe('TGJU_MARKET');
    });
    expect(provider.getRateDecimal('USD', 'AED').toNumber()).toBeCloseTo(4, 6);
  });

  it('falls back to the static table when every live source fails (never throws)', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network dead'));
    const provider = new LiveFxRateProvider({ fetchImpl });

    await new Promise((r) => setTimeout(r, 20)); // let the prefetch fail

    const record = provider.getRateRecord('USD', 'IRR');
    expect(record.source).toBe('STATIC_FALLBACK');
    expect(provider.getRateDecimal('USD', 'IRR').toNumber()).toBe(550_000);
    expect(fetchImpl).toHaveBeenCalled(); // it really tried
  });

  it('honors FX_LIVE_SOURCE=off and DEMO_MODE without touching the network', async () => {
    process.env.FX_LIVE_SOURCE = 'off';
    const offFetch = vi.fn();
    const offProvider = new LiveFxRateProvider({ fetchImpl: offFetch as unknown as typeof fetch });
    await new Promise((r) => setTimeout(r, 10));
    expect(offProvider.getRateDecimal('USD', 'IRR').toNumber()).toBe(550_000);
    expect(offFetch).not.toHaveBeenCalled();

    process.env.FX_LIVE_SOURCE = undefined;
    process.env.DEMO_MODE = 'true';
    const demoFetch = vi.fn();
    const demoProvider = new LiveFxRateProvider({ fetchImpl: demoFetch as unknown as typeof fetch });
    await new Promise((r) => setTimeout(r, 10));
    expect(demoProvider.getRateDecimal('USD', 'IRR').toNumber()).toBe(550_000);
    expect(demoFetch).not.toHaveBeenCalled();
  });

  it('never applies pegged official feeds to IRR pairs in auto mode', async () => {
    const fetchImpl = fetchMockReturning({
      // open.er-api.com answers here, but auto mode must ignore it for IRR.
      'summary-table-data': { unexpected: true },
      'er-api.com': { result: 'success', rates: { IRR: 42_000, AED: 3.67, CNY: 7.2 } },
    });
    const provider = new LiveFxRateProvider({ fetchImpl });

    await new Promise((r) => setTimeout(r, 20));

    // tgju answered garbage → chain exhausted → static, NOT the pegged 42,000.
    expect(provider.getRateDecimal('USD', 'IRR').toNumber()).toBe(550_000);
  });

  it('keeps currency conversion honest via CurrencyService default wiring', async () => {
    // The default CurrencyService wires LiveFxRateProvider; with live sources
    // dead it must behave exactly like the old static service.
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
    const provider = new LiveFxRateProvider({ fetchImpl });
    await new Promise((r) => setTimeout(r, 20));

    expect(provider.getRateDecimal('USD', 'IRR').toNumber()).toBe(550_000);
    expect(provider.getRateDecimal('IRR', 'AED').toNumber()).toBeCloseTo(1 / 165_000, 9);
  });
});
