import { describe, it, expect } from "vitest";
import { searchHotels } from "@/services/hotels-service";
import {
  HOTEL_PRICE_FLOOR_TOMAN_M,
  HOTEL_PRICE_CEILING_TOMAN_M,
  TOMAN_M_TO_IRR_MULTIPLIER,
  normalizeHotelPriceToIrr,
  irrToHotelFilterTomanM,
  isHotelPriceFilterActive,
  getHotelPriceDefaultBounds,
  formatHotelFilterDisplay,
} from "@/lib/hotel-pricing";

describe("Hotel Price Filter Scale & Unit Conversion Suite (Section 15)", () => {
  it("defines unambiguous constants for price floor, ceiling, and multiplier", () => {
    expect(HOTEL_PRICE_FLOOR_TOMAN_M).toBe(0);
    expect(HOTEL_PRICE_CEILING_TOMAN_M).toBe(20); // 20 Million Tomans
    expect(TOMAN_M_TO_IRR_MULTIPLIER).toBe(10_000_000); // 1M Toman = 10,000,000 IRR
  });

  it("proves the root cause of the legacy 25_000_000 vs 20 regression", () => {
    // When slider default was 20 (meaning 20M Toman = 200M IRR),
    // the old check evaluated: (maxPrice < 25_000_000)
    const defaultMaxPrice = 20;
    const legacyCheck = defaultMaxPrice < 25_000_000;
    expect(legacyCheck).toBe(true); // Bug: Falsely marked 1 active filter on blank searches!

    // The canonical check evaluates against the explicit ceiling:
    const canonicalCheck = isHotelPriceFilterActive(0, defaultMaxPrice);
    expect(canonicalCheck).toBe(false); // Correct: 0 active filters by default
  });

  it("handles default, minimum, and maximum values correctly", () => {
    const bounds = getHotelPriceDefaultBounds();
    expect(bounds.minPrice).toBe(0);
    expect(bounds.maxPrice).toBe(20);
    expect(isHotelPriceFilterActive(bounds.minPrice, bounds.maxPrice)).toBe(false);
  });

  it("correctly identifies active filter state when user sets a budget ceiling below 20M Toman", () => {
    expect(isHotelPriceFilterActive(0, 10)).toBe(true);
    expect(isHotelPriceFilterActive(0, 19)).toBe(true);
    expect(isHotelPriceFilterActive(0, 20)).toBe(false); // Ceiling = unfiltered
  });

  it("correctly identifies active filter state when user sets a floor above 0", () => {
    expect(isHotelPriceFilterActive(3, 20)).toBe(true);
    expect(isHotelPriceFilterActive(0, 20)).toBe(false);
  });

  it("formats display values accurately in Persian and English", () => {
    expect(formatHotelFilterDisplay(0, 20, "fa")).toBe("بدون محدودیت قیمت");
    expect(formatHotelFilterDisplay(0, 20, "en")).toBe("No price limit");

    expect(formatHotelFilterDisplay(0, 15, "fa")).toBe("تا ۱۵ م تومان");
    expect(formatHotelFilterDisplay(0, 15, "en")).toBe("Up to 15M Toman");

    expect(formatHotelFilterDisplay(3, 15, "fa")).toBe("از ۳ تا ۱۵ م تومان");
    expect(formatHotelFilterDisplay(3, 15, "en")).toBe("3M - 15M Toman");
  });

  it("normalizes Toman (<= 250) to exact IRR value", () => {
    // 5M Toman = 50,000,000 IRR
    expect(normalizeHotelPriceToIrr(5)).toBe(50_000_000);
    // 20M Toman = 200,000,000 IRR
    expect(normalizeHotelPriceToIrr(20)).toBe(200_000_000);
    // 0 = 0
    expect(normalizeHotelPriceToIrr(0)).toBe(0);
  });

  it("normalizes raw IRR (> 250) without data truncation (backward compatibility)", () => {
    expect(normalizeHotelPriceToIrr(60_000_000)).toBe(60_000_000);
  });

  it("converts canonical IRR back to Toman M scale", () => {
    expect(irrToHotelFilterTomanM(50_000_000)).toBe(5);
    expect(irrToHotelFilterTomanM(200_000_000)).toBe(20);
  });

  it("backend searchHotels correctly applies Toman normalized bounds", async () => {
    const resultsUnder5M = await searchHotels({
      city: "تهران",
      maxPrice: 5, // 5M Toman = 50M IRR
    });

    for (const h of resultsUnder5M.hotels) {
      expect(h.pricePerNight).toBeLessThanOrEqual(50_000_000);
    }
  });

  it("backend searchHotels preserves backward compatibility with raw IRR", async () => {
    const resultsRawIrr = await searchHotels({
      city: "تهران",
      maxPrice: 60_000_000,
    });

    for (const h of resultsRawIrr.hotels) {
      expect(h.pricePerNight).toBeLessThanOrEqual(60_000_000);
    }
  });
});
