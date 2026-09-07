import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SupplierTransport } from './SupplierTransport';
import { SupplierNormalizer } from './SupplierNormalizer';
import { PartoFlightSupplierAdapter } from './adapters/PartoFlightSupplierAdapter';
import { EghamatHotelSupplierAdapter } from './adapters/EghamatHotelSupplierAdapter';
import { CircuitBreaker } from './supplier-orchestration';
import { encryptSensitive, decryptSensitive } from '@/lib/security/crypto-vault';

describe('Real Suppliers & Integration Contract Suite (SUP-101 to SUP-109)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    SupplierTransport.resetForTesting();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    SupplierTransport.resetForTesting();
    vi.restoreAllMocks();
  });

  it('SUP-104: SupplierNormalizer maps raw Parto flight payload to CanonicalFlightOffer with Money and TravelDateTime', () => {
    const rawParto = {
      Id: 'flight_parto_101',
      AirlineCode: 'W5',
      AirlineName: 'Mahan Air',
      FlightNumber: 'W5-112',
      Origin: 'IKA',
      OriginCity: 'Tehran',
      Destination: 'IST',
      DestinationCity: 'Istanbul',
      DepartureDate: '2026-11-20',
      DepartureTime: '09:00',
      ArrivalDate: '2026-11-20',
      ArrivalTime: '12:30',
      DurationMinutes: 210,
      Stops: 0,
      AvailableSeats: 3,
      TotalPrice: 18_500_000,
      Currency: 'IRR',
      Baggage: '30kg',
      IsRefundable: true,
    };

    const { canonical, offer } = SupplierNormalizer.normalizePartoFlight(rawParto, 'PARTO_GDS');

    expect(canonical.id).toContain('flight_parto_101');
    expect(canonical.airlineCode).toBe('W5');
    expect(canonical.departure.localDateTime).toBe('2026-11-20T09:00:00');
    expect(canonical.departure.timezone).toBe('Asia/Tehran');
    expect(canonical.departure.utcInstant).toBeDefined();
    expect(canonical.basePrice.toNumber()).toBe(18_500_000);
    expect(canonical.currency).toBe('IRR');

    expect(offer.seatsRemaining).toBe(3);
    expect(offer.basePrice).toBe(18_500_000);
    expect(offer.refundable).toBe(true);
  });

  it('SUP-104: SupplierNormalizer maps raw Eghamat24 hotel payload to canonical HotelPropertyResult', () => {
    const rawHotel = {
      HotelId: 1042,
      HotelName: 'هتل بین‌المللی قصر طلایی',
      Stars: 5,
      Score: 9.4,
      CityName: 'مشهد',
      Address: 'مشهد، میدان بسیج',
      Rooms: [
        {
          RoomId: 'room_junior_suite',
          RoomTitle: 'جونیور سوئیت دونفره',
          Board: 'BREAKFAST',
          CancellationRule: 'کنسلی رایگان تا ۷۲ ساعت قبل از ورود',
          Refundable: true,
          PricePerNight: 9_200_000,
          TotalAmount: 18_400_000,
          Currency: 'IRR',
        },
      ],
    };

    const normalized = SupplierNormalizer.normalizeEghamatHotel(rawHotel, 'EGHAMAT_24');

    expect(normalized.hotelId).toContain('1042');
    expect(normalized.stars).toBe(5);
    expect(normalized.rating).toBe(9.4);
    expect(normalized.rates.length).toBe(1);
    expect(normalized.rates[0].roomName).toBe('جونیور سوئیت دونفره');
    expect(normalized.rates[0].pricePerNight).toBe(9_200_000);
    expect(normalized.rates[0].mealPlan).toBe('BREAKFAST');
  });

  it('SUP-103 & SUP-109: SupplierTransport injects supplierRequestId, captures raw response, and records latency', async () => {
    const mockData = { AirTrips: [{ Id: '123', FlightNumber: 'W5-101', TotalPrice: 15000000 }] };
    let capturedCorrelationHeader: string | null = null;

    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url, init) => {
      capturedCorrelationHeader = init?.headers?.['X-Supplier-Request-Id'] || null;
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockData)),
      });
    }));

    const response = await SupplierTransport.request<typeof mockData>({
      supplierCode: 'TEST_SUPPLIER',
      endpoint: 'https://api.mocksupplier.com/search',
      body: { origin: 'IKA' },
    });

    expect(response.ok).toBe(true);
    expect(response.data).toEqual(mockData);
    expect(response.supplierRequestId).toBeDefined();
    expect(response.supplierRequestId).toContain('req_sup_test_supplier');
    expect(capturedCorrelationHeader).toBe(response.supplierRequestId);
    expect(response.latencyMs).toBeGreaterThanOrEqual(0);
    expect(response.rawResponse).toBe(JSON.stringify(mockData));
  });

  it('SUP-103: SupplierTransport automatically retries on transient HTTP 5xx errors', async () => {
    let callCount = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 503,
          text: () => Promise.resolve('Service Temporarily Unavailable'),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ status: 'recovered' })),
      });
    }));

    const response = await SupplierTransport.request<{ status: string }>({
      supplierCode: 'RETRY_SUPPLIER',
      endpoint: 'https://api.supplier.com/transient',
      maxRetries: 2,
    });

    expect(response.ok).toBe(true);
    expect(callCount).toBe(2);
    expect(response.retriesAttempted).toBe(1);
    expect(response.data.status).toBe('recovered');
  });

  it('SUP-106: Encrypts and decrypts supplier credentials securely via CryptoVault', () => {
    const testApiKey = `test-supplier-key-${crypto.randomUUID()}`;
    const creds = {
      apiKey: testApiKey,
      officeId: 'THR-FIRUZO-MAIN',
      endpointUrl: 'https://api.partocrs.com/v2',
    };

    const sealed = encryptSensitive(JSON.stringify(creds));
    expect(sealed).not.toContain(testApiKey);

    const unsealed = JSON.parse(decryptSensitive(sealed));
    expect(unsealed.apiKey).toBe(testApiKey);
    expect(unsealed.officeId).toBe('THR-FIRUZO-MAIN');
  });

  it('SUP-107: Provider health metrics track request volume, success, failure, and latency', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{"ok":true}'),
    }));

    await SupplierTransport.request({
      supplierCode: 'METRIC_SUPPLIER',
      endpoint: 'https://api.metrics.com/call',
    });

    const health = SupplierTransport.getHealth('METRIC_SUPPLIER');
    expect(health.totalRequests).toBe(1);
    expect(health.successfulRequests).toBe(1);
    expect(health.failedRequests).toBe(0);
    expect(health.recentLatencies.length).toBe(1);
  });

  it('SUP-108: Circuit Breaker trips to OPEN and routes to secondary fallback supplier', async () => {
    const cb = new CircuitBreaker();

    // Trigger 5 failures to trip circuit
    for (let i = 0; i < 5; i++) {
      cb.recordFailure();
    }
    expect(cb.getState()).toBe('OPEN');

    let primaryCalled = false;
    let fallbackCalled = false;

    const primaryAction = async () => {
      primaryCalled = true;
      return 'primary_result';
    };

    const fallbackAction = async () => {
      fallbackCalled = true;
      return 'fallback_result';
    };

    // When circuit is OPEN, executeWithRouting should skip primary and call fallback
    const routingResult = await cb.executeWithRouting(primaryAction, fallbackAction);

    expect(routingResult.fallbackUsed).toBe(true);
    expect(routingResult.result).toBe('fallback_result');
    expect(primaryCalled).toBe(false);
    expect(fallbackCalled).toBe(true);
  });

  it('SUP-101 & SUP-102: Adapters fail closed in production when credentials are missing', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    delete process.env.PARTO_API_KEY;
    delete process.env.EGHAMAT_API_KEY;

    const flightAdapter = new PartoFlightSupplierAdapter();
    await expect(flightAdapter.search({
      origin: 'IKA',
      destination: 'IST',
      departureDate: '2026-10-15',
      passengers: { adults: 1 },
    })).rejects.toThrow('FAIL_CLOSED');

    const hotelAdapter = new EghamatHotelSupplierAdapter();
    await expect(hotelAdapter.search({
      city: 'Tehran',
      checkIn: '2026-10-15',
      checkOut: '2026-10-18',
      rooms: 1,
      guests: 2,
    })).rejects.toThrow('FAIL_CLOSED');
  });
});
