import { describe, it, expect } from 'vitest';
import { deriveReturnFlight } from './return-flight';
import { FLIGHTS } from './data';

describe('deriveReturnFlight (Smart Planner round-trip)', () => {
  it('mirrors the outbound leg with swapped origin/destination', () => {
    const outbound = FLIGHTS.find((f) => f.destinationCity === 'استانبول')!;
    const ret = deriveReturnFlight(outbound);

    expect(ret.origin).toBe(outbound.destination);
    expect(ret.destination).toBe(outbound.origin);
    expect(ret.originCity).toBe(outbound.destinationCity);
    expect(ret.destinationCity).toBe(outbound.originCity);
    expect(ret.airline).toBe(outbound.airline);
    expect(ret.price).toBe(outbound.price);
    expect(ret.id).toBe(`${outbound.id}-rt`);
  });

  it('keeps departure inside the 09:30–12:00 window and honours flight duration', () => {
    const outbound = FLIGHTS[0]; // 1h 30m
    const ret = deriveReturnFlight(outbound);

    const [depH, depM] = ret.departureTime.split(':').map(Number);
    const depMinutes = depH * 60 + depM;
    expect(depMinutes).toBeGreaterThanOrEqual(9 * 60 + 30);
    expect(depMinutes).toBeLessThanOrEqual(12 * 60);

    const [arrH, arrM] = ret.arrivalTime.split(':').map(Number);
    const arrMinutes = arrH * 60 + arrM;
    expect((arrMinutes - depMinutes + 1440) % 1440).toBe(90);
  });

  it('is deterministic for the same outbound', () => {
    const outbound = FLIGHTS[3];
    expect(deriveReturnFlight(outbound)).toEqual(deriveReturnFlight(outbound));
  });

  it('wraps arrival past midnight without overflow', () => {
    const late = { ...FLIGHTS[8], duration: '18h 00m' };
    const ret = deriveReturnFlight(late);
    expect(ret.arrivalTime).toMatch(/^\d{2}:\d{2}$/);
  });
});
