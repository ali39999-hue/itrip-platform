/**
 * Nadia CRS (نادیا) B2C API Client — hotel inventory aggregator.
 *
 * Live-verified against api.nadiacrs.com on 2026-09-13 (api_hunt/nadia_swagger.json,
 * 22 paths / 321 schemas pulled from /api/docs-json):
 * - Reference endpoints `GET /hotel_cities` and `GET /hotel_countries` are public,
 *   paginated (`?search=&page=&limit=` → {items, meta}), and live at the host root.
 * - Auth: `POST /auth/login` {username, password} → {access_token, refresh_token};
 *   `POST /auth/refresh-token` {refresh_token}. Access JWTs carry an `exp` (~24h).
 *   All data endpoints (flight/*, hotel/*) require `Authorization: Bearer <jwt>`
 *   and answer 401 {"Success":false,"Error":{"Id":401,"Message":"Unauthorized"}} otherwise.
 * - Envelope everywhere: {Success, Error:{Id, Message}, Data}.
 *
 * IMPORTANT: the default host is api.nadiacrs.com — NOT api.nadiacrs.ir. The .ir
 * host serves a Let's Encrypt certificate issued for api.nadiacrs.com only, so
 * every TLS client fails verification on .ir (both hosts resolve to 37.32.14.34).
 *
 * Transport goes through SupplierTransport (timeout, retry, circuit breaker,
 * health metrics) so Nadia behaves like any other supplier.
 */

import { SupplierTransport } from '../SupplierTransport';

export const NADIA_CRS_SUPPLIER_CODE = 'NADIA_CRS';

export interface NadiaCrsCredentials {
  username?: string;
  password?: string;
  /** Optional pre-issued JWT — skips login/refresh entirely (manual testing). */
  staticToken?: string;
  baseUrl?: string;
  /** hotel_cities / hotel_countries live at the host root (same host by default). */
  refBaseUrl?: string;
}

export interface NadiaError {
  Id?: string | number | null;
  Message?: string | null;
}

interface NadiaEnvelope<T = unknown> {
  Success?: boolean;
  Error?: NadiaError | null;
  Data?: T;
}

export class NadiaCrsApiError extends Error {
  readonly errorId: string;
  readonly endpoint: string;

  constructor(errorId: string, message: string, endpoint: string) {
    super(`NADIA_API_ERROR [${errorId || 'UNKNOWN'}]: ${message} (${endpoint})`);
    this.name = 'NadiaCrsApiError';
    this.errorId = errorId || 'UNKNOWN';
    this.endpoint = endpoint;
  }
}

// ---- Reference / search shapes ----

export interface NadiaCity {
  id: number;
  name: string;
  dreamdays_city_id?: number | null;
  eghamat_city_id?: number | null;
  hotelyar_city_id?: number | null;
}

export interface NadiaCountry {
  id: number;
  name: string;
  code: string;
}

export interface NadiaRoomPax {
  AdultCount: number;
  ChildCount: number;
  ChildAges: number[];
}

export interface NadiaHotelAvailabilityRequest {
  CityId: number;
  /** Provider schema marks this required; 0 is treated as city-wide (unverified — needs live creds to confirm). */
  HotelId?: number;
  NationalityId?: string;
  CheckIn: string; // YYYY-MM-DD
  CheckOut: string; // YYYY-MM-DD
  Rooms: NadiaRoomPax[];
}

export interface NadiaAvailabilityFare {
  Currency?: string;
  Price?: number;
  Tax?: { Included?: number; NonIncluded?: number };
}

export interface NadiaAvailabilityRoom {
  MealType?: string;
  RoomId?: string;
  Name?: string;
  Adults?: number;
  Children?: number;
}

export interface NadiaAvailabilityPolicy {
  Cost?: number;
  Currency?: string;
  From?: string;
}

export interface NadiaAvailabilityOption {
  OptionId?: string;
  FreeCancellation?: boolean;
  IsReserveOnline?: boolean;
  Fare?: NadiaAvailabilityFare;
  Rooms?: NadiaAvailabilityRoom[];
  Policies?: NadiaAvailabilityPolicy[];
}

export interface NadiaAvailabilityHotel {
  HotelId?: number;
  HotelName?: string;
  Options?: NadiaAvailabilityOption[];
}

export interface NadiaRecheckRequest {
  OptionId: string;
}

export interface NadiaPrebookRequest {
  OptionId: string;
  PhoneNumber: string;
  Email: string;
  Rooms?: Array<Record<string, unknown>>;
}

export interface NadiaBookRequest {
  slug?: string;
  status?: string;
  passengers_info?: string[];
  [key: string]: unknown;
}

const DEFAULT_BASE_URL = 'https://api.nadiacrs.com';
const TOKEN_EXPIRY_SAFETY_MS = 60 * 1000; // refresh 60s before JWT exp

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

interface JwtPayload {
  exp?: number;
  [key: string]: unknown;
}

function decodeJwtExp(jwt: string): number | null {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()) as JwtPayload;
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export class NadiaCrsClient {
  private readonly username?: string;
  private readonly password?: string;
  private readonly staticToken?: string;
  private readonly baseUrl: string;
  private readonly refBaseUrl: string;

  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;
  private refreshToken: string | null = null;
  private tokenPromise: Promise<string> | null = null;

  constructor(credentials?: NadiaCrsCredentials) {
    const creds = credentials ?? NadiaCrsClient.credentialsFromEnv();
    if (!creds || (!creds.staticToken && (!creds.username || !creds.password))) {
      throw new Error('FAIL_CLOSED: Nadia CRS credentials missing (NADIA_CRS_USERNAME / NADIA_CRS_PASSWORD or NADIA_CRS_TOKEN)');
    }

    this.baseUrl = (creds.baseUrl || process.env.NADIA_CRS_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.refBaseUrl = (creds.refBaseUrl || process.env.NADIA_CRS_REF_BASE_URL || this.baseUrl).replace(/\/+$/, '');

    const parsed = new URL(this.baseUrl);
    if (parsed.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      throw new Error('FAIL_CLOSED: Nadia CRS endpoint must be https in production');
    }
    if (isPrivateHost(parsed.hostname)) {
      throw new Error(`FAIL_CLOSED: Nadia CRS endpoint host is not allowed: ${parsed.hostname}`);
    }
    const refParsed = new URL(this.refBaseUrl);
    if (refParsed.hostname !== parsed.hostname || refParsed.protocol !== parsed.protocol) {
      // Ref endpoints are only ever the reference list on the same host; anything
      // else would mean the operator pointed them at an unvetted origin.
      throw new Error('FAIL_CLOSED: Nadia CRS ref endpoint must share the API origin');
    }

    this.username = creds.username;
    this.password = creds.password;
    this.staticToken = creds.staticToken;
  }

  static credentialsFromEnv(): NadiaCrsCredentials | null {
    const username = process.env.NADIA_CRS_USERNAME;
    const password = process.env.NADIA_CRS_PASSWORD;
    const staticToken = process.env.NADIA_CRS_TOKEN || undefined;
    if (!username || !password) {
      return staticToken ? { staticToken } : null;
    }
    return { username, password, staticToken };
  }

  static isConfigured(): boolean {
    return NadiaCrsClient.credentialsFromEnv() !== null;
  }

  // ---------- Token management ----------

  /**
   * Returns a valid access token: static token, cached JWT, proactive refresh,
   * or login. Concurrent callers share one in-flight token request (single-flight).
   */
  async getToken(): Promise<string> {
    if (this.staticToken) return this.staticToken;
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt - TOKEN_EXPIRY_SAFETY_MS) {
      return this.accessToken;
    }
    if (this.tokenPromise) return this.tokenPromise;

    this.tokenPromise = this.refreshToken
      ? this.refreshAccessToken().catch(() => this.login())
      : this.login();

    return this.tokenPromise.finally(() => {
      this.tokenPromise = null;
    });
  }

  /** Invalidate the cached tokens (after an auth-shaped API error). */
  invalidateToken(): void {
    this.accessToken = null;
    this.accessTokenExpiresAt = 0;
    this.refreshToken = null;
  }

  private async login(): Promise<string> {
    const endpoint = `${this.baseUrl}/auth/login`;
    const res = await SupplierTransport.request<NadiaEnvelope<{ access_token?: string; refresh_token?: string }>>({
      supplierCode: NADIA_CRS_SUPPLIER_CODE,
      endpoint,
      method: 'POST',
      body: { username: this.username, password: this.password },
      timeoutMs: 10000,
    });

    const data = res.data?.Data ?? (res.data as { access_token?: string } | undefined);
    const accessToken = res.data?.Data?.access_token ?? data?.access_token;
    if (!res.ok || !accessToken) {
      throw new NadiaCrsApiError(
        String(res.data?.Error?.Id ?? `HTTP_${res.statusCode}`),
        res.data?.Error?.Message || 'Nadia CRS login failed',
        endpoint,
      );
    }

    this.accessToken = accessToken;
    this.accessTokenExpiresAt = decodeJwtExp(accessToken) ?? Date.now() + 24 * 60 * 60 * 1000;
    this.refreshToken = res.data?.Data?.refresh_token ?? null;
    return accessToken;
  }

  private async refreshAccessToken(): Promise<string> {
    const endpoint = `${this.baseUrl}/auth/refresh-token`;
    const current = this.refreshToken;
    if (!current) throw new NadiaCrsApiError('NO_REFRESH_TOKEN', 'No refresh token cached', endpoint);

    const res = await SupplierTransport.request<NadiaEnvelope<{ access_token?: string; refresh_token?: string }>>({
      supplierCode: NADIA_CRS_SUPPLIER_CODE,
      endpoint,
      method: 'POST',
      body: { refresh_token: current },
      timeoutMs: 10000,
      maxRetries: 0,
    });

    const accessToken = res.data?.Data?.access_token;
    if (!res.ok || !accessToken) {
      throw new NadiaCrsApiError(
        String(res.data?.Error?.Id ?? `HTTP_${res.statusCode}`),
        res.data?.Error?.Message || 'Nadia CRS token refresh failed',
        endpoint,
      );
    }

    this.accessToken = accessToken;
    this.accessTokenExpiresAt = decodeJwtExp(accessToken) ?? Date.now() + 24 * 60 * 60 * 1000;
    this.refreshToken = res.data?.Data?.refresh_token ?? current;
    return accessToken;
  }

  // ---------- Request plumbing ----------

  private async call<T>(
    endpoint: string,
    init: { method?: 'GET' | 'POST'; body?: unknown; timeoutMs?: number } = {},
  ): Promise<{ ok: boolean; payload: NadiaEnvelope<T> | null; statusCode: number }> {
    const token = await this.getToken();
    const res = await SupplierTransport.request<NadiaEnvelope<T>>({
      supplierCode: NADIA_CRS_SUPPLIER_CODE,
      endpoint,
      method: init.method || 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: init.body,
      timeoutMs: init.timeoutMs ?? 8000,
    });

    // Auth-shaped failure: token likely revoked/expired server-side — drop it so
    // the next attempt re-authenticates, then retry this request exactly once.
    if (res.statusCode === 401) {
      this.invalidateToken();
      const retryToken = await this.getToken();
      const retry = await SupplierTransport.request<NadiaEnvelope<T>>({
        supplierCode: NADIA_CRS_SUPPLIER_CODE,
        endpoint,
        method: init.method || 'POST',
        headers: { Authorization: `Bearer ${retryToken}` },
        body: init.body,
        timeoutMs: init.timeoutMs ?? 8000,
        maxRetries: 0,
      });
      return { ok: retry.ok && retry.data?.Success === true, payload: retry.data, statusCode: retry.statusCode };
    }

    return { ok: res.ok && res.data?.Success === true, payload: res.data, statusCode: res.statusCode };
  }

  private async failOrThrow<T>(label: string, endpoint: string, result: { ok: boolean; payload: NadiaEnvelope<T> | null; statusCode: number }): Promise<T> {
    if (!result.ok) {
      throw new NadiaCrsApiError(
        String(result.payload?.Error?.Id ?? `HTTP_${result.statusCode}`),
        result.payload?.Error?.Message || `${label} failed`,
        endpoint,
      );
    }
    return result.payload?.Data as T;
  }

  // ---------- Reference endpoints (public, paginated) ----------

  async searchCities(query: string, limit = 10): Promise<NadiaCity[]> {
    const endpoint = `${this.refBaseUrl}/hotel_cities?search=${encodeURIComponent(query)}&page=1&limit=${limit}`;
    const { ok, payload, statusCode } = await this.call<{ items?: NadiaCity[]; meta?: unknown }>(endpoint, { method: 'GET' });
    if (!ok) {
      throw new NadiaCrsApiError(String(payload?.Error?.Id ?? `HTTP_${statusCode}`), payload?.Error?.Message || 'hotel_cities failed', endpoint);
    }
    return payload?.Data?.items ?? [];
  }

  async searchCountries(query: string, limit = 10): Promise<NadiaCountry[]> {
    const endpoint = `${this.refBaseUrl}/hotel_countries?search=${encodeURIComponent(query)}&page=1&limit=${limit}`;
    const { ok, payload, statusCode } = await this.call<{ items?: NadiaCountry[]; meta?: unknown }>(endpoint, { method: 'GET' });
    if (!ok) {
      throw new NadiaCrsApiError(String(payload?.Error?.Id ?? `HTTP_${statusCode}`), payload?.Error?.Message || 'hotel_countries failed', endpoint);
    }
    return payload?.Data?.items ?? [];
  }

  // ---------- Hotel booking flow ----------

  async hotelAvailability(req: NadiaHotelAvailabilityRequest): Promise<{ Hotels?: NadiaAvailabilityHotel[] }> {
    const endpoint = `${this.baseUrl}/hotel/availability`;
    const result = await this.call<{ Hotels?: NadiaAvailabilityHotel[] }>(endpoint, { body: req, timeoutMs: 15000 });
    return this.failOrThrow('hotel/availability', endpoint, result);
  }

  async hotelRecheck(req: NadiaRecheckRequest): Promise<Record<string, unknown>> {
    const endpoint = `${this.baseUrl}/hotel/recheck`;
    const result = await this.call<Record<string, unknown>>(endpoint, { body: req });
    return this.failOrThrow('hotel/recheck', endpoint, result);
  }

  async hotelCancellationPolicy(req: NadiaRecheckRequest): Promise<Record<string, unknown>> {
    const endpoint = `${this.baseUrl}/hotel/cancellation-policy`;
    const result = await this.call<Record<string, unknown>>(endpoint, { body: req });
    return this.failOrThrow('hotel/cancellation-policy', endpoint, result);
  }

  async hotelPreBook(req: NadiaPrebookRequest): Promise<Record<string, unknown>> {
    const endpoint = `${this.baseUrl}/hotel/preBook`;
    const result = await this.call<Record<string, unknown>>(endpoint, { body: req, timeoutMs: 12000 });
    return this.failOrThrow('hotel/preBook', endpoint, result);
  }

  async hotelBook(optionId: string, req: NadiaBookRequest): Promise<Record<string, unknown>> {
    const endpoint = `${this.baseUrl}/hotel/book/${encodeURIComponent(optionId)}`;
    const result = await this.call<Record<string, unknown>>(endpoint, { body: req, timeoutMs: 20000 });
    return this.failOrThrow('hotel/book', endpoint, result);
  }

  async hotelBookDetail(optionId: string, req: NadiaBookRequest): Promise<Record<string, unknown>> {
    const endpoint = `${this.baseUrl}/hotel/book-detail/${encodeURIComponent(optionId)}`;
    const result = await this.call<Record<string, unknown>>(endpoint, { body: req, timeoutMs: 12000 });
    return this.failOrThrow('hotel/book-detail', endpoint, result);
  }
}
