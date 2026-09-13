import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Flight } from '@/lib/types';

// FlightCacheService is wired to Prisma; unit tests replace the client with an
// in-memory fake keyed by offerId/routeKey (mirrors the production read path).
const { cacheRows, demandRows } = vi.hoisted(() => ({
  cacheRows: [] as Array<Record<string, unknown>>,
  demandRows: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    flightOfferCache: {
      findMany: vi.fn(async (args: { where: { routeKey: string } }) =>
        cacheRows.filter((r) => r['routeKey'] === args.where.routeKey)
      ),
      findFirst: vi.fn(async () => cacheRows[0] ?? null),
      findUnique: vi.fn(async () => cacheRows[0] ?? null),
      upsert: vi.fn(async ({ where, create }: { where: { offerId: string }; create: Record<string, unknown> }) => {
        const idx = cacheRows.findIndex((r) => r['offerId'] === where.offerId);
        if (idx >= 0) cacheRows[idx] = { ...cacheRows[idx] };
        else cacheRows.push({ ...create });
        return create;
      }),
      count: vi.fn(async () => cacheRows.length),
      groupBy: vi.fn(async () => []),
    },
    flightRouteDemand: {
      upsert: vi.fn(async ({ where, create }: { where: { routeKey: string }; create: Record<string, unknown> }) => {
        if (!demandRows.find((r) => r['routeKey'] === where.routeKey)) demandRows.push({ ...create });
        return create;
      }),
      findMany: vi.fn(async () => demandRows),
      count: vi.fn(async () => demandRows.length),
      updateMany: vi.fn(async () => ({ count: 1 })),
      createMany: vi.fn(async () => ({ count: 0 })),
    },
  },
}));

import {
  overlayLiveFlights,
  resolveRoute,
  routeKeyFor,
  isLiveOverlayEnabled,
} from './flight-cache-service';
import { PartoCrsApiClient, PARTO_CRS_SUPPLIER_CODE } from '@/domains/supplier/adapters/PartoCrsApiClient';
import { PartoPortalProvider } from '@/domains/supplier/adapters/PartoPortalProvider';

function staticResult() {
  return {
    flights: [{ id: 'fl_static_1' } as unknown as Flight],
    total: 1,
    page: 1,
    totalPages: 1,
    priceBounds: { min: 10_000_000, max: 10_000_000 },
    airlineFacets: [],
    stopCounts: [1, 0, 0] as [number, number, number],
    ticketTypeCounts: { systemic: 1, charter: 0 },
    cabinClassCounts: { economy: 1, business: 0 },
    timeCounts: { morning: 1, afternoon: 0, evening: 0, night: 0 },
  };
}

function cacheRowFixture(offerId: string): Record<string, unknown> {
  const now = new Date();
  return {
    supplierCode: PARTO_CRS_SUPPLIER_CODE,
    offerId,
    fareSourceCode: 'SRC-1',
    routeKey: 'THR-MHD',
    originCode: 'THR',
    destinationCode: 'MHD',
    departureTime: new Date(Date.parse('2026-10-01T08:30:00Z')),
    arrivalTime: new Date(Date.parse('2026-10-01T10:05:00Z')),
    airlineCode: 'W5',
    airlineName: 'W5',
    flightNumber: 'W5-112',
    cabinClass: 'ECONOMY',
    stops: 0,
    seatsRemaining: 6,
    baseFare: 9_800_000,
    totalFare: 11_450_000,
    totalTax: 1_650_000,
    currency: 'IRR',
    baggage: '20kg',
    isCharter: true,
    refundable: false,
    ticketType: 'charter',
    durationMinutes: 95,
    fetchedAt: now,
    expiresAt: new Date(now.getTime() + 60 * 60_000),
  };
}

function identityPaging(pool: Flight[]): ReturnType<typeof staticResult> {
  return {
    ...staticResult(),
    flights: pool,
    total: pool.length,
    priceBounds: { min: 11_450_000, max: 11_450_000 },
  };
}

describe('Flight cache service (stale-while-revalidate overlay)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    cacheRows.length = 0;
    demandRows.length = 0;
    process.env = { ...originalEnv };
    process.env.PARTO_CRS_OFFICE_ID = 'X-1';
    process.env.PARTO_CRS_USERNAME = 'u';
    process.env.PARTO_CRS_PASSWORD = 'p';
    process.env.FLIGHT_LIVE_OVERLAY = 'auto';
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('resolves free-text route input to IATA codes and a directional route key', () => {
    expect(resolveRoute('THR', 'MHD')).toEqual({ routeKey: 'THR-MHD', originCode: 'THR', destinationCode: 'MHD' });
    expect(resolveRoute('بدون مبدأ', 'MHD')).toBeNull();
    expect(resolveRoute('THR', 'THR')).toBeNull();
    expect(routeKeyFor('thr', 'mhd')).toBe('THR-MHD');
  });

  it('overlay is inactive without credentials (auto mode) and static data passes through', async () => {
    delete process.env.PARTO_CRS_OFFICE_ID;
    delete process.env.PARTO_CRS_USERNAME;
    delete process.env.PARTO_CRS_PASSWORD;
    delete process.env.PARTO_PORTAL_COOKIE;

    const portalSpy = vi.spyOn(PartoPortalProvider, 'isConfigured').mockReturnValue(false);
    try {
      expect(isLiveOverlayEnabled()).toBe(false);
      const base = staticResult();
      const outcome = await overlayLiveFlights(base, { from: 'THR', to: 'MHD', departDate: '2026-10-01' }, () => identityPaging([]));
      expect(outcome.data).toBe(base);
      expect(outcome.meta).toBeNull();
    } finally {
      portalSpy.mockRestore();
    }
  });

  it('serves cached live rows over the static catalog with a freshness meta badge', async () => {
    const offerId = PartoCrsApiClient.offerIdFromFareSourceCode('SRC-1');
    cacheRows.push(cacheRowFixture(offerId));

    const base = staticResult();
    const outcome = await overlayLiveFlights(
      base,
      { from: 'THR', to: 'MHD', departDate: '2026-10-01' },
      (pool) => identityPaging(pool)
    );

    expect(outcome.meta).not.toBeNull();
    expect(outcome.meta!.count).toBe(1);
    expect(outcome.meta!.stale).toBe(false);
    expect(outcome.data.flights).toHaveLength(1);
    expect(outcome.data.flights[0].id).toBe(offerId);
    expect(outcome.data.flights[0].price).toBe(11_450_000);
    expect(outcome.data.flights[0].departureTime).toBe('08:30'); // Tehran wall-clock preserved
    expect(outcome.data.flights[0].ticketType).toBe('charter');
    // user search bumps the route into the hourly sweep
    expect(demandRows.find((r) => r['routeKey'] === 'THR-MHD')).toBeTruthy();
  });

  it('falls back to the static result when the cache is empty', async () => {
    const base = staticResult();
    const outcome = await overlayLiveFlights(
      base,
      { from: 'THR', to: 'MHD', departDate: '2030-01-01' },
      (pool) => identityPaging(pool)
    );
    expect(outcome.data).toBe(base);
    expect(outcome.meta).toBeNull();
  });

  it('returns the static result (never throws) when a route cannot be resolved', async () => {
    const base = staticResult();
    const outcome = await overlayLiveFlights(
      base,
      { from: 'نامشخص', to: 'MHD', departDate: '2026-10-01' },
      (pool) => identityPaging(pool)
    );
    expect(outcome.data).toBe(base);
  });
});
