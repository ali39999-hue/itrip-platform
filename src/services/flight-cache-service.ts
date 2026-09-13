/**
 * Flight Cache Service — live Parto CRS offers with stale-while-revalidate
 *
 * Implements the cache-first serving model from docs/PARTO_LIVE_INTEGRATION_PLAN.fa.md:
 * - `getCachedOffers`  — read live rows for a route+date that have not expired.
 * - `overlayLiveFlights` — replaces the static catalog result with live cached
 *   rows when they exist (badge freshness via returned meta), otherwise leaves
 *   the static result untouched. Never throws — search must not break.
 * - `refreshRouteOffers` — one AirLowFareSearch per route+date, upserts rows.
 * - `refreshStaleRoutes` — hourly worker sweep over FlightRouteDemand.
 * - `bumpRouteDemand`   — user searches register routes into the hourly sweep.
 *
 * Tehran wall-clock is stored in UTC-shifted form (parsed with a trailing Z),
 * so formatting with UTC getters is stable regardless of server timezone.
 */

import { prisma } from '@/lib/prisma';
import { randomInt } from 'crypto';
import type { Prisma } from '@prisma/client';
import { resolveCityQuery } from '@/lib/cities';
import type { Flight } from '@/lib/types';
import {
  getAirlineNameMap,
  getAirportCityByIata,
  type FlightSearchResponse,
} from '@/services/flights-service';
import {
  PartoCrsApiClient,
  PARTO_CRS_SUPPLIER_CODE,
} from '@/domains/supplier/adapters/PartoCrsApiClient';
import {
  PartoPortalProvider,
  PartoPortalSessionExpiredError,
  PARTO_PORTAL_SUPPLIER_CODE,
  portalOfferIdFromReference,
  type PortalOfferRow,
} from '@/domains/supplier/adapters/PartoPortalProvider';
import { SupplierNormalizer } from '@/domains/supplier/SupplierNormalizer';

const DEFAULT_TTL_MINUTES = 60;
const SYNC_REFRESH_BUDGET_MS = 9000;
const SWEEP_DEFAULT_MAX_ROUTES = 12;
const SWEEP_JITTER_MS = 600;

// Popular Iranian domestic routes used to seed FlightRouteDemand on first sweep.
const DEFAULT_POPULAR_ROUTES: Array<{ origin: string; destination: string; priority: number }> = [
  { origin: 'THR', destination: 'MHD', priority: 100 },
  { origin: 'MHD', destination: 'THR', priority: 100 },
  { origin: 'THR', destination: 'KIH', priority: 95 },
  { origin: 'KIH', destination: 'THR', priority: 95 },
  { origin: 'THR', destination: 'SYZ', priority: 80 },
  { origin: 'THR', destination: 'IFN', priority: 75 },
  { origin: 'THR', destination: 'TBZ', priority: 75 },
  { origin: 'IKA', destination: 'KIH', priority: 70 },
  { origin: 'SYZ', destination: 'THR', priority: 70 },
  { origin: 'IFN', destination: 'THR', priority: 60 },
  { origin: 'TBZ', destination: 'THR', priority: 60 },
];

export interface LiveFlightMeta {
  supplier: string;
  routeKey: string;
  departureDate: string;
  updatedAt: string; // ISO of freshest fetchedAt
  ageMinutes: number;
  stale: boolean;
  count: number;
}

export interface LiveOverlayOutcome {
  data: FlightSearchResponse;
  meta: LiveFlightMeta | null;
}

// Per-process refresh locks keyed by `${routeKey}:${date}` so concurrent user
// searches share one in-flight refresh instead of stampeding the supplier.
const refreshLocks = new Map<string, Promise<number>>();

function ttlMinutes(): number {
  const n = Number(process.env.FLIGHT_CACHE_TTL_MINUTES);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TTL_MINUTES;
}

export function isLiveOverlayEnabled(): boolean {
  const flag = (process.env.FLIGHT_LIVE_OVERLAY || 'auto').toLowerCase();
  if (flag === 'off') return false;
  if (flag === 'on') return true;
  return resolveFlightRefreshSource() !== null; // auto
}

/** Parse "2026-09-20T08:30:00" as Tehran wall-clock kept in UTC-shifted form. */
function parseWallClock(iso: string): Date {
  return new Date(`${iso.slice(0, 19)}Z`);
}

function formatHHmm(date: Date): string {
  const h = String(date.getUTCHours()).padStart(2, '0');
  const m = String(date.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatDuration(minutes: number | null | undefined): string {
  const mins = minutes && minutes > 0 ? minutes : 90;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function routeKeyFor(originCode: string, destinationCode: string): string {
  return `${originCode.toUpperCase()}-${destinationCode.toUpperCase()}`;
}

function dateToUtcMidnight(departureDate: string): Date {
  return new Date(`${departureDate}T00:00:00.000Z`);
}

/** Resolve free-text search input ("تهران", "tehran"…) into an IATA code. */
function resolveIata(input: string | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-z]{3}$/i.test(trimmed)) return trimmed.toUpperCase();
  return resolveCityQuery(trimmed)?.airportCode?.toUpperCase() ?? null;
}

export interface ResolvedRoute {
  routeKey: string;
  originCode: string;
  destinationCode: string;
}

export function resolveRoute(from: string | undefined, to: string | undefined): ResolvedRoute | null {
  const originCode = resolveIata(from);
  const destinationCode = resolveIata(to);
  if (!originCode || !destinationCode || originCode === destinationCode) return null;
  return { routeKey: routeKeyFor(originCode, destinationCode), originCode, destinationCode };
}

// ---------------------------------------------------------------------------
// Demand registry
// ---------------------------------------------------------------------------

export async function bumpRouteDemand(route: ResolvedRoute): Promise<void> {
  try {
    await prisma.flightRouteDemand.upsert({
      where: { routeKey: route.routeKey },
      create: {
        routeKey: route.routeKey,
        originCode: route.originCode,
        destinationCode: route.destinationCode,
        priority: 50,
      },
      update: {},
    });
  } catch {
    // Demand bumping is best-effort; cache serving must not depend on it.
  }
}

async function seedPopularRoutesIfEmpty(): Promise<void> {
  const existing = await prisma.flightRouteDemand.count();
  if (existing > 0) return;
  await prisma.flightRouteDemand.createMany({
    data: DEFAULT_POPULAR_ROUTES.map((r) => ({
      routeKey: routeKeyFor(r.origin, r.destination),
      originCode: r.origin,
      destinationCode: r.destination,
      priority: r.priority,
    })),
    skipDuplicates: true,
  });
}

// ---------------------------------------------------------------------------
// Reading the cache
// ---------------------------------------------------------------------------

export async function getCachedOffers(routeKey: string, departureDate: string) {
  const now = new Date();
  return prisma.flightOfferCache.findMany({
    where: {
      supplierCode: { in: [PARTO_CRS_SUPPLIER_CODE, PARTO_PORTAL_SUPPLIER_CODE] },
      routeKey,
      departureDate: dateToUtcMidnight(departureDate),
      expiresAt: { gt: now },
    },
    orderBy: { totalFare: 'asc' },
  });
}

function cacheRowToFlight(
  row: Awaited<ReturnType<typeof getCachedOffers>>[number],
  ctx: { originLabel: string; destinationLabel: string }
): Flight {
  return {
    id: row.offerId,
    airline: row.airlineName,
    airlineEn: row.airlineCode,
    flightNo: row.flightNumber,
    departureTime: formatHHmm(row.departureTime),
    arrivalTime: formatHHmm(row.arrivalTime),
    origin: `${ctx.originLabel} (${row.originCode})`,
    destination: `${ctx.destinationLabel} (${row.destinationCode})`,
    originCity: ctx.originLabel,
    destinationCity: ctx.destinationLabel,
    duration: formatDuration(row.durationMinutes),
    price: Number(row.totalFare), // IRR — same scale as the static catalog
    seatsLeft: row.seatsRemaining,
    baggage: row.baggage || '20kg',
    cabinClass: row.cabinClass === 'BUSINESS' ? 'business' : 'economy',
    stops: row.stops,
    ticketType: row.isCharter ? 'charter' : 'systemic',
    refundable: row.refundable,
  };
}

function buildLiveMeta(rows: Array<{ fetchedAt: Date }>, routeKey: string, departureDate: string): LiveFlightMeta | null {
  if (rows.length === 0) return null;
  const freshest = rows.reduce((a, b) => (a.fetchedAt > b.fetchedAt ? a : b)).fetchedAt;
  const ageMinutes = Math.max(0, Math.round((Date.now() - freshest.getTime()) / 60000));
  return {
    supplier: PARTO_CRS_SUPPLIER_CODE,
    routeKey,
    departureDate,
    updatedAt: freshest.toISOString(),
    ageMinutes,
    stale: ageMinutes >= ttlMinutes(),
    count: rows.length,
  };
}

// ---------------------------------------------------------------------------
// Refresh sources (official API v3 | authenticated portal scraping)
// ---------------------------------------------------------------------------

/** A fully normalized offer row ready for the FlightOfferCache upsert. */
export interface NormalizedCacheOfferRow {
  offerId: string;
  fareSourceCode: string;
  airlineCode: string;
  airlineName: string;
  flightNumber: string;
  cabinClass: string;
  stops: number;
  seatsRemaining: number;
  baseFare: number;
  totalFare: number;
  totalTax: number;
  currency: string;
  baggage: string | null;
  isCharter: boolean;
  refundable: boolean;
  ticketType: string;
  durationMinutes: number | null;
  departureTime: Date;
  arrivalTime: Date;
  terminals: { departure: string | null; arrival: string | null };
  raw: unknown;
}

export interface FlightRefreshSource {
  code: string;
  searchRoute(route: ResolvedRoute, departureDate: string, opts?: { compact?: boolean }): Promise<NormalizedCacheOfferRow[]>;
}

/** Official Parto CRS API v3 (preferred — structured JSON). */
class PartoCrsApiSource implements FlightRefreshSource {
  readonly code = PARTO_CRS_SUPPLIER_CODE;

  async searchRoute(route: ResolvedRoute, departureDate: string): Promise<NormalizedCacheOfferRow[]> {
    const client = new PartoCrsApiClient();
    const result = await client.searchLowFare({
      origin: route.originCode,
      destination: route.destinationCode,
      departureDate,
      adults: 1, // per-adult price — consistent with the static catalog scale
      children: 0,
      infants: 0,
      requestOption: 3,
    });

    return result.itineraries
      .map((itinerary): NormalizedCacheOfferRow | null => {
        const n = SupplierNormalizer.normalizePricedItinerary(itinerary);
        if (!n) return null;
        const cabinCode =
          itinerary.OriginDestinationOptions?.[0]?.FlightSegments?.[0]?.CabinClassCode;
        return {
          offerId: n.offer.offerId,
          fareSourceCode: n.fareSourceCode,
          airlineCode: n.offer.airlineCode,
          airlineName: n.offer.airlineCode,
          flightNumber: n.offer.flightNumber,
          cabinClass: cabinCode === 3 ? 'BUSINESS' : 'ECONOMY',
          stops: n.offer.stops,
          seatsRemaining: n.offer.seatsRemaining,
          baseFare: n.baseFare,
          totalFare: n.totalFare,
          totalTax: n.totalTax,
          currency: n.currency,
          baggage: n.offer.baggageAllowance,
          isCharter: n.isCharter,
          refundable: n.offer.refundable,
          ticketType: n.isCharter ? 'charter' : 'systemic',
          durationMinutes: n.offer.durationMinutes,
          departureTime: parseWallClock(n.offer.departureTime.replace('Z', '')),
          arrivalTime: parseWallClock(n.offer.arrivalTime.replace('Z', '')),
          terminals: n.terminals,
          raw: n.canonical,
        };
      })
      .filter((row): row is NormalizedCacheOfferRow => row !== null);
  }
}

/** Authenticated portal scraping (fallback while the API is not granted). */
class PartoPortalSource implements FlightRefreshSource {
  readonly code = PARTO_PORTAL_SUPPLIER_CODE;

  async searchRoute(route: ResolvedRoute, departureDate: string): Promise<NormalizedCacheOfferRow[]> {
    const provider = new PartoPortalProvider();
    const outcome = await provider.searchOneWay({
      origin: route.originCode,
      destination: route.destinationCode,
      departureDate,
    });
    return portalRowsToCacheRows(outcome.offers, route, departureDate, outcome.rawHtml);
  }
}

export function portalRowsToCacheRows(
  rows: PortalOfferRow[],
  route: ResolvedRoute,
  departureDate: string,
  rawHtml: string
): NormalizedCacheOfferRow[] {
  return rows.map((row) => ({
    offerId: portalOfferIdFromReference(row.fareReference),
    fareSourceCode: row.fareReference,
    airlineCode: row.airlineCode,
    airlineName: row.airlineName,
    flightNumber: row.flightNumber,
    cabinClass: row.cabinClass,
    stops: row.stops,
    seatsRemaining: row.seatsRemaining,
    baseFare: row.baseFare,
    totalFare: row.totalFare,
    totalTax: row.totalTax,
    currency: row.currency,
    baggage: row.baggage,
    isCharter: row.isCharter,
    refundable: row.refundable,
    ticketType: row.isCharter ? 'charter' : 'systemic',
    durationMinutes: row.durationMinutes,
    departureTime: withDepartureDate(row.departureTime, departureDate),
    arrivalTime: withDepartureDate(row.arrivalTime, departureDate),
    terminals: { departure: null, arrival: null },
    raw: { route: route.routeKey, departureDate, note: 'portal-scrape', rawHtmlLength: rawHtml.length },
  }));
}

/** Portal markup carries only wall-clock times — anchor them to the search date. */
function withDepartureDate(time: Date, departureDate: string): Date {
  return new Date(`${departureDate}T${time.toISOString().slice(11, 19)}Z`);
}

export type FlightRefreshSourceKind = 'api' | 'portal';

/**
 * Which live source refreshes the cache. `FLIGHT_REFRESH_SOURCE` forces one;
 * auto prefers the official API when its credentials exist, then falls back
 * to portal scraping when a session cookie/state file is available.
 */
export function resolveFlightRefreshSource(): FlightRefreshSource | null {
  const flag = (process.env.FLIGHT_REFRESH_SOURCE || 'auto').toLowerCase();
  const apiReady = PartoCrsApiClient.isConfigured();
  const portalReady = PartoPortalProvider.isConfigured();

  if (flag === 'api') return apiReady ? new PartoCrsApiSource() : null;
  if (flag === 'portal') return portalReady ? new PartoPortalSource() : null;
  if (apiReady) return new PartoCrsApiSource();
  if (portalReady) return new PartoPortalSource();
  return null;
}

// ---------------------------------------------------------------------------
// Refreshing (worker + synchronous on-demand)
// ---------------------------------------------------------------------------

async function upsertOfferRows(
  route: ResolvedRoute,
  departureDate: string,
  rows: NormalizedCacheOfferRow[]
): Promise<number> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes() * 60_000);
  const departureDateUtc = dateToUtcMidnight(departureDate);

  let upserted = 0;
  for (const row of rows) {
    try {
      await prisma.flightOfferCache.upsert({
        where: { offerId: row.offerId },
        create: {
          supplierCode: row.offerId.startsWith(`off_${PARTO_CRS_SUPPLIER_CODE}`) ? PARTO_CRS_SUPPLIER_CODE : PARTO_PORTAL_SUPPLIER_CODE,
          offerId: row.offerId,
          fareSourceCode: row.fareSourceCode,
          routeKey: route.routeKey,
          originCode: route.originCode,
          destinationCode: route.destinationCode,
          departureDate: departureDateUtc,
          departureTime: row.departureTime,
          arrivalTime: row.arrivalTime,
          airlineCode: row.airlineCode,
          airlineName: row.airlineName,
          flightNumber: row.flightNumber,
          cabinClass: row.cabinClass,
          stops: row.stops,
          seatsRemaining: row.seatsRemaining,
          baseFare: row.baseFare,
          totalFare: row.totalFare,
          totalTax: row.totalTax,
          currency: row.currency,
          baggage: row.baggage,
          isCharter: row.isCharter,
          refundable: row.refundable,
          ticketType: row.ticketType,
          durationMinutes: row.durationMinutes,
          terminals: row.terminals as unknown as Prisma.InputJsonValue,
          rawJson: row.raw as unknown as Prisma.InputJsonValue,
          fetchedAt: now,
          expiresAt,
        },
        update: {
          departureTime: row.departureTime,
          arrivalTime: row.arrivalTime,
          seatsRemaining: row.seatsRemaining,
          baseFare: row.baseFare,
          totalFare: row.totalFare,
          totalTax: row.totalTax,
          currency: row.currency,
          baggage: row.baggage,
          isCharter: row.isCharter,
          refundable: row.refundable,
          ticketType: row.ticketType,
          durationMinutes: row.durationMinutes,
          terminals: row.terminals as unknown as Prisma.InputJsonValue,
          rawJson: row.raw as unknown as Prisma.InputJsonValue,
          fetchedAt: now,
          expiresAt,
        },
      });
      upserted++;
    } catch {
      // A single bad itinerary must not abort the whole refresh.
    }
  }
  return upserted;
}

export interface RefreshOutcome {
  routeKey: string;
  departureDate: string;
  upserted: number;
  source?: string;
  error?: string;
}

/**
 * One live refresh for a single route+date via the configured refresh source.
 * Concurrent callers share the same in-flight job (per-process lock).
 */
export async function refreshRouteOffers(
  route: ResolvedRoute,
  departureDate: string,
  opts?: { compact?: boolean }
): Promise<RefreshOutcome> {
  const lockKey = `${route.routeKey}:${departureDate}`;
  const inFlight = refreshLocks.get(lockKey);
  if (inFlight) {
    const upserted = await inFlight.catch(() => 0);
    return { routeKey: route.routeKey, departureDate, upserted };
  }

  const job = (async () => {
    const source = resolveFlightRefreshSource();
    if (!source) {
      throw new Error('NO_REFRESH_SOURCE_CONFIGURED: set PARTO_CRS_* or capture a portal session');
    }

    const rows = await source.searchRoute(route, departureDate, opts);
    const upserted = await upsertOfferRows(route, departureDate, rows);
    await markDemandRefreshed(route, source.code).catch(() => {});
    return upserted;
  })();

  refreshLocks.set(lockKey, job);
  try {
    const upserted = await job;
    return { routeKey: route.routeKey, departureDate, upserted };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markDemandError(route, message).catch(() => {});
    if (err instanceof PartoPortalSessionExpiredError) {
      console.error('[FlightCache] Parto portal session expired — re-run scripts/parto-portal-capture.mjs login');
    }
    return {
      routeKey: route.routeKey,
      departureDate,
      upserted: 0,
      error: message,
    };
  } finally {
    refreshLocks.delete(lockKey);
  }
}

async function markDemandRefreshed(route: ResolvedRoute, sourceCode: string): Promise<void> {
  await prisma.flightRouteDemand.updateMany({
    where: { routeKey: route.routeKey },
    data: {
      lastRefreshedAt: new Date(),
      lastError: null,
      lastErrorAt: null,
      refreshCount: { increment: 1 },
    },
  });
  void sourceCode;
}

async function markDemandError(route: ResolvedRoute, message: string): Promise<void> {
  await prisma.flightRouteDemand.updateMany({
    where: { routeKey: route.routeKey },
    data: { lastError: message.slice(0, 500), lastErrorAt: new Date() },
  });
}

function toIsoDate(base: Date, offsetDays: number): string {
  const d = new Date(base.getTime() + offsetDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/**
 * Hourly sweep: ensure popular/user-demanded routes are warm for the next
 * `lookAheadDays` days. Skips route+dates already inside the TTL window and
 * stops early when the supplier circuit breaker opens.
 */
export async function refreshStaleRoutes(opts?: { maxRoutes?: number; lookAheadDays?: number }): Promise<{
  routesConsidered: number;
  refreshes: number;
  upserted: number;
  failures: number;
  skipped?: string;
}> {
  if (!resolveFlightRefreshSource()) {
    return { routesConsidered: 0, refreshes: 0, upserted: 0, failures: 0, skipped: 'NO_REFRESH_SOURCE_CONFIGURED' };
  }

  try {
    await seedPopularRoutesIfEmpty();
  } catch {
    // Seeding is best-effort.
  }

  const maxRoutes = opts?.maxRoutes ?? Number(process.env.FLIGHT_REFRESH_ROUTES_PER_HOUR) ?? SWEEP_DEFAULT_MAX_ROUTES;
  const lookAheadDays = opts?.lookAheadDays ?? 3;

  let demand;
  try {
    demand = await prisma.flightRouteDemand.findMany({
      where: { enabled: true },
      orderBy: [{ priority: 'desc' }, { lastRefreshedAt: 'asc' }],
      take: Math.max(1, maxRoutes),
    });
  } catch (err) {
    return {
      routesConsidered: 0,
      refreshes: 0,
      upserted: 0,
      failures: 0,
      skipped: err instanceof Error ? err.message : 'DEMAND_QUERY_FAILED',
    };
  }

  const now = new Date();
  let refreshes = 0;
  let upserted = 0;
  let failures = 0;

  for (const demandRow of demand) {
    const route: ResolvedRoute = {
      routeKey: demandRow.routeKey,
      originCode: demandRow.originCode,
      destinationCode: demandRow.destinationCode,
    };

    for (let dayOffset = 0; dayOffset < Math.max(1, Math.min(demandRow.lookAheadDays, lookAheadDays)); dayOffset++) {
      const departureDate = toIsoDate(now, dayOffset);

      try {
        const freshest = await prisma.flightOfferCache.findFirst({
          where: {
            supplierCode: { in: [PARTO_CRS_SUPPLIER_CODE, PARTO_PORTAL_SUPPLIER_CODE] },
            routeKey: demandRow.routeKey,
            departureDate: dateToUtcMidnight(departureDate),
            fetchedAt: { gt: new Date(now.getTime() - ttlMinutes() * 60_000) },
          },
          select: { id: true },
        });
        if (freshest) continue; // already warm inside the TTL window
      } catch {
        // If the freshness check fails, still attempt a refresh.
      }

      const outcome = await refreshRouteOffers(route, departureDate, { compact: true });
      refreshes++;
      if (outcome.error) {
        failures++;
        // Auth/dead-session/circuit-breaker failures poison the whole sweep —
        // stop hammering the supplier until the operator re-captures a session.
        const errLower = outcome.error.toLowerCase();
        const fatal =
          errLower.includes('circuit_breaker_open') ||
          errLower.includes('err01') ||
          errLower.includes('session_expired');
        if (fatal) {
          console.error(
            `[FlightCache] sweep aborted early: supplier session/auth unavailable (${outcome.error.slice(0, 120)})`
          );
          return { routesConsidered: demand.length, refreshes, upserted, failures, skipped: 'SUPPLIER_SESSION_UNAVAILABLE' };
        }
      } else {
        upserted += outcome.upserted;
      }

      // Politeness jitter between supplier calls.
      await new Promise((r) => setTimeout(r, randomInt(0, SWEEP_JITTER_MS)));
    }
  }

  return { routesConsidered: demand.length, refreshes, upserted, failures };
}

// ---------------------------------------------------------------------------
// Serving overlay
// ---------------------------------------------------------------------------

/**
 * Overlay cached live Parto rows onto a static search result. When live rows
 * exist for the requested route+date, the response is rebuilt from them
 * (facets included); otherwise the static result passes through unchanged.
 * On any internal failure the static result is returned — never throws.
 */
export async function overlayLiveFlights(
  base: FlightSearchResponse,
  params: { from?: string; to?: string; departDate?: string; airlines?: string[]; stops?: number[]; minPrice?: number; maxPrice?: number; ticketType?: 'charter' | 'systemic' | 'all'; cabinClass?: 'economy' | 'business' | 'all'; timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night' | 'all'; sort?: 'price' | 'fast' | 'time' | 'suggested'; page?: number; limit?: number },
  searchFlightsFromFlights: (pool: Flight[], p: typeof params) => FlightSearchResponse
): Promise<LiveOverlayOutcome> {
  const baseOutcome: LiveOverlayOutcome = { data: base, meta: null };
  try {
    if (!isLiveOverlayEnabled()) return baseOutcome;
    if (!params.from || !params.to || !params.departDate) return baseOutcome;

    const route = resolveRoute(params.from, params.to);
    if (!route) return baseOutcome;

    await bumpRouteDemand(route);

    let rows = await getCachedOffers(route.routeKey, params.departDate);

    // Stale-while-revalidate: nothing fresh and a source is configured → one
    // bounded synchronous refresh so the very first search after boot works.
    if (rows.length === 0 && resolveFlightRefreshSource() !== null) {
      const refresh = refreshRouteOffers(route, params.departDate);
      const winner = await Promise.race([
        refresh.then((r) => ({ ok: true as const, r })),
        new Promise<{ ok: false }>((resolve) => setTimeout(() => resolve({ ok: false }), SYNC_REFRESH_BUDGET_MS)),
      ]);
      if (winner.ok) rows = await getCachedOffers(route.routeKey, params.departDate);
    }

    if (rows.length === 0) return baseOutcome;

    const airlineNames = getAirlineNameMap();
    const originCity = getAirportCityByIata(route.originCode) || route.originCode;
    const destinationCity = getAirportCityByIata(route.destinationCode) || route.destinationCode;

    const liveFlights = rows
      .map((row) =>
        cacheRowToFlight(row, {
          originLabel: originCity,
          destinationLabel: destinationCity,
        })
      )
      .map((flight) => ({
        ...flight,
        airline: airlineNames.get(flight.airlineEn)?.fa || flight.airline,
        airlineEn: airlineNames.get(flight.airlineEn)?.en || flight.airlineEn,
      }));

    const data = searchFlightsFromFlights(liveFlights, params);
    const meta = buildLiveMeta(rows, route.routeKey, params.departDate);
    return { data, meta };
  } catch {
    return baseOutcome;
  }
}

// ---------------------------------------------------------------------------
// Ops visibility
// ---------------------------------------------------------------------------

export async function getCacheStats(): Promise<{
  totalRows: number;
  freshRows: number;
  routes: Array<{ routeKey: string; rows: number; freshest: Date | null }>;
  demand: { enabled: number; total: number; withErrors: number };
} | null> {
  try {
    const [totalRows, freshRows, grouped, demandEnabled, demandTotal, demandErrors] = await Promise.all([
      prisma.flightOfferCache.count(),
      prisma.flightOfferCache.count({ where: { expiresAt: { gt: new Date() } } }),
      prisma.flightOfferCache.groupBy({
        by: ['routeKey'],
        _count: { _all: true },
        _max: { fetchedAt: true },
      }),
      prisma.flightRouteDemand.count({ where: { enabled: true } }),
      prisma.flightRouteDemand.count(),
      prisma.flightRouteDemand.count({ where: { lastError: { not: null } } }),
    ]);

    return {
      totalRows,
      freshRows,
      routes: grouped.map((g) => ({ routeKey: g.routeKey, rows: g._count._all, freshest: g._max.fetchedAt ?? null })),
      demand: { enabled: demandEnabled, total: demandTotal, withErrors: demandErrors },
    };
  } catch {
    return null;
  }
}
