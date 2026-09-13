/**
 * Parto CRS Flight Supplier Adapter (SUP-101)
 *
 * Bridges the official Parto CRS API v3 client (PartoCrsApiClient) into the
 * FlightSupplierPort. Contract details: docs/PARTO_LIVE_INTEGRATION_PLAN.fa.md
 *
 * Semantics:
 * - Credentials: PARTO_CRS_OFFICE_ID / PARTO_CRS_USERNAME / PARTO_CRS_PASSWORD.
 * - Fail-closed in production when credentials are missing.
 * - Non-production without credentials keeps a deterministic simulated offer so
 *   dev servers, e2e suites and unit tests run without a Parto account.
 * - Errors (PartoApiError, transport, circuit breaker) propagate — the
 *   SupplierTransport owns retry/circuit-breaker policy and the cache layer
 *   treats failures as "serve stale".
 * - book() is intentionally not wired to AirBook yet (Phase 2: traveler data
 *   mapping + CreditBalance funding checks) — see integration plan §3.
 */

import {
  type FlightSupplierPort,
  type FlightSearchQuery,
  type FlightOfferResult,
  type FlightBookingCommand,
  type FlightBookingResult,
} from '../flight-supplier-port';
import { randomBytes } from 'crypto';
import { PartoCrsApiClient } from './PartoCrsApiClient';
import { SupplierNormalizer } from '../SupplierNormalizer';

export class PartoFlightSupplierAdapter implements FlightSupplierPort {
  readonly supplierCode: string = 'PARTO_CRS';
  private client: PartoCrsApiClient | null;

  constructor(options?: { client?: PartoCrsApiClient }) {
    this.client = options?.client ?? null;
  }

  private static isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /** Lazily build the API client; returns null when no credentials are present. */
  private getClient(): PartoCrsApiClient | null {
    if (this.client) return this.client;
    if (!PartoCrsApiClient.isConfigured()) return null;
    try {
      this.client = new PartoCrsApiClient();
      return this.client;
    } catch {
      return null;
    }
  }

  private simulatedOffer(query: FlightSearchQuery): FlightOfferResult[] {
    const normalized = SupplierNormalizer.normalizePartoFlight(
      {
        AirTripId: `parto_sim_${Date.now()}`,
        AirlineCode: 'W5',
        AirlineName: 'Mahan Air',
        FlightNumber: 'W5-112',
        Origin: query.origin,
        Destination: query.destination,
        DepartureDate: query.departureDate,
        DepartureTime: '08:30',
        ArrivalTime: '11:45',
        DurationMinutes: 195,
        Stops: 0,
        AvailableSeats: 5,
        TotalPrice: 14_500_000,
        Currency: 'IRR',
        Baggage: '30kg',
        IsRefundable: true,
      },
      this.supplierCode
    );
    return [normalized.offer];
  }

  async search(query: FlightSearchQuery): Promise<FlightOfferResult[]> {
    const client = this.getClient();

    if (!client) {
      if (PartoFlightSupplierAdapter.isProduction()) {
        throw new Error('FAIL_CLOSED: Parto CRS credentials missing in production environment');
      }
      return this.simulatedOffer(query);
    }

    const result = await client.searchLowFare({
      origin: query.origin,
      destination: query.destination,
      departureDate: query.departureDate,
      adults: query.passengers.adults,
      children: query.passengers.children ?? 0,
      infants: query.passengers.infants ?? 0,
      oneWay: !query.returnDate,
      cabinType:
        query.cabin === 'BUSINESS' ? 3 : query.cabin === 'FIRST' ? 5 : 100,
    });

    return result.itineraries
      .map((itinerary) => SupplierNormalizer.normalizePricedItinerary(itinerary)?.offer ?? null)
      .filter((offer): offer is FlightOfferResult => offer !== null);
  }

  async price(offerId: string): Promise<{ valid: boolean; currentPrice: number; currency: string }> {
    const client = this.getClient();

    if (!client) {
      if (PartoFlightSupplierAdapter.isProduction()) {
        throw new Error('FAIL_CLOSED: Parto CRS credentials missing in production environment');
      }
      return { valid: true, currentPrice: 14_500_000, currency: 'IRR' };
    }

    const fareSourceCode = PartoCrsApiClient.fareSourceCodeFromOfferId(offerId);
    if (!fareSourceCode) {
      return { valid: false, currentPrice: 0, currency: 'IRR' };
    }

    const itinerary = await client.revalidate(fareSourceCode);
    const normalized = itinerary ? SupplierNormalizer.normalizePricedItinerary(itinerary) : null;

    if (!normalized) {
      return { valid: false, currentPrice: 0, currency: 'IRR' };
    }

    return {
      valid: true,
      currentPrice: normalized.totalFare,
      currency: normalized.currency,
    };
  }

  async book(cmd: FlightBookingCommand): Promise<FlightBookingResult> {
    const client = this.getClient();

    if (!client) {
      if (PartoFlightSupplierAdapter.isProduction()) {
        throw new Error('FAIL_CLOSED: Parto CRS credentials missing in production environment');
      }
      const pnr = SupplierNormalizer.normalizePnr(randomBytes(4).toString('hex').toUpperCase());
      return {
        success: true,
        externalBookingId: `ext_parto_${Date.now()}`,
        pnr,
        ticketNumbers: cmd.passengers.map((_, i) => `065-9988223${i}`),
        status: 'CONFIRMED',
      };
    }

    // Real AirBook mapping (TravelerInfo, ClientUniqueId, markup policy) lands in
    // Phase 2 — intentionally fail-closed rather than issuing wrong bookings.
    throw new Error('PARTO_BOOKING_NOT_WIRED: AirBook flow is Phase 2 — docs/PARTO_LIVE_INTEGRATION_PLAN.fa.md §3');
  }
}
