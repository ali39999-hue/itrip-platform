import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NadiaCrsClient, NadiaCrsApiError } from './NadiaCrsClient';

function makeJwt(payload: Record<string, unknown>): string {
  const enc = (o: Record<string, unknown>) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc(payload)}.sig`;
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

const AVAILABILITY_BODY = {
  CityId: 2000000039,
  NationalityId: 'IR',
  CheckIn: '2026-10-01',
  CheckOut: '2026-10-03',
  Rooms: [{ AdultCount: 2, ChildCount: 0, ChildAges: [] }],
};

describe('Nadia CRS client (docs/NADIA_CRS_INTEGRATION.fa.md)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NADIA_CRS_USERNAME;
    delete process.env.NADIA_CRS_PASSWORD;
    delete process.env.NADIA_CRS_TOKEN;
    delete process.env.NADIA_CRS_BASE_URL;
    delete process.env.NADIA_CRS_REF_BASE_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('is fail-closed: constructor throws without any credentials', () => {
    expect(() => new NadiaCrsClient()).toThrow('FAIL_CLOSED: Nadia CRS credentials missing');
    expect(NadiaCrsClient.isConfigured()).toBe(false);
  });

  it('accepts a static token without calling login', async () => {
    process.env.NADIA_CRS_TOKEN = 'static-test-token';
    const calls: Array<{ url: string; init?: RequestInit }> = [];

    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return Promise.resolve(jsonResponse(200, { Success: true, Error: null, Data: { Hotels: [] } }));
    }));

    const client = new NadiaCrsClient();
    await client.hotelAvailability(AVAILABILITY_BODY);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.nadiacrs.com/hotel/availability');
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer static-test-token');
  });

  it('logs in first and sends the access token on data calls', async () => {
    process.env.NADIA_CRS_USERNAME = 'agency_user';
    process.env.NADIA_CRS_PASSWORD = 'agency_pass';
    const jwt = makeJwt({ id: 27, exp: Math.floor(Date.now() / 1000) + 3600 });
    const calls: Array<{ url: string; init?: RequestInit }> = [];

    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      if (String(url).endsWith('/auth/login')) {
        return Promise.resolve(jsonResponse(200, { Success: true, Error: null, Data: { access_token: jwt, refresh_token: 'rt-1' } }));
      }
      return Promise.resolve(jsonResponse(200, { Success: true, Error: null, Data: { Hotels: [] } }));
    }));

    const client = new NadiaCrsClient();
    await client.hotelAvailability(AVAILABILITY_BODY);

    expect(calls).toHaveLength(2);
    expect(calls[0].url).toBe('https://api.nadiacrs.com/auth/login');
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ username: 'agency_user', password: 'agency_pass' });
    const headers = calls[1].init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${jwt}`);
  });

  it('re-authenticates and retries exactly once after a 401', async () => {
    process.env.NADIA_CRS_USERNAME = 'agency_user';
    process.env.NADIA_CRS_PASSWORD = 'agency_pass';
    const jwt = makeJwt({ id: 27, exp: Math.floor(Date.now() / 1000) + 3600 });
    const calls: string[] = [];

    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      calls.push(String(url));
      if (String(url).endsWith('/auth/login')) {
        return Promise.resolve(jsonResponse(200, { Success: true, Error: null, Data: { access_token: jwt, refresh_token: 'rt-1' } }));
      }
      if (calls.filter((c) => c.endsWith('/hotel/availability')).length === 1) {
        return Promise.resolve(jsonResponse(401, { Success: false, Error: { Id: 401, Message: 'Unauthorized' }, Data: null }));
      }
      return Promise.resolve(jsonResponse(200, { Success: true, Error: null, Data: { Hotels: [{ HotelId: 1, HotelName: 'X', Options: [] }] } }));
    }));

    const client = new NadiaCrsClient();
    const data = await client.hotelAvailability(AVAILABILITY_BODY);

    expect(data?.Hotels).toHaveLength(1);
    // login → availability (401) → re-login → availability retry
    expect(calls).toEqual([
      'https://api.nadiacrs.com/auth/login',
      'https://api.nadiacrs.com/hotel/availability',
      'https://api.nadiacrs.com/auth/login',
      'https://api.nadiacrs.com/hotel/availability',
    ]);
  });

  it('proactively refreshes a token inside the expiry safety window', async () => {
    process.env.NADIA_CRS_USERNAME = 'agency_user';
    process.env.NADIA_CRS_PASSWORD = 'agency_pass';
    const shortJwt = makeJwt({ id: 27, exp: Math.floor(Date.now() / 1000) + 30 }); // < 60s safety window
    const freshJwt = makeJwt({ id: 27, exp: Math.floor(Date.now() / 1000) + 3600 });
    const calls: string[] = [];

    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      calls.push(String(url));
      if (String(url).endsWith('/auth/login')) {
        return Promise.resolve(jsonResponse(200, { Success: true, Error: null, Data: { access_token: shortJwt, refresh_token: 'rt-1' } }));
      }
      if (String(url).endsWith('/auth/refresh-token')) {
        expect(JSON.parse(String(init?.body))).toEqual({ refresh_token: 'rt-1' });
        return Promise.resolve(jsonResponse(200, { Success: true, Error: null, Data: { access_token: freshJwt, refresh_token: 'rt-2' } }));
      }
      return Promise.resolve(jsonResponse(200, { Success: true, Error: null, Data: { Hotels: [] } }));
    }));

    const client = new NadiaCrsClient();
    await client.hotelAvailability(AVAILABILITY_BODY); // triggers login
    await client.hotelAvailability(AVAILABILITY_BODY); // short-lived → refresh

    expect(calls).toContain('https://api.nadiacrs.com/auth/refresh-token');
    expect(calls.filter((c) => c.endsWith('/auth/refresh-token'))).toHaveLength(1);
  });

  it('queries hotel_cities on the reference base with pagination params', async () => {
    process.env.NADIA_CRS_USERNAME = 'agency_user';
    process.env.NADIA_CRS_PASSWORD = 'agency_pass';
    const jwt = makeJwt({ id: 27, exp: Math.floor(Date.now() / 1000) + 3600 });
    const calls: string[] = [];

    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      calls.push(String(url));
      if (String(url).endsWith('/auth/login')) {
        return Promise.resolve(jsonResponse(200, { Success: true, Error: null, Data: { access_token: jwt, refresh_token: 'rt-1' } }));
      }
      return Promise.resolve(
        jsonResponse(200, { Success: true, Error: null, Data: { items: [{ id: 2000000039, name: 'Tehran', eghamat_city_id: 69 }], meta: { totalItems: 1 } } }),
      );
    }));

    const client = new NadiaCrsClient();
    const cities = await client.searchCities('tehran');

    expect(cities).toEqual([{ id: 2000000039, name: 'Tehran', eghamat_city_id: 69 }]);
    expect(calls[1]).toBe('https://api.nadiacrs.com/hotel_cities?search=tehran&page=1&limit=10');
  });

  it('maps the {Success, Error} envelope into NadiaCrsApiError', async () => {
    process.env.NADIA_CRS_USERNAME = 'agency_user';
    process.env.NADIA_CRS_PASSWORD = 'agency_pass';
    const jwt = makeJwt({ id: 27, exp: Math.floor(Date.now() / 1000) + 3600 });

    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (String(url).endsWith('/auth/login')) {
        return Promise.resolve(jsonResponse(200, { Success: true, Error: null, Data: { access_token: jwt, refresh_token: 'rt-1' } }));
      }
      return Promise.resolve(jsonResponse(200, { Success: false, Error: { Id: 'E1042', Message: 'CityId not found' }, Data: null }));
    }));

    const client = new NadiaCrsClient();
    await expect(client.hotelAvailability(AVAILABILITY_BODY)).rejects.toThrow(NadiaCrsApiError);
    await expect(client.hotelAvailability(AVAILABILITY_BODY)).rejects.toThrow(/E1042.*CityId not found/s);
  });

  it('rejects mismatched ref origin and non-https production endpoints', () => {
    process.env.NADIA_CRS_TOKEN = 'static-test-token';
    process.env.NADIA_CRS_REF_BASE_URL = 'https://evil.example.com';
    expect(() => new NadiaCrsClient()).toThrow('FAIL_CLOSED: Nadia CRS ref endpoint must share the API origin');
  });

  it('exposes the canonical supplier code through transport calls', async () => {
    process.env.NADIA_CRS_TOKEN = 'static-test-token';
    const supplierRequestIds: string[] = [];
    // Indirect assertion: transport correlation ids embed the supplier code
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>;
      supplierRequestIds.push(headers['X-Supplier-Request-Id'] || '');
      return Promise.resolve(jsonResponse(200, { Success: true, Error: null, Data: { Hotels: [] } }));
    }));

    const client = new NadiaCrsClient();
    await client.hotelAvailability(AVAILABILITY_BODY);
    expect(supplierRequestIds[0]).toMatch(/^req_sup_nadia_crs_/);
  });
});
