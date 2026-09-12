/**
 * Flight Cache Worker (FLIGHT-CACHE-101)
 *
 * Hourly sweep that keeps live flight offers warm for demanded routes:
 * - Seeds FlightRouteDemand with popular Iranian routes on first run.
 * - For each enabled route × lookAheadDays, refreshes route+dates whose cache
 *   rows are older than the TTL window (stale-while-revalidate at the worker).
 * - Source: official Parto CRS API v3 when its credentials exist, otherwise
 *   authenticated portal scraping (captured session). Errors land in
 *   FlightRouteDemand.lastError + Exception Center via the transport layer.
 *
 * No-op (skipped) when no source is configured, so dev/e2e workers run
 * unchanged. Docs: docs/PARTO_LIVE_INTEGRATION_PLAN.fa.md §3, §7.
 */

import { refreshStaleRoutes, resolveFlightRefreshSource } from '@/services/flight-cache-service';

export interface FlightCacheSweepReport {
  skipped?: string;
  source?: string;
  routesConsidered: number;
  refreshes: number;
  upserted: number;
  failures: number;
}

export class FlightCacheWorker {
  static async runSweep(workerNodeId: string): Promise<FlightCacheSweepReport> {
    const source = resolveFlightRefreshSource();
    if (!source) {
      return {
        skipped: 'NO_REFRESH_SOURCE_CONFIGURED',
        routesConsidered: 0,
        refreshes: 0,
        upserted: 0,
        failures: 0,
      };
    }

    const result = await refreshStaleRoutes();
    if (result.refreshes > 0 || result.failures > 0) {
      console.log(
        `[FlightCache:${workerNodeId}] source=${source.code} routes=${result.routesConsidered} refreshes=${result.refreshes} offers=${result.upserted} failures=${result.failures}`
      );
    }

    return { source: source.code, ...result };
  }
}
