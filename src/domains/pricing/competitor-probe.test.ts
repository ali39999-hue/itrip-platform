import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { demandRows, upsertMock } = vi.hoisted(() => ({
  demandRows: [] as Array<Record<string, unknown>>,
  upsertMock: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    flightRouteDemand: {
      findMany: vi.fn(async (args?: { take?: number }) =>
        demandRows.slice(0, args?.take ?? demandRows.length)
      ),
    },
    competitorPriceSnapshot: {
      upsert: upsertMock,
      findUnique: vi.fn(),
    },
  },
}));

import {
  AlibabaCompetitorSource,
  competitorProbeEnabled,
  runCompetitorProbe,
} from './competitor-probe';

describe('Competitor price probe (gated, low-rate)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.COMPETITOR_PROBE_ENABLED;
    delete process.env.COMPETITOR_PROBE_ROUTES;
    demandRows.length = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('is disabled by default and its run is a cheap no-op', async () => {
    expect(competitorProbeEnabled()).toBe(false);

    const report = await runCompetitorProbe();
    expect(report.skipped).toBe('PROBE_DISABLED');
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('snapshots the cheapest bookable fare per demanded route', async () => {
    process.env.COMPETITOR_PROBE_ENABLED = 'true';
    demandRows.push(
      { routeKey: 'THR-MHD', originCode: 'THR', destinationCode: 'MHD', priority: 100 },
      { routeKey: 'THR-KIH', originCode: 'THR', destinationCode: 'KIH', priority: 90 }
    );

    const fakeSource = {
      code: 'ALIBABA',
      minPrice: vi
        .fn()
        .mockResolvedValueOnce({ minPriceIrr: 2_480_000, offersChecked: 12, cheapestFlight: 'W5-112' })
        .mockRejectedValueOnce(new Error('ALIBABA_HTTP_503')),
    };

    const report = await runCompetitorProbe({ source: fakeSource });

    expect(report.probed).toBe(2);
    expect(report.saved).toBe(1);
    expect(report.errors).toBe(1);
    expect(upsertMock).toHaveBeenCalledTimes(1);

    const call = upsertMock.mock.calls[0][0];
    expect(call.where.competitor_routeKey_departureDate.competitor).toBe('ALIBABA');
    expect(call.where.competitor_routeKey_departureDate.routeKey).toBe('THR-MHD');
    expect(call.create.minPrice).toBe(2_480_000);
    expect(call.create.cheapestFlight).toBe('W5-112');
    expect(call.create.currency).toBe('IRR');
  });

  it('caps the request budget (maxRoutes) per run', async () => {
    process.env.COMPETITOR_PROBE_ENABLED = 'true';
    for (let i = 0; i < 10; i++) {
      demandRows.push({ routeKey: `THR-CITY${i}`, originCode: 'THR', destinationCode: `CY${i}`, priority: 50 });
    }

    const fakeSource = {
      code: 'ALIBABA',
      minPrice: vi.fn().mockResolvedValue({ minPriceIrr: 1_000_000, offersChecked: 5, cheapestFlight: null }),
    };

    const report = await runCompetitorProbe({ source: fakeSource, maxRoutes: 2 });
    expect(report.probed).toBe(2);
    expect(fakeSource.minPrice).toHaveBeenCalledTimes(2);
  });
});

describe('AlibabaCompetitorSource (api_hunt-verified flow)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('polls until departing offers appear and picks the cheapest bookable fare', async () => {
    const responses = [
      { success: true, result: { requestId: 'GE2D123' } },
      { result: { departing: [], isCompleted: false } },
      {
        result: {
          isCompleted: true,
          departing: [
            { priceAdult: 2_500_000, flightNumber: 'IR-622', isAllowedToBuy: true },
            { priceAdult: 2_180_000, flightNumber: 'W5-112', isAllowedToBuy: true },
            { priceAdult: 1_900_000, flightNumber: 'B9-999', isAllowedToBuy: false }, // not bookable
          ],
        },
      },
    ];
    let call = 0;
    const fetchImpl = vi.fn().mockImplementation(async () => {
      const body = responses[Math.min(call, responses.length - 1)];
      call++;
      return { ok: true, status: 200, json: async () => body };
    });

    const source = new AlibabaCompetitorSource(fetchImpl as unknown as typeof fetch);
    const out = await source.minPrice({ origin: 'THR', destination: 'MHD', departureDate: '2026-09-20' });

    expect(out.minPriceIrr).toBe(2_180_000);
    expect(out.cheapestFlight).toBe('W5-112');
    expect(out.offersChecked).toBe(2);
    expect(String(fetchImpl.mock.calls[0][0])).toContain('/flights/domestic/available');
  });

  it('returns an empty snapshot when the search completes without bookable offers', async () => {
    const responses = [
      { success: true, result: { requestId: 'GE2D999' } },
      { result: { departing: [], isCompleted: true } },
    ];
    let call = 0;
    const fetchImpl = vi.fn().mockImplementation(async () => {
      const body = responses[Math.min(call, responses.length - 1)];
      call++;
      return { ok: true, status: 200, json: async () => body };
    });

    const source = new AlibabaCompetitorSource(fetchImpl as unknown as typeof fetch);
    const out = await source.minPrice({ origin: 'THR', destination: 'KIH', departureDate: '2026-09-20' });

    expect(out.minPriceIrr).toBeNull();
    expect(out.offersChecked).toBe(0);
  });
});
