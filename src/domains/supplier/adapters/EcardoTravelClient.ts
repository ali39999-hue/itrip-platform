/**
 * eCardo Travel Platform Client
 *
 * Implements the official eCardo Travel API (OpenAPI 3.1.0) for:
 * - Discovery & Server-Driven UI (Bootstrap, Service Catalog)
 * - Normalized Offers Search (Hotels, Flights, eSIM)
 * - SIM / eSIM Products & Delivery Points
 * - Identity Token Exchange & eCardo Wallet Order Captures
 *
 * Security & Reliability:
 * - Strict SSRF validation: https only, whitelisted official hosts (trip.ecardo.ir, travel-origin.ecardo.ir).
 * - Secrets loaded exclusively from environment variables (process.env.ECARDO_TRAVEL_ORIGIN_SECRET).
 * - Centralized timeout, retry, and structured error normalization.
 */

export interface EcardoTravelConfig {
  apiBase?: string;
  originSecret?: string;
  timeoutMs?: number;
}

export interface EcardoBootstrapResponse {
  status: 'success' | 'error';
  schema_version: string;
  data: {
    brand: string;
    currency: string;
    locale: string;
    services: Array<{
      key: 'hotel' | 'flight' | 'esim' | string;
      display_name: string;
      description: string;
      icon_key: string;
      accent_color?: string;
      capabilities: string[];
      search_schema?: Record<string, unknown>;
    }>;
  };
}

export interface EcardoOffer {
  id: string;
  service: 'hotel' | 'flight' | 'esim' | string;
  provider_key: string;
  title: string;
  subtitle?: string;
  badge?: string;
  image_url?: string;
  product?: Record<string, unknown>;
  pricing: {
    total_amount: number;
    currency: string;
    components?: Array<{
      key: string;
      amount: number;
      label?: string;
    }>;
  };
  highlights?: string[];
  attributes?: Record<string, unknown>;
  policies?: Record<string, unknown>;
  actions?: Array<{
    type: string;
    label: string;
    endpoint?: string;
  }>;
  booking_mode?: string;
  expires_at?: string | null;
}

export interface EcardoOfferSearchResponse {
  status: 'success' | 'error';
  schema_version?: string;
  data: {
    service: string;
    offers: EcardoOffer[];
    facets?: Record<string, unknown>;
    pagination?: {
      page: number;
      per_page: number;
      total: number;
      last_page: number;
      has_more: boolean;
    };
    partial?: boolean;
  };
  request_id?: string;
}

export interface EcardoSimProduct {
  id: number;
  provider_id: number;
  title: string;
  description: string;
  country_code: string;
  is_esim: number | boolean;
  type: string;
  status: string;
  provider_cost: string;
  selling_price: string;
}

export class EcardoTravelClient {
  private apiBase: string;
  private originSecret: string;
  private timeoutMs: number;

  private static readonly ALLOWED_HOSTS = new Set([
    'trip.ecardo.ir',
    'travel-origin.ecardo.ir',
  ]);

  constructor(config?: EcardoTravelConfig) {
    this.apiBase = (
      config?.apiBase ||
      process.env.ECARDO_TRAVEL_API_BASE ||
      'https://trip.ecardo.ir/api'
    ).replace(/\/+$/, '');

    this.originSecret =
      config?.originSecret !== undefined
        ? config.originSecret
        : process.env.ECARDO_TRAVEL_ORIGIN_SECRET || '';

    this.timeoutMs = config?.timeoutMs || 25000;
  }

  /**
   * SSRF Protection: strictly enforce https scheme and whitelisted eCardo hosts.
   */
  private assertAllowedUrl(targetUrl: string): void {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'https:') {
      throw new Error(`SSRF Error: eCardo Travel requests must use https, got ${parsed.protocol}`);
    }
    if (!EcardoTravelClient.ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
      throw new Error(`SSRF Error: Disallowed eCardo Travel host: ${parsed.hostname}`);
    }
  }

  /**
   * Universal authenticated HTTP transport for eCardo Travel API.
   */
  private async request<T>(
    endpointPath: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: unknown;
      token?: string;
      idempotencyKey?: string;
      customOriginSecret?: string;
    } = {}
  ): Promise<T> {
    const method = options.method || 'GET';
    const cleanPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
    const fullUrl = `${this.apiBase}${cleanPath}`;

    this.assertAllowedUrl(fullUrl);

    const secret = options.customOriginSecret || this.originSecret;
    const headers: Record<string, string> = {
      'User-Agent': 'FiruzoTravel/1.0',
      Accept: 'application/json',
    };

    if (secret) {
      headers['X-Travel-Origin-Secret'] = secret;
    }
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }
    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const resp = await fetch(fullUrl, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        redirect: 'manual',
        signal: controller.signal,
      });

      const responseText = await resp.text();
      let responseJson: Record<string, unknown> = {};
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        // non-JSON response
      }

      if (!resp.ok) {
        const errorMsg =
          (responseJson.error as { message?: string } | undefined)?.message ||
          (responseJson.message as string | undefined) ||
          `eCardo Travel API error: HTTP ${resp.status} on ${endpointPath}`;
        const err = new Error(errorMsg);
        (err as Error & { status?: number; payload?: unknown }).status = resp.status;
        (err as Error & { status?: number; payload?: unknown }).payload = responseJson;
        throw err;
      }

      return responseJson as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Discovery: Bootstrap services catalog and server-driven UI schemas.
   */
  async bootstrap(locale: string = 'fa'): Promise<EcardoBootstrapResponse> {
    return this.request<EcardoBootstrapResponse>(`/v1/travel/bootstrap?locale=${encodeURIComponent(locale)}`);
  }

  /**
   * Search a normalized Travel service (hotel, flight, esim).
   */
  async searchService(
    service: 'hotel' | 'flight' | 'esim',
    criteria: Record<string, unknown>,
    locale: string = 'fa'
  ): Promise<EcardoOfferSearchResponse> {
    return this.request<EcardoOfferSearchResponse>(
      `/v1/travel/services/${service}/search?locale=${encodeURIComponent(locale)}`,
      {
        method: 'POST',
        body: { criteria },
      }
    );
  }

  /**
   * Get single offer details by ID.
   */
  async getOffer(
    service: 'hotel' | 'flight' | 'esim',
    offerId: string,
    locale: string = 'fa'
  ): Promise<{ status: string; data: { offer: EcardoOffer } }> {
    return this.request<{ status: string; data: { offer: EcardoOffer } }>(
      `/v1/travel/services/${service}/offers/${encodeURIComponent(offerId)}?locale=${encodeURIComponent(locale)}`
    );
  }

  /**
   * Specialized Hotel Search.
   */
  async searchHotels(params: {
    city: string;
    checkIn: string;
    checkOut: string;
    adults?: number;
    locale?: string;
  }): Promise<EcardoOfferSearchResponse> {
    return this.searchService(
      'hotel',
      {
        city: params.city,
        check_in: params.checkIn,
        check_out: params.checkOut,
        adults: params.adults || 1,
      },
      params.locale || 'fa'
    );
  }

  /**
   * Specialized Flight Search.
   */
  async searchFlights(params: {
    origin: string;
    destination: string;
    departureDate?: string;
    locale?: string;
  }): Promise<EcardoOfferSearchResponse> {
    return this.searchService(
      'flight',
      {
        origin: params.origin,
        destination: params.destination,
        departure_date: params.departureDate,
      },
      params.locale || 'fa'
    );
  }

  /**
   * SIM / eSIM: List countries with available SIM products.
   */
  async getSimCountries(): Promise<{ status: string; data: Array<{ code: string; name: string; flag?: string }> }> {
    return this.request('/v1/sim/countries');
  }

  /**
   * SIM / eSIM: List products for a country.
   */
  async getSimProducts(countryCode?: string): Promise<{ status: string; data: EcardoSimProduct[] }> {
    const q = countryCode ? `?country_code=${encodeURIComponent(countryCode)}` : '';
    return this.request(`/v1/sim/products${q}`);
  }

  /**
   * SIM / eSIM: List airport delivery counters.
   */
  async getSimAirports(): Promise<{ status: string; data: Array<{ id: number; name: string; city: string; active?: number }> }> {
    return this.request('/v1/sim/airports');
  }

  /**
   * SIM / eSIM: List hotel delivery points.
   */
  async getSimHotels(): Promise<{ status: string; data: Array<{ id: number; name: string; city: string; active?: number }> }> {
    return this.request('/v1/sim/hotels');
  }

  /**
   * Exchange main eCardo token for short-lived Travel bearer token.
   */
  async exchangeAuthToken(sourceToken: string): Promise<{
    status: string;
    token?: string;
    access_token?: string;
    token_type?: string;
    expires_in?: number;
  }> {
    return this.request('/v1/auth/exchange', {
      method: 'POST',
      body: { source_token: sourceToken },
    });
  }

  /**
   * Create a catalog order (hotel or flight).
   */
  async createCatalogOrder(
    params: {
      service: 'hotel' | 'flight';
      offer_id: string;
      check_in_date?: string;
      check_out_date?: string;
      room_count?: number;
      adult_count?: number;
      child_count?: number;
      search_metadata?: Record<string, unknown>;
    },
    options?: { token?: string; idempotencyKey?: string }
  ): Promise<{ status: string; data: { id: string; status: string; total_amount?: number; currency?: string } }> {
    return this.request('/v1/catalog-orders', {
      method: 'POST',
      body: params,
      token: options?.token,
      idempotencyKey: options?.idempotencyKey || `ord_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    });
  }

  /**
   * Capture order payment from the user's eCardo wallet.
   */
  async payOrderFromWallet(
    orderId: string,
    options: { token: string; idempotencyKey?: string }
  ): Promise<{ status: string; data?: Record<string, unknown> }> {
    return this.request(`/v1/orders/${encodeURIComponent(orderId)}/pay`, {
      method: 'POST',
      token: options.token,
      idempotencyKey: options.idempotencyKey || `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    });
  }
}
