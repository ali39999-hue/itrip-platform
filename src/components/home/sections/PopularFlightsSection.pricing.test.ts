import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_POPULAR_ROUTES,
  POPULAR_ROUTES_BY_COUNTRY,
} from './popular-routes-data';

/**
 * Pricing truth guard (Product-Truth / CONV-P0):
 *
 * The flights master catalog (`src/data/server/flights-master.json`) stores
 * `adult_sell_price` in RIALS. The search UI converts to Toman via
 * `Math.round(price / 10)` (see BentoFlightCard). The homepage popular-routes
 * section displays Toman natively (formatMoney without conversion), so its
 * static prices MUST equal the catalog minimum divided by 10 — otherwise the
 * homepage contradicts the search results for the same route.
 *
 * If this test fails after a catalog refresh, re-sync the static prices in
 * PopularFlightsSection to `Math.round(min_adult_sell_price / 10)`.
 */

interface MasterFlight {
  price?: { adult_sell_price?: number };
}
interface MasterRoute {
  origin: string;
  destination: string;
  flights?: MasterFlight[];
}

const LATIN: Record<string, string> = {
  'تهران': 'Tehran',
  'مشهد': 'Mashhad',
  'کیش': 'Kish',
  'اصفهان': 'Isfahan',
  'شیراز': 'Shiraz',
  'تبریز': 'Tabriz',
  'استانبول': 'Istanbul',
  'دبی': 'Dubai',
  'تفلیس': 'Tbilisi',
  'مسقط': 'Muscat',
};

function loadCatalogMinToman(fromFa: string, toFa: string): number | null {
  const from = LATIN[fromFa];
  const to = LATIN[toFa];
  if (!from || !to) return null;

  const masterPath = path.join(process.cwd(), 'src/data/server/flights-master.json');
  const master = JSON.parse(readFileSync(masterPath, 'utf-8')) as { routes?: MasterRoute[] };

  const prices = (master.routes || [])
    .filter((r) => r.origin === from && r.destination === to)
    .flatMap((r) => (r.flights || []).map((f) => f.price?.adult_sell_price).filter((p): p is number => typeof p === 'number' && p > 0));

  if (prices.length === 0) return null;
  return Math.round(Math.min(...prices) / 10);
}

function collectStaticPrices(fromFa: string, toFa: string): { price: number; list: string }[] {
  const hits: { price: number; list: string }[] = [];
  for (const r of DEFAULT_POPULAR_ROUTES) {
    if (r.fromFa === fromFa && r.toFa === toFa) hits.push({ price: r.price, list: 'default' });
  }
  for (const [country, routes] of Object.entries(POPULAR_ROUTES_BY_COUNTRY)) {
    for (const r of routes) {
      if (r.fromFa === fromFa && r.toFa === toFa) hits.push({ price: r.price, list: country });
    }
  }
  return hits;
}

describe('PopularFlightsSection pricing truth vs flights catalog', () => {
  it('every catalog-covered popular route shows the catalog minimum (Toman), never more', () => {
    const routes: [string, string][] = [
      ['تهران', 'مشهد'],
      ['شیراز', 'تهران'],
      ['تهران', 'تبریز'],
      ['مشهد', 'کیش'],
      ['تهران', 'استانبول'],
      ['تهران', 'دبی'],
      ['تهران', 'تفلیس'],
      ['تهران', 'مسقط'],
    ];

    const failures: string[] = [];
    for (const [fromFa, toFa] of routes) {
      const catalogMin = loadCatalogMinToman(fromFa, toFa);
      expect(catalogMin, `catalog should contain ${fromFa}→${toFa}`).not.toBeNull();

      const statics = collectStaticPrices(fromFa, toFa);
      expect(statics.length, `homepage must list ${fromFa}→${toFa}`).toBeGreaterThan(0);

      for (const s of statics) {
        // Allow at most 2% below the true minimum (display rounding), never above.
        const ok = s.price <= catalogMin! && s.price >= Math.floor(catalogMin! * 0.98);
        if (!ok) {
          failures.push(`${fromFa}→${toFa} [${s.list}]: static ${s.price} vs catalog min ${catalogMin}`);
        }
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('routes present in multiple lists use one consistent price', () => {
    for (const [fromFa, toFa] of [['تهران', 'مشهد'], ['تهران', 'استانبول'], ['تهران', 'دبی'], ['تهران', 'تفلیس'], ['شیراز', 'تهران']] as [string, string][]) {
      const statics = collectStaticPrices(fromFa, toFa);
      const prices = new Set(statics.map((s) => s.price));
      expect(prices.size, `${fromFa}→${toFa} has divergent prices across lists`).toBeLessThanOrEqual(1);
    }
  });

  it('static prices are positive and Toman-scale (not raw rial)', () => {
    const domesticRoutes = POPULAR_ROUTES_BY_COUNTRY.iran;
    for (const r of domesticRoutes) {
      expect(r.price, `${r.fromFa}→${r.toFa}`).toBeGreaterThan(0);
      // Domestic one-way flights in catalog range from 3.5M to 15M Toman;
      // raw-rial values leak in as 10x (35M - 150M) and would fail this guard.
      expect(r.price, `${r.fromFa}→${r.toFa} looks like an unconverted rial value`).toBeLessThan(35_000_000);
    }

    const all = [
      ...DEFAULT_POPULAR_ROUTES,
      ...Object.values(POPULAR_ROUTES_BY_COUNTRY).flat(),
    ];
    for (const r of all) {
      expect(r.price, `${r.fromFa}→${r.toFa}`).toBeGreaterThan(0);
      expect(r.price, `${r.fromFa}→${r.toFa} international price exceeds realistic bounds`).toBeLessThan(300_000_000);
    }
  });
});
