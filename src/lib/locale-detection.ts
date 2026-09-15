/**
 * First-visit locale detection (IP / CDN-country based).
 *
 * Edge-safe pure module (no Node APIs) — safe to import from middleware.
 *
 * Precedence (first visit, no explicit locale prefix in the URL):
 *   1. `NEXT_LOCALE` cookie (explicit user choice — never overridden)
 *   2. CDN / platform country header (`x-vercel-ip-country`, `cf-ipcountry`, …)
 *   3. Existing next-intl negotiation (Accept-Language → default `fa`)
 *
 * This module only implements steps 1–2 as pure functions; the middleware
 * wires them in and falls through to next-intl when they yield nothing.
 */

export const SUPPORTED_LOCALES = ['en', 'fa', 'ar', 'zh', 'ru'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'fa';

export const NEXT_LOCALE_COOKIE = 'NEXT_LOCALE';

const FA_COUNTRIES = new Set(['IR', 'AF', 'TJ']);
const AR_COUNTRIES = new Set([
  'SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'YE',
  'IQ', 'SY', 'JO', 'LB', 'PS', 'EG', 'LY',
  'TN', 'DZ', 'MA', 'MR', 'SD', 'SO', 'DJ', 'KM', 'TD',
]);
const ZH_COUNTRIES = new Set(['CN', 'HK', 'TW', 'MO']);
const RU_COUNTRIES = new Set(['RU', 'BY', 'KZ', 'KG']);

function normalizeCountry(country?: string | null): string | null {
  if (!country) return null;
  const code = country.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

/**
 * Maps an ISO 3166-1 alpha-2 country code to a site locale.
 * Returns `null` for missing/invalid codes (caller falls through to
 * next-intl negotiation). Any other valid country maps to English —
 * the site's international fallback language.
 */
export function countryToLocale(country?: string | null): SupportedLocale | null {
  const code = normalizeCountry(country);
  if (!code) return null;
  if (FA_COUNTRIES.has(code)) return 'fa';
  if (AR_COUNTRIES.has(code)) return 'ar';
  if (ZH_COUNTRIES.has(code)) return 'zh';
  if (RU_COUNTRIES.has(code)) return 'ru';
  return 'en';
}

export function isSupportedLocale(value?: string | null): value is SupportedLocale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Country headers set by common CDNs / platforms (first hit wins). */
const COUNTRY_HEADERS = [
  'x-vercel-ip-country',
  'cf-ipcountry',
  'cloudfront-viewer-country',
  'x-country-code',
];

/**
 * Reads the visitor country from request headers.
 * `getHeader` receives a header name and returns its value or null
 * (keeps this module free of Request/Headers types for easy unit testing).
 */
export function detectCountryFromHeaders(
  getHeader: (name: string) => string | null | undefined
): string | null {
  for (const name of COUNTRY_HEADERS) {
    const code = normalizeCountry(getHeader(name));
    if (code) return code;
  }
  return null;
}

export interface FirstVisitLocaleInput {
  /** Value of the NEXT_LOCALE cookie, if present. */
  cookieLocale?: string | null;
  /** Visitor ISO country code (already extracted from headers), if known. */
  country?: string | null;
}

/**
 * Resolves the locale for a prefix-less first visit:
 * explicit cookie choice → IP country → null (let next-intl decide).
 */
export function getFirstVisitLocale(input: FirstVisitLocaleInput): SupportedLocale | null {
  if (isSupportedLocale(input.cookieLocale)) return input.cookieLocale;
  return countryToLocale(input.country);
}
