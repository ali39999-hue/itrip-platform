/**
 * Competitor Price Probe (SCRAPING-ROADMAP: best-price-guarantee support)
 *
 * Low-rate snapshots of competitor cheapest fares for demanded routes, stored
 * in CompetitorPriceSnapshot. Design constraints (docs/SCRAPING_STATUS_AND_ROADMAP.fa.md):
 *  - DISABLED by default (COMPETITOR_PROBE_ENABLED=true to opt in) — competitor
 *    endpoints are internal/private APIs; probing is minimal by design and a
 *    formal agreement (api-support@alibaba.ir) is the long-term path.
 *  - Request budget: at most COMPETITOR_PROBE_ROUTES (default 3) routes per
 *    run, one search start + a few polls each — never bulk consumption.
 *  - Prices are in IRR (Alibaba priceAdult scale matches our catalog).
 */

import { prisma } from '@/lib/prisma';

const ALIBABA_BASE = 'https://ws.alibaba.ir/api/v2';
const ALIBABA_AB_CHANNEL = 'WEB-NEW,PRODUCTION,CSR,www.alibaba.ir,N,Chrome,126.0.0.0,N,N,Windows';
const ALIBABA_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36';
const POLL_ATTEMPTS = 6;
const POLL_INTERVAL_MS = 1500;

export interface CompetitorMinPrice {
  minPriceIrr: number | null;
  offersChecked: number;
  cheapestFlight: string | null;
}

export interface CompetitorSource {
  code: string;
  minPrice(params: { origin: string; destination: string; departureDate: string }): Promise<CompetitorMinPrice>;
}

export function competitorProbeEnabled(): boolean {
  return process.env.COMPETITOR_PROBE_ENABLED === 'true';
}

async function alibabaHeaders(): Promise<Record<string, string>> {
  return {
    'Content-Type': 'application/json',
    'ab-channel': ALIBABA_AB_CHANNEL,
    'User-Agent': ALIBABA_UA,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Verified unauthenticated flow from api_hunt/APIS.md (2026-09, live-probed). */
export class AlibabaCompetitorSource implements CompetitorSource {
  readonly code = 'ALIBABA';
  private readonly fetchImpl: typeof fetch;

  constructor(fetchImpl?: typeof fetch) {
    this.fetchImpl = fetchImpl ?? fetch;
  }

  async minPrice(params: { origin: string; destination: string; departureDate: string }): Promise<CompetitorMinPrice> {
    const startRes = await this.fetchImpl(`${ALIBABA_BASE}/flights/domestic/available`, {
      method: 'POST',
      headers: await alibabaHeaders(),
      body: JSON.stringify({
        DepartureDate: params.departureDate,
        Origin: params.origin.toUpperCase(),
        Destination: params.destination.toUpperCase(),
        adultCount: 1,
      }),
    });
    if (!startRes.ok) throw new Error(`ALIBABA_HTTP_${startRes.status}: search start failed`);
    const startJson = (await startRes.json()) as { success?: boolean; result?: { requestId?: string } };
    const requestId = startJson?.result?.requestId;
    if (!startJson?.success || !requestId) throw new Error('ALIBABA_PARSE: requestId missing');

    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);
      const pollRes = await this.fetchImpl(`${ALIBABA_BASE}/flights/domestic/available/${requestId}`, {
        headers: await alibabaHeaders(),
      });
      if (!pollRes.ok) continue;
      const pollJson = (await pollRes.json()) as {
        result?: {
          departing?: Array<{ priceAdult?: number; flightNumber?: string; isAllowedToBuy?: boolean }>;
          isCompleted?: boolean;
        };
      };
      const departing = pollJson?.result?.departing ?? [];
      const bookable = departing.filter((f) => f.isAllowedToBuy !== false && Number(f.priceAdult) > 0);
      if (bookable.length > 0) {
        const cheapest = bookable.reduce((a, b) => (Number(a.priceAdult) <= Number(b.priceAdult) ? a : b));
        return {
          minPriceIrr: Math.round(Number(cheapest.priceAdult)),
          offersChecked: bookable.length,
          cheapestFlight: cheapest.flightNumber || null,
        };
      }
      if (pollJson?.result?.isCompleted) break;
    }
    return { minPriceIrr: null, offersChecked: 0, cheapestFlight: null };
  }
}

export interface CompetitorProbeReport {
  skipped?: 'PROBE_DISABLED';
  probed: number;
  saved: number;
  errors: number;
}

/**
 * One probe cycle: top demanded routes × tomorrow's departure. Default-off;
 * call sites (worker entrypoint / cron) must be cheap no-ops when disabled.
 */
export async function runCompetitorProbe(opts?: {
  source?: CompetitorSource;
  maxRoutes?: number;
  lookAheadDays?: number;
}): Promise<CompetitorProbeReport> {
  if (!competitorProbeEnabled()) {
    return { skipped: 'PROBE_DISABLED', probed: 0, saved: 0, errors: 0 };
  }

  let demand: Array<{ routeKey: string; originCode: string; destinationCode: string }>;
  try {
    demand = await prisma.flightRouteDemand.findMany({
      where: { enabled: true },
      orderBy: [{ priority: 'desc' }, { lastRefreshedAt: 'asc' }],
      take: Math.max(1, opts?.maxRoutes ?? (Number(process.env.COMPETITOR_PROBE_ROUTES) || 3)),
    });
  } catch {
    return { probed: 0, saved: 0, errors: 0 };
  }
  if (demand.length === 0) return { probed: 0, saved: 0, errors: 0 };

  const source = opts?.source ?? new AlibabaCompetitorSource();
  const lookAheadDays = Math.max(1, opts?.lookAheadDays ?? 1); // tomorrow by default
  const departureDate = new Date(Date.now() + lookAheadDays * 86_400_000).toISOString().slice(0, 10);

  let probed = 0;
  let saved = 0;
  let errors = 0;

  for (const route of demand) {
    probed++;
    try {
      const snapshot = await source.minPrice({
        origin: route.originCode,
        destination: route.destinationCode,
        departureDate,
      });
      await prisma.competitorPriceSnapshot.upsert({
        where: {
          competitor_routeKey_departureDate: {
            competitor: source.code,
            routeKey: route.routeKey,
            departureDate: new Date(`${departureDate}T00:00:00.000Z`),
          },
        },
        create: {
          competitor: source.code,
          routeKey: route.routeKey,
          originCode: route.originCode,
          destinationCode: route.destinationCode,
          departureDate: new Date(`${departureDate}T00:00:00.000Z`),
          currency: 'IRR',
          minPrice: snapshot.minPriceIrr,
          offersChecked: snapshot.offersChecked,
          cheapestFlight: snapshot.cheapestFlight,
        },
        update: {
          minPrice: snapshot.minPriceIrr,
          offersChecked: snapshot.offersChecked,
          cheapestFlight: snapshot.cheapestFlight,
          probedAt: new Date(),
        },
      });
      saved++;
    } catch {
      errors++;
    }
    // Politeness gap between competitor searches.
    await sleep(2000);
  }

  return { probed, saved, errors };
}

/** Read side for the pricing/UI layer: our floor vs the competitor's cheapest. */
export async function getCompetitorMinPrice(routeKey: string, departureDate: string) {
  try {
    return await prisma.competitorPriceSnapshot.findUnique({
      where: {
        competitor_routeKey_departureDate: {
          competitor: 'ALIBABA',
          routeKey,
          departureDate: new Date(`${departureDate}T00:00:00.000Z`),
        },
      },
    });
  } catch {
    return null;
  }
}
