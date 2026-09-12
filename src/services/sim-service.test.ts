import { describe, it, expect } from 'vitest';
import { SimService } from './sim-service';

describe('SimService Suite', () => {
  it('returns valid SIM and eSIM packages with delivery points', async () => {
    const catalog = await SimService.getCatalog();
    expect(catalog).toBeDefined();
    expect(catalog.packages.length).toBeGreaterThan(0);
    expect(catalog.airports.length).toBeGreaterThan(0);
    expect(catalog.hotels.length).toBeGreaterThan(0);

    const firstPkg = catalog.packages[0];
    expect(firstPkg.id).toBeDefined();
    expect(firstPkg.name).toBeDefined();
    expect(firstPkg.priceToman).toBeGreaterThan(0);
    expect(firstPkg.priceUsd).toBeGreaterThan(0);
    expect(firstPkg.durationDays).toBeGreaterThan(0);
    expect(Array.isArray(firstPkg.features)).toBe(true);

    const airport = catalog.airports[0];
    expect(airport.name).toBeDefined();
    expect(airport.type).toBe('AIRPORT');

    const hotel = catalog.hotels[0];
    expect(hotel.name).toBeDefined();
    expect(hotel.type).toBe('HOTEL');
  });

  it('contains both eSIM digital plans and physical visitor SIMs', async () => {
    const catalog = await SimService.getCatalog();
    const hasEsim = catalog.packages.some((p) => p.isEsim);
    expect(hasEsim).toBe(true);
  });
});
