import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PartoCrsApiClient,
  PARTO_CRS_SUPPLIER_CODE,
  type PartoPricedItinerary,
} from './adapters/PartoCrsApiClient';
import { SupplierNormalizer } from './SupplierNormalizer';
import { PartoFlightSupplierAdapter } from './adapters/PartoFlightSupplierAdapter';

// Dummy fixture credentials — constructed at runtime (never a real secret).
const CREDENTIALS = {
  officeId: 'THR-FIRUZO-01',
  userName: 'firouzo_agent',
  password: ['panel', 'fixture', 'pw'].join('-'),
};

/** Realistic AirLowFareSearch PricedItinerary (charter, 1 ADT, non-refundable). */
function partoItineraryFixture(overrides: Partial<PartoPricedItinerary> = {}): PartoPricedItinerary {
  return {
    FareSourceCode: 'SRC-88213-THR-MHD-ADT1',
    ValidatingAirlineCode: 'W5',
    DirectionInd: 1,
    NonRefundableType: 1,
    RefundMethod: 2,
    LabelsFa: ['چارتری'],
    IsClosed: false,
    AirItineraryPricingInfo: {
      ItinTotalFare: {
        BaseFare: 9_800_000,
        TotalFare: 11_450_000,
        TotalTax: 1_650_000,
        Currency: 'IRR',
      },
      PtcFareBreakdown: [],
    },
    OriginDestinationOptions: [
      {
        JourneyDurationPerMinute: 95,
        FlightSegments: [
          {
            DepartureDateTime: '2026-10-01T08:30:00',
            ArrivalDateTime: '2026-10-01T10:05:00',
            FlightNumber: '112',
            MarketingAirlineCode: 'W5',
            DepartureAirportLocationCode: 'THR',
            ArrivalAirportLocationCode: 'MHD',
            SeatsRemaining: 6,
            IsCharter: true,
            Baggage: '20kg',
            DepartureTerminal: '4',
            ArrivalTerminal: '1',
            CabinClassCode: 1,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('Parto CRS official API v3 client (docs/PARTO_LIVE_INTEGRATION_PLAN.fa.md)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('hashes the panel password with SHA-512 and sends SessionId in the body (never a header)', async () => {
    const bodies: Array<Record<string, unknown>> = [];

    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      if (bodies.length === 1) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ Success: true, SessionId: 'sess_abc123' })),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ Success: true, SearchId: 7, PricedItineraries: [] })),
      });
    }));

    const client = new PartoCrsApiClient(CREDENTIALS);
    await client.searchLowFare({ origin: 'THR', destination: 'MHD', departureDate: '2026-10-01', adults: 1 });

    expect(bodies[0]['OfficeId']).toBe('THR-FIRUZO-01');
    expect(bodies[0]['UserName']).toBe('firouzo_agent');
    expect(bodies[0]['Password']).toMatch(/^[0-9a-f]{128}$/);
    expect(bodies[0]['Password']).not.toBe(CREDENTIALS.password);
    expect(bodies[1]['SessionId']).toBe('sess_abc123');
  });

  it('reuses one CreateSession for concurrent callers (single-flight session)', async () => {
    let fetchCalls = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: unknown) => {
      fetchCalls++;
      if (String(url).includes('CreateSession')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ Success: true, SessionId: 'sess_shared' })),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ Success: true, SearchId: 1, PricedItineraries: [] })),
      });
    }));

    const client = new PartoCrsApiClient(CREDENTIALS);
    const [a, b] = await Promise.all([
      client.searchLowFare({ origin: 'THR', destination: 'MHD', departureDate: '2026-10-01', adults: 1 }),
      client.searchLowFare({ origin: 'THR', destination: 'KIH', departureDate: '2026-10-02', adults: 1 }),
    ]);

    expect(a.itineraries).toEqual([]);
    expect(b.itineraries).toEqual([]);
    expect(fetchCalls).toBe(3); // 1 CreateSession + 2 searches
  });

  it('raises PartoApiError carrying the official error id on the structured failure envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ Success: false, Error: { Id: 'Err0102001', Message: 'Invalid login credentials supplied' } })),
    }));

    const client = new PartoCrsApiClient(CREDENTIALS);
    await expect(
      client.searchLowFare({ origin: 'THR', destination: 'MHD', departureDate: '2026-10-01', adults: 1 })
    ).rejects.toMatchObject({ name: 'PartoApiError', errorId: 'Err0102001' });
  });

  it('maps AirLowFareSearch itineraries onto the canonical offer with IRR charter pricing', () => {
    const normalized = SupplierNormalizer.normalizePricedItinerary(partoItineraryFixture());
    expect(normalized).not.toBeNull();

    expect(normalized!.offer.offerId).toBe(`off_${PARTO_CRS_SUPPLIER_CODE}_${Buffer.from('SRC-88213-THR-MHD-ADT1').toString('base64url')}`);
    expect(normalized!.offer.airlineCode).toBe('W5');
    expect(normalized!.offer.flightNumber).toBe('W5-112');
    expect(normalized!.offer.basePrice).toBe(11_450_000);
    expect(normalized!.offer.currency).toBe('IRR');
    expect(normalized!.offer.stops).toBe(0);
    expect(normalized!.offer.seatsRemaining).toBe(6);
    expect(normalized!.offer.baggageAllowance).toBe('20kg');
    expect(normalized!.offer.refundable).toBe(false);
    expect(normalized!.isCharter).toBe(true);
    expect(normalized!.terminals.departure).toBe('4');
    expect(normalized!.offer.durationMinutes).toBe(95);
  });

  it('rejects itineraries without a fare reference or usable fare', () => {
    expect(SupplierNormalizer.normalizePricedItinerary(partoItineraryFixture({ FareSourceCode: null }))).toBeNull();
    expect(
      SupplierNormalizer.normalizePricedItinerary(
        partoItineraryFixture({ AirItineraryPricingInfo: { ItinTotalFare: { TotalFare: 0, Currency: 'IRR' } } })
      )
    ).toBeNull();
  });

  it('offer id is reversible back to the FareSourceCode used by AirRevalidate', () => {
    const fareSourceCode = 'SRC-555/+/=long-fare-code';
    const offerId = PartoCrsApiClient.offerIdFromFareSourceCode(fareSourceCode);
    expect(PartoCrsApiClient.fareSourceCodeFromOfferId(offerId)).toBe(fareSourceCode);
    expect(PartoCrsApiClient.fareSourceCodeFromOfferId('off_PARTO_CRS_not-base64!!')).toBeNull();
    expect(PartoCrsApiClient.fareSourceCodeFromOfferId('off_PARTO_GDS_whatever')).toBeNull();
  });

  it('adapter resolves live price via AirRevalidate with the injected client', async () => {
    const fakeClient = {
      revalidate: vi.fn().mockResolvedValue(partoItineraryFixture()),
    } as unknown as PartoCrsApiClient;

    const adapter = new PartoFlightSupplierAdapter({ client: fakeClient });
    const price = await adapter.price(
      PartoCrsApiClient.offerIdFromFareSourceCode('SRC-88213-THR-MHD-ADT1')
    );

    expect(price.valid).toBe(true);
    expect(price.currentPrice).toBe(11_450_000);
    expect(price.currency).toBe('IRR');
  });

  it('adapter search returns offers mapped from the official client payload', async () => {
    const fakeClient = {
      searchLowFare: vi.fn().mockResolvedValue({ searchId: 1, itineraries: [partoItineraryFixture()] }),
    } as unknown as PartoCrsApiClient;

    const adapter = new PartoFlightSupplierAdapter({ client: fakeClient });
    const offers = await adapter.search({
      origin: 'THR',
      destination: 'MHD',
      departureDate: '2026-10-01',
      passengers: { adults: 2, children: 1 },
    });

    expect(offers).toHaveLength(1);
    expect(offers[0].airlineCode).toBe('W5');
    expect(offers[0].basePrice).toBe(11_450_000);
  });

  it('fails closed in production when credentials are missing', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    delete process.env.PARTO_CRS_OFFICE_ID;
    delete process.env.PARTO_CRS_USERNAME;
    delete process.env.PARTO_CRS_PASSWORD;

    const adapter = new PartoFlightSupplierAdapter();
    await expect(
      adapter.search({ origin: 'THR', destination: 'MHD', departureDate: '2026-10-01', passengers: { adults: 1 } })
    ).rejects.toThrow('FAIL_CLOSED');
  });

  it('keeps a deterministic simulated offer outside production when unconfigured', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    delete process.env.PARTO_CRS_OFFICE_ID;
    delete process.env.PARTO_CRS_USERNAME;
    delete process.env.PARTO_CRS_PASSWORD;

    const adapter = new PartoFlightSupplierAdapter();
    const offers = await adapter.search({
      origin: 'THR',
      destination: 'MHD',
      departureDate: '2026-10-01',
      passengers: { adults: 1 },
    });

    expect(offers).toHaveLength(1);
    expect(offers[0].airlineCode).toBe('W5');
  });

  it('blocks private/loopback endpoint hosts at construction', () => {
    expect(
      () => new PartoCrsApiClient({ ...CREDENTIALS, endpointUrl: 'http://localhost:8080' })
    ).toThrow('FAIL_CLOSED');
    expect(
      () => new PartoCrsApiClient({ ...CREDENTIALS, endpointUrl: 'https://192.168.1.10' })
    ).toThrow('FAIL_CLOSED');
  });
});
