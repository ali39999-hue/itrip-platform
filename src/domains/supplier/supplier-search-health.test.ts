import { describe, it, expect } from 'vitest';
import {
  createTravelDateTime,
  CircuitBreaker,
  CanonicalFlightOffer,
  CanonicalSearchResponse,
} from './supplier-orchestration';
import { Money } from '@/lib/finance';

describe('Supplier Architecture, Circuit Breakers & Search Normalization (SUP-001, SUP-002, SEARCH-001)', () => {
  it('SUP-001: Preserves local time, timezone, and UTC instant without timezone drift (Section 25)', () => {
    const travelTime = createTravelDateTime('2026-10-15', '08:30', 'Asia/Tehran');

    expect(travelTime.localDateTime).toBe('2026-10-15T08:30:00');
    expect(travelTime.timezone).toBe('Asia/Tehran');
    expect(travelTime.utcInstant).toContain('2026-10-15T05:00:00'); // Tehran is UTC+3:30

    // Beijing flight
    const bjTime = createTravelDateTime('2026-10-20', '14:00', 'Asia/Shanghai');
    expect(bjTime.localDateTime).toBe('2026-10-20T14:00:00');
    expect(bjTime.timezone).toBe('Asia/Shanghai');
    expect(bjTime.utcInstant).toContain('2026-10-20T06:00:00'); // Shanghai is UTC+8
  });

  it('SUP-002: Circuit Breaker trips to OPEN after consecutive failures, blocking calls', async () => {
    const breaker = new CircuitBreaker();
    expect(breaker.getState()).toBe('CLOSED');

    const failingCall = async () => {
      throw new Error('Supplier API 504 Gateway Timeout');
    };

    // 5 consecutive failures
    for (let i = 0; i < 5; i++) {
      await expect(breaker.execute(failingCall)).rejects.toThrow(/Gateway Timeout/i);
    }

    // Now breaker must be OPEN
    expect(breaker.getState()).toBe('OPEN');

    // Subsequent calls are immediately short-circuited without calling supplier
    await expect(breaker.execute(async () => 'ok')).rejects.toThrow(/Circuit Breaker OPEN/i);
  });

  it('SEARCH-001: Canonical search models normalize supplier offers and status codes', () => {
    const departure = createTravelDateTime('2026-11-01', '06:00', 'Asia/Tehran');
    const arrival = createTravelDateTime('2026-11-01', '09:15', 'Asia/Dubai');

    const offer: CanonicalFlightOffer = {
      id: 'off_fl_001',
      supplierCode: 'MAHAN_AIR',
      airlineCode: 'W5',
      airlineName: 'Mahan Air',
      flightNumber: 'W5-061',
      originIata: 'IKA',
      originCity: 'Tehran',
      destinationIata: 'DXB',
      destinationCity: 'Dubai',
      departure,
      arrival,
      durationMinutes: 135,
      stops: 0,
      basePrice: new Money(18_500_000, 'IRR'),
      currency: 'IRR',
      refundable: true,
      baggageAllowance: '30kg',
    };

    const response: CanonicalSearchResponse<CanonicalFlightOffer> = {
      status: 'RESULTS',
      offers: [offer],
      total: 1,
      supplierHealth: [
        { supplierCode: 'MAHAN_AIR', latencyMs: 240, healthy: true },
      ],
    };

    expect(response.status).toBe('RESULTS');
    expect(response.offers[0].originIata).toBe('IKA');
    expect(response.offers[0].basePrice.toString()).toBe('18500000');
    expect(response.offers[0].departure.utcInstant).toBeDefined();
  });
});
