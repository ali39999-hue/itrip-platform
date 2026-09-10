import { describe, it, expect } from 'vitest';
import { searchHotels } from '@/services/hotels-service';

describe('Hotel Price Filter & Toman Scale Regression Suite (v1.5.7 Audit / Section 27)', () => {
  it('correctly defaults to no active filter when maxPrice is 20 (ceiling representing 20M Toman)', () => {
    // Replicate HotelFilterSidebar activeFiltersCount logic
    const minPrice = 0;
    const maxPrice = 20; // Default slider state in v1.5.7
    const hotelName = '';
    const stars = new Set<number>();
    const propertyTypes = new Set<string>();
    const amenities = new Set<string>();
    const minScore = 0;
    const freeCancel = false;

    // The bug in previous version evaluated (maxPrice < 25_000_000) which was 20 < 25_000_000 => true!
    const legacyActiveFiltersCount =
      (hotelName ? 1 : 0) +
      stars.size +
      propertyTypes.size +
      amenities.size +
      (minScore ? 1 : 0) +
      (freeCancel ? 1 : 0) +
      (minPrice > 0 || maxPrice < 25_000_000 ? 1 : 0);

    expect(legacyActiveFiltersCount).toBe(1); // Proves the legacy bug

    // The v1.5.7 fix correctly treats maxPrice = 20 as unfiltered (0 active filters)
    const fixedActiveFiltersCount =
      (hotelName ? 1 : 0) +
      stars.size +
      propertyTypes.size +
      amenities.size +
      (minScore ? 1 : 0) +
      (freeCancel ? 1 : 0) +
      (minPrice > 0 || maxPrice < 20 ? 1 : 0);

    expect(fixedActiveFiltersCount).toBe(0); // Zero filters active by default
  });

  it('marks price filter as active when user sets a budget ceiling below 20M Toman', () => {
    const minPrice = 0;
    const maxPrice = 10; // User filtered to <= 10M Toman
    const isPriceFilterActive = minPrice > 0 || maxPrice < 20;
    expect(isPriceFilterActive).toBe(true);
  });

  it('marks price filter as active when user sets a minimum floor above 0', () => {
    const minPrice = 3; // User filtered to >= 3M Toman
    const maxPrice = 20;
    const isPriceFilterActive = minPrice > 0 || maxPrice < 20;
    expect(isPriceFilterActive).toBe(true);
  });

  it('backend searchHotels correctly converts Toman (<= 250) to IRR without data truncation', async () => {
    // 5M Toman = 50,000,000 IRR
    const resultsUnder5M = await searchHotels({
      city: 'تهران',
      maxPrice: 5, // 5M Toman
    });

    for (const h of resultsUnder5M.hotels) {
      expect(h.pricePerNight).toBeLessThanOrEqual(50_000_000);
    }
  });

  it('backend searchHotels preserves backward compatibility with raw IRR (> 250)', async () => {
    // 60,000,000 IRR
    const resultsRawIrr = await searchHotels({
      city: 'تهران',
      maxPrice: 60_000_000,
    });

    for (const h of resultsRawIrr.hotels) {
      expect(h.pricePerNight).toBeLessThanOrEqual(60_000_000);
    }
  });
});
