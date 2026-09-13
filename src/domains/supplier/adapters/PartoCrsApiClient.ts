/**
 * Official Parto CRS API v3 Client
 *
 * Implements the documented Parto CRS REST contract (OpenAPI 3.0 spec,
 * api_hunt/parto_swagger.json — API Version 3, Document Version 2025-04-21):
 * - Every call is POST JSON against https://api.partocrs.ir (or configured host).
 * - Authentication via CreateSession {OfficeId, UserName, Password(sha512 hex)};
 *   the returned SessionId travels in the BODY of every subsequent request
 *   (never a header) and renews itself on each call (15 min server TTL).
 * - Responses follow the envelope {Success, Error:{Id, Message}, ...}.
 * - HTTP transport goes through SupplierTransport (timeout, retry, circuit
 *   breaker, health metrics) so Parto behaves like any other supplier.
 *
 * Parto enum values are numeric per the official spec:
 *   PricingSourceType  0=All 1=Private 2=Publish 3=WebFare
 *   RequestOption      0=Fifty 1=Hundred 2=TwoHundred 3=All
 *   CabinType          1=Y 2=S 3=C 4=J 5=F 6=P 100=Default
 *   AirTripType        1=OneWay 2=Return
 *   SearchLocationType 1=City 2=Airport
 */

import { createHash } from 'crypto';
import { SupplierTransport } from '../SupplierTransport';

export const PARTO_CRS_SUPPLIER_CODE = 'PARTO_CRS';

export interface PartoCrsCredentials {
  officeId: string;
  userName: string;
  password: string; // raw — hashed to SHA-512 hex at call time
  endpointUrl?: string;
}

export interface PartoError {
  Id?: string | null;
  Message?: string | null;
}

interface PartoEnvelope {
  Success?: boolean;
  Error?: PartoError | null;
  SessionId?: string | null;
}

export class PartoApiError extends Error {
  readonly errorId: string;
  readonly endpoint: string;

  constructor(errorId: string, message: string, endpoint: string) {
    super(`PARTO_API_ERROR [${errorId || 'UNKNOWN'}]: ${message} (${endpoint})`);
    this.name = 'PartoApiError';
    this.errorId = errorId || 'UNKNOWN';
    this.endpoint = endpoint;
  }
}

// ---- Search request/response shapes (subset actually consumed downstream) ----

export interface PartoOriginDestinationInformation {
  DepartureDateTime: string; // "YYYY-MM-DDT00:00:00"
  OriginLocationCode: string; // IATA
  OriginType: number; // SearchLocationType
  DestinationLocationCode: string;
  DestinationType: number;
}

export interface PartoTravelPreference {
  AirTripType: number;
  CabinType: number;
  MaxStopsQuantity: number;
  VendorExcludeCodes?: string[];
  VendorPreferenceCodes?: string[];
}

export interface PartoLowFareSearchParams {
  origin: string;
  destination: string;
  departureDate: string; // YYYY-MM-DD
  adults: number;
  children?: number;
  infants?: number;
  oneWay?: boolean;
  cabinType?: number;
  directOnly?: boolean;
  requestOption?: number; // RequestOption — 0=Fifty for hourly refreshes, 3=All for user searches
}

export interface PartoFlightSegment {
  DepartureDateTime: string;
  ArrivalDateTime: string;
  StopQuantity?: number;
  FlightNumber?: string | null;
  ResBookDesigCode?: string | null;
  JourneyDurationPerMinute?: number;
  DepartureAirportLocationCode?: string | null;
  ArrivalAirportLocationCode?: string | null;
  MarketingAirlineCode?: string | null;
  SeatsRemaining?: number | null;
  IsCharter?: boolean;
  IsReturn?: boolean;
  Baggage?: string | null;
  DepartureTerminal?: string | null;
  ArrivalTerminal?: string | null;
  CabinClassCode?: number;
}

export interface PartoPricedItinerary {
  FareSourceCode?: string | null;
  ValidatingAirlineCode?: string | null;
  DirectionInd?: number;
  NonRefundableType?: number; // 0=None 1=NONRefundable 2=AfterDep 3=BeforeDep
  RefundMethod?: number; // 0=Offline 1=Online 2=NonRefundable
  Labels?: string[] | null;
  LabelsFa?: string[] | null;
  IsClosed?: boolean;
  AirItineraryPricingInfo?: {
    ItinTotalFare?: {
      BaseFare?: number;
      TotalFare?: number;
      TotalTax?: number;
      ServiceTax?: number;
      TotalCommission?: number;
      Currency?: string | null;
    } | null;
    PtcFareBreakdown?: Array<Record<string, unknown>> | null;
  } | null;
  OriginDestinationOptions?: Array<{
    JourneyDurationPerMinute?: number;
    FlightSegments?: PartoFlightSegment[] | null;
  }> | null;
}

export interface PartoLowFareSearchResult {
  searchId?: number;
  itineraries: PartoPricedItinerary[];
}

const DEFAULT_ENDPOINT = 'https://api.partocrs.ir';
const SESSION_TTL_MS = 15 * 60 * 1000;
const SESSION_RENEW_SAFETY_MS = 90 * 1000; // renew 90s before server-side expiry

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '0.0.0.0' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (
    h.startsWith('127.') ||
    h.startsWith('10.') ||
    h.startsWith('169.254.') ||
    h.startsWith('192.168.')
  ) {
    return true;
  }
  if (h.startsWith('172.')) {
    const secondOctet = Number(h.split('.')[1]);
    if (Number.isFinite(secondOctet) && secondOctet >= 16 && secondOctet <= 31) return true;
  }
  return false;
}

export class PartoCrsApiClient {
  private readonly officeId: string;
  private readonly userName: string;
  private readonly passwordHash: string;
  private readonly endpointUrl: string;

  private session: { id: string; createdAt: number } | null = null;
  private sessionPromise: Promise<string> | null = null;

  constructor(credentials?: PartoCrsCredentials) {
    const creds = credentials ?? PartoCrsApiClient.credentialsFromEnv();
    if (!creds || !creds.officeId || !creds.userName || !creds.password) {
      throw new Error('FAIL_CLOSED: Parto CRS credentials missing (PARTO_CRS_OFFICE_ID / PARTO_CRS_USERNAME / PARTO_CRS_PASSWORD)');
    }

    this.endpointUrl = (creds.endpointUrl || process.env.PARTO_CRS_ENDPOINT_URL || DEFAULT_ENDPOINT).replace(/\/+$/, '');
    const parsed = new URL(this.endpointUrl);
    if (parsed.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      throw new Error('FAIL_CLOSED: Parto CRS endpoint must be https in production');
    }
    if (isPrivateHost(parsed.hostname)) {
      throw new Error(`FAIL_CLOSED: Parto CRS endpoint host is not allowed: ${parsed.hostname}`);
    }

    this.officeId = creds.officeId;
    this.userName = creds.userName;
    this.passwordHash = createHash('sha512').update(creds.password).digest('hex');
  }

  static credentialsFromEnv(): PartoCrsCredentials | null {
    const officeId = process.env.PARTO_CRS_OFFICE_ID;
    const userName = process.env.PARTO_CRS_USERNAME;
    const password = process.env.PARTO_CRS_PASSWORD;
    if (!officeId || !userName || !password) return null;
    return { officeId, userName, password };
  }

  static isConfigured(): boolean {
    return PartoCrsApiClient.credentialsFromEnv() !== null;
  }

  // ---------- Session management ----------

  /**
   * Returns a valid SessionId, creating one when missing/expired. Concurrent
   * callers share the same in-flight CreateSession request (single-flight).
   */
  async getSessionId(): Promise<string> {
    if (this.session && Date.now() - this.session.createdAt < SESSION_TTL_MS - SESSION_RENEW_SAFETY_MS) {
      return this.session.id;
    }
    if (this.sessionPromise) return this.sessionPromise;

    this.sessionPromise = this.createSession()
      .then((id) => {
        this.session = { id, createdAt: Date.now() };
        this.sessionPromise = null;
        return id;
      })
      .catch((err) => {
        this.sessionPromise = null;
        this.session = null;
        throw err;
      });

    return this.sessionPromise;
  }

  /** Invalidate the cached session (after an auth-shaped API error). */
  invalidateSession(): void {
    this.session = null;
  }

  async endSession(): Promise<void> {
    if (!this.session) return;
    const sessionId = this.session.id;
    this.session = null;
    await SupplierTransport.request<PartoEnvelope>({
      supplierCode: PARTO_CRS_SUPPLIER_CODE,
      endpoint: `${this.endpointUrl}/api/Authenticate/EndSession`,
      body: { SessionId: sessionId },
      timeoutMs: 5000,
      maxRetries: 0,
    }).catch(() => {});
  }

  private async createSession(): Promise<string> {
    const endpoint = `${this.endpointUrl}/api/Authenticate/CreateSession`;
    const res = await SupplierTransport.request<PartoEnvelope>({
      supplierCode: PARTO_CRS_SUPPLIER_CODE,
      endpoint,
      body: { OfficeId: this.officeId, UserName: this.userName, Password: this.passwordHash },
      timeoutMs: 10000,
    });

    const payload = res.data;
    if (!res.ok || !payload?.Success || !payload.SessionId) {
      throw new PartoApiError(payload?.Error?.Id || `HTTP_${res.statusCode}`, payload?.Error?.Message || 'CreateSession failed', endpoint);
    }
    return payload.SessionId;
  }

  // ---------- Core API calls ----------

  private async call<T extends object>(path: string, body: Record<string, unknown>, timeoutMs = 15000): Promise<T> {
    const sessionId = await this.getSessionId();
    const endpoint = `${this.endpointUrl}${path}`;
    const res = await SupplierTransport.request<T>({
      supplierCode: PARTO_CRS_SUPPLIER_CODE,
      endpoint,
      body: { ...body, SessionId: sessionId },
      timeoutMs,
    });

    const payload = res.data as T & PartoEnvelope;
    if (!res.ok) {
      // Auth-shaped failures invalidate the cached session so the next call
      // creates a fresh one instead of hammering with a dead token.
      this.invalidateSession();
      throw new PartoApiError(payload?.Error?.Id || `HTTP_${res.statusCode}`, payload?.Error?.Message || `HTTP ${res.statusCode}`, endpoint);
    }
    if (payload && payload.Success === false) {
      throw new PartoApiError(payload.Error?.Id || 'UNKNOWN', payload.Error?.Message || 'Parto request failed', endpoint);
    }
    return payload;
  }

  async searchLowFare(params: PartoLowFareSearchParams): Promise<PartoLowFareSearchResult> {
    const originDestinationInformations: PartoOriginDestinationInformation[] = [
      {
        DepartureDateTime: `${params.departureDate}T00:00:00`,
        OriginLocationCode: params.origin.toUpperCase(),
        OriginType: 2, // Airport
        DestinationLocationCode: params.destination.toUpperCase(),
        DestinationType: 2,
      },
    ];

    const payload = await this.call<{
      SearchId?: number;
      PricedItineraries?: PartoPricedItinerary[] | null;
    }>(
      '/api/Air/AirLowFareSearch',
      {
        PricingSourceType: 0, // All — charter + publish + webfare
        RequestOption: params.requestOption ?? 3, // All results for user-facing searches
        AdultCount: Math.max(1, params.adults),
        ChildCount: params.children ?? 0,
        InfantCount: params.infants ?? 0,
        OriginDestinationInformations: originDestinationInformations,
        TravelPreference: {
          AirTripType: params.oneWay === false ? 2 : 1,
          CabinType: params.cabinType ?? 100, // Default
          MaxStopsQuantity: params.directOnly ? 2 : 0,
        },
      },
      20000
    );

    return {
      searchId: payload.SearchId,
      itineraries: payload.PricedItineraries ?? [],
    };
  }

  async revalidate(fareSourceCode: string): Promise<PartoPricedItinerary | null> {
    const payload = await this.call<{ PricedItinerary?: PartoPricedItinerary | null }>(
      '/api/Air/AirRevalidate',
      { FareSourceCode: fareSourceCode },
      15000
    );
    return payload.PricedItinerary ?? null;
  }

  async fareRules(fareSourceCode?: string, uniqueId?: string): Promise<Array<Record<string, unknown>>> {
    const payload = await this.call<{ FareRules?: Array<Record<string, unknown>> | null }>(
      '/api/Air/AirRules',
      fareSourceCode ? { FareSourceCode: fareSourceCode } : { UniqueId: uniqueId },
      15000
    );
    return payload.FareRules ?? [];
  }

  async baggage(fareSourceCode: string): Promise<Record<string, unknown> | null> {
    const payload = await this.call<{ BaggageInfo?: Record<string, unknown> | null }>(
      '/api/Air/AirBaggages',
      { FareSourceCode: fareSourceCode },
      15000
    );
    return payload.BaggageInfo ?? null;
  }

  async creditBalance(): Promise<number | null> {
    const payload = await this.call<Record<string, unknown>>('/api/Common/CreditBalance', {}, 8000);
    const raw = payload['CreditBalance'] ?? payload['Balance'] ?? payload['Credit'];
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  // ---------- Stable offer id helpers ----------

  /**
   * Reversible offer id so cache rows can always resolve back to the
   * FareSourceCode needed by AirRevalidate / AirBook.
   */
  static offerIdFromFareSourceCode(fareSourceCode: string): string {
    return `off_${PARTO_CRS_SUPPLIER_CODE}_${Buffer.from(fareSourceCode, 'utf8').toString('base64url')}`;
  }

  static fareSourceCodeFromOfferId(offerId: string): string | null {
    const prefix = `off_${PARTO_CRS_SUPPLIER_CODE}_`;
    if (!offerId.startsWith(prefix)) return null;
    const encoded = offerId.slice(prefix.length);
    try {
      const decoded = Buffer.from(encoded, 'base64url').toString('utf8');
      // base64url decoding is lenient — verify the round-trip before trusting it.
      if (Buffer.from(decoded, 'utf8').toString('base64url') !== encoded) return null;
      return decoded;
    } catch {
      return null;
    }
  }
}
