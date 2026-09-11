/**
 * Hotel Price Filter Scale & Unit Conversion Architecture (REG-105)
 *
 * Technical Rule & Evolution History:
 * - In legacy v1.5.0, filters compared (maxPrice < 25_000_000) where 25M was raw IRR (2.5M Toman).
 * - In v1.5.7, UI sliders and histogram buckets were recalibrated to Millions of Tomans (MTOMAN).
 * - Minimum = 0 MTOMAN (0 IRR).
 * - Default Ceiling = 20 MTOMAN (20,000,000 Toman = 200,000,000 IRR).
 * - If maxPrice >= 20 MTOMAN, the filter is INACTIVE (user selected "بدون سقف / Unlimited").
 * - Backend normalizes: values <= 250 are MTOMAN (* 10,000,000 IRR); values > 250 are raw IRR.
 */

import { toPersianDigits } from "@/lib/iranian-commerce";

export const HOTEL_PRICE_FLOOR_TOMAN_M = 0;
export const HOTEL_PRICE_CEILING_TOMAN_M = 20; // 20 Million Tomans = 200,000,000 IRR
export const TOMAN_M_TO_IRR_MULTIPLIER = 10_000_000;
export const TOMAN_M_NORMALIZATION_THRESHOLD = 250;

/**
 * Normalizes filter price input (either Millions of Tomans <= 250 or raw IRR > 250) into canonical IRR.
 */
export function normalizeHotelPriceToIrr(value: number): number {
  if (value < 0) return 0;
  if (value <= TOMAN_M_NORMALIZATION_THRESHOLD) {
    return value * TOMAN_M_TO_IRR_MULTIPLIER;
  }
  return value;
}

/**
 * Converts canonical IRR to UI slider scale in Millions of Tomans.
 */
export function irrToHotelFilterTomanM(irr: number): number {
  if (irr <= 0) return 0;
  return irr / TOMAN_M_TO_IRR_MULTIPLIER;
}

/**
 * Determines whether the price filter has been modified from default unfiltered state.
 */
export function isHotelPriceFilterActive(minPrice: number = 0, maxPrice: number = HOTEL_PRICE_CEILING_TOMAN_M): boolean {
  const isMinActive = minPrice > HOTEL_PRICE_FLOOR_TOMAN_M;
  const isMaxActive = maxPrice < HOTEL_PRICE_CEILING_TOMAN_M;
  return isMinActive || isMaxActive;
}

/**
 * Clean reset state for hotel price bounds.
 */
export function getHotelPriceDefaultBounds(): { minPrice: number; maxPrice: number } {
  return {
    minPrice: HOTEL_PRICE_FLOOR_TOMAN_M,
    maxPrice: HOTEL_PRICE_CEILING_TOMAN_M,
  };
}

/**
 * Localized presentation helper for filter tags and summaries.
 */
export function formatHotelFilterDisplay(
  minPrice: number,
  maxPrice: number,
  locale: string = "fa"
): string {
  const isMinActive = minPrice > HOTEL_PRICE_FLOOR_TOMAN_M;
  const isMaxActive = maxPrice < HOTEL_PRICE_CEILING_TOMAN_M;

  if (!isMinActive && !isMaxActive) {
    return locale === "fa" ? "بدون محدودیت قیمت" : "No price limit";
  }

  const minStr = locale === "fa" ? toPersianDigits(minPrice) : String(minPrice);
  const maxStr = locale === "fa" ? toPersianDigits(maxPrice) : String(maxPrice);

  if (isMinActive && isMaxActive) {
    return locale === "fa"
      ? `از ${minStr} تا ${maxStr} م تومان`
      : `${minPrice}M - ${maxPrice}M Toman`;
  }

  if (isMinActive) {
    return locale === "fa"
      ? `حداقل ${minStr} م تومان`
      : `Min ${minPrice}M Toman`;
  }

  return locale === "fa"
    ? `تا ${maxStr} م تومان`
    : `Up to ${maxPrice}M Toman`;
}
