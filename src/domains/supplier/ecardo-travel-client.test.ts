import { describe, it, expect, vi } from 'vitest';
import { EcardoTravelClient } from './adapters/EcardoTravelClient';

describe('EcardoTravelClient Suite', () => {
  const dummySecret = 'test_secret_123';

  it('enforces https protocol and whitelist of allowed eCardo hosts (SSRF protection)', async () => {
    const clientHttp = new EcardoTravelClient({ apiBase: 'http://trip.ecardo.ir/api', originSecret: dummySecret });
    await expect(clientHttp.bootstrap()).rejects.toThrow(/SSRF Error: eCardo Travel requests must use https/);

    const clientMalicious = new EcardoTravelClient({ apiBase: 'https://evil.com/api', originSecret: dummySecret });
    await expect(clientMalicious.bootstrap()).rejects.toThrow(/SSRF Error: Disallowed eCardo Travel host/);

    const clientLocalhost = new EcardoTravelClient({ apiBase: 'https://localhost:8080/api', originSecret: dummySecret });
    await expect(clientLocalhost.bootstrap()).rejects.toThrow(/SSRF Error: Disallowed eCardo Travel host/);
  });

  it('correctly attaches X-Travel-Origin-Secret header and sends request to bootstrap endpoint', async () => {
    const client = new EcardoTravelClient({
      apiBase: 'https://trip.ecardo.ir/api',
      originSecret: dummySecret,
    });

    let interceptedHeaders: Record<string, string> = {};
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url, opts) => {
      const headers = opts?.headers as Record<string, string>;
      interceptedHeaders = headers;
      return new Response(
        JSON.stringify({
          status: 'success',
          schema_version: '1.0',
          data: {
            brand: 'ecardo',
            currency: 'IRR',
            locale: 'fa',
            services: [{ key: 'hotel', display_name: 'رزرو هتل', capabilities: ['search'] }],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const res = await client.bootstrap('fa');
    expect(res.status).toBe('success');
    expect(res.data.brand).toBe('ecardo');
    expect(res.data.services.length).toBe(1);
    expect(interceptedHeaders['X-Travel-Origin-Secret']).toBe(dummySecret);
    expect(interceptedHeaders['User-Agent']).toBe('FiruzoTravel/1.0');

    fetchSpy.mockRestore();
  });

  it('formats criteria payload and executes hotel search', async () => {
    const client = new EcardoTravelClient({
      apiBase: 'https://trip.ecardo.ir/api',
      originSecret: dummySecret,
    });

    let capturedBody: Record<string, unknown> = {};
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url, opts) => {
      capturedBody = JSON.parse(String(opts?.body));
      return new Response(
        JSON.stringify({
          status: 'success',
          schema_version: '1.0',
          data: {
            service: 'hotel',
            offers: [
              {
                id: 'hotel_129',
                service: 'hotel',
                provider_key: 'master_json',
                title: 'هتل خیام',
                pricing: { total_amount: 1500000, currency: 'IRR' },
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const res = await client.searchHotels({
      city: 'Tehran',
      checkIn: '2026-09-15',
      checkOut: '2026-09-17',
      adults: 2,
    });

    expect(res.status).toBe('success');
    expect(res.data.offers.length).toBe(1);
    expect(res.data.offers[0].title).toBe('هتل خیام');
    expect((capturedBody.criteria as Record<string, unknown>).city).toBe('Tehran');
    expect((capturedBody.criteria as Record<string, unknown>).adults).toBe(2);

    fetchSpy.mockRestore();
  });

  it('fetches SIM products and passes country code query parameter', async () => {
    const client = new EcardoTravelClient({
      apiBase: 'https://trip.ecardo.ir/api',
      originSecret: dummySecret,
    });

    let requestedUrl = '';
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      requestedUrl = String(url);
      return new Response(
        JSON.stringify({
          status: 'success',
          data: [
            {
              id: 1,
              title: 'Iran Visitor SIM',
              country_code: 'IRN',
              selling_price: '8.00',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const res = await client.getSimProducts('IRN');
    expect(res.status).toBe('success');
    expect(res.data[0].title).toBe('Iran Visitor SIM');
    expect(requestedUrl).toContain('country_code=IRN');

    fetchSpy.mockRestore();
  });

  it('exchanges auth token and creates order with bearer authentication', async () => {
    const client = new EcardoTravelClient({
      apiBase: 'https://trip.ecardo.ir/api',
      originSecret: dummySecret,
    });

    let bearerHeader = '';
    let idempotencyHeader = '';
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url, opts) => {
      const u = String(url);
      const headers = opts?.headers as Record<string, string>;
      bearerHeader = headers['Authorization'] || '';
      idempotencyHeader = headers['Idempotency-Key'] || '';

      if (u.includes('/auth/exchange')) {
        return new Response(
          JSON.stringify({ status: 'success', token: 'travel_jwt_abc123' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (u.includes('/catalog-orders')) {
        return new Response(
          JSON.stringify({ status: 'success', data: { id: 'ord_999', status: 'pending_payment' } }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not Found', { status: 404 });
    });

    const exch = await client.exchangeAuthToken('main_ecardo_token');
    expect(exch.token).toBe('travel_jwt_abc123');

    const order = await client.createCatalogOrder(
      { service: 'hotel', offer_id: 'hotel_129' },
      { token: exch.token, idempotencyKey: 'idem_key_unique_1' }
    );
    expect(order.data.id).toBe('ord_999');
    expect(bearerHeader).toBe('Bearer travel_jwt_abc123');
    expect(idempotencyHeader).toBe('idem_key_unique_1');

    fetchSpy.mockRestore();
  });

  it('normalizes and throws API error messages on non-200 responses', async () => {
    const client = new EcardoTravelClient({
      apiBase: 'https://trip.ecardo.ir/api',
      originSecret: dummySecret,
    });

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          status: 'error',
          error: { code: 'INSUFFICIENT_WALLET_BALANCE', message: 'Wallet balance is insufficient.' },
        }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      );
    });

    await expect(
      client.payOrderFromWallet('ord_123', { token: 't' })
    ).rejects.toThrow(/Wallet balance is insufficient/);

    fetchSpy.mockRestore();
  });
});
