import { describe, expect, it } from 'vitest';
import {
  countryToLocale,
  detectCountryFromHeaders,
  getFirstVisitLocale,
  isSupportedLocale,
} from './locale-detection';

describe('countryToLocale', () => {
  it('maps Persian-speaking countries to fa', () => {
    expect(countryToLocale('IR')).toBe('fa');
    expect(countryToLocale('ir')).toBe('fa');
    expect(countryToLocale(' AF ')).toBe('fa');
    expect(countryToLocale('TJ')).toBe('fa');
  });

  it('maps Arab League countries to ar', () => {
    for (const c of ['SA', 'AE', 'EG', 'IQ', 'MA', 'sa']) {
      expect(countryToLocale(c)).toBe('ar');
    }
  });

  it('maps China-region countries to zh', () => {
    for (const c of ['CN', 'HK', 'TW', 'MO']) {
      expect(countryToLocale(c)).toBe('zh');
    }
  });

  it('maps Russian-region countries to ru', () => {
    for (const c of ['RU', 'BY', 'KZ', 'KG']) {
      expect(countryToLocale(c)).toBe('ru');
    }
  });

  it('falls back to en for the rest of the world', () => {
    for (const c of ['US', 'DE', 'FR', 'TR', 'IN', 'GB']) {
      expect(countryToLocale(c)).toBe('en');
    }
  });

  it('returns null for missing/invalid codes (existing negotiation applies)', () => {
    expect(countryToLocale(null)).toBeNull();
    expect(countryToLocale(undefined)).toBeNull();
    expect(countryToLocale('')).toBeNull();
    expect(countryToLocale('XXL')).toBeNull();
    expect(countryToLocale('12')).toBeNull();
  });
});

describe('detectCountryFromHeaders', () => {
  it('prefers Vercel header, then Cloudflare', () => {
    const get = (headers: Record<string, string>) => (name: string) =>
      headers[name.toLowerCase()] ?? null;
    expect(
      detectCountryFromHeaders(get({ 'x-vercel-ip-country': 'DE', 'cf-ipcountry': 'FR' }))
    ).toBe('DE');
    expect(detectCountryFromHeaders(get({ 'cf-ipcountry': 'ae' }))).toBe('AE');
    expect(detectCountryFromHeaders(get({}))).toBeNull();
    expect(detectCountryFromHeaders(get({ 'cf-ipcountry': 'XXL' }))).toBeNull();
  });
});

describe('getFirstVisitLocale', () => {
  it('never overrides an explicit cookie choice', () => {
    expect(getFirstVisitLocale({ cookieLocale: 'fa', country: 'DE' })).toBe('fa');
    expect(getFirstVisitLocale({ cookieLocale: 'en', country: 'IR' })).toBe('en');
  });

  it('uses IP country when no cookie choice exists', () => {
    expect(getFirstVisitLocale({ country: 'IR' })).toBe('fa');
    expect(getFirstVisitLocale({ country: 'DE' })).toBe('en');
    expect(getFirstVisitLocale({})).toBeNull();
  });

  it('ignores invalid cookie values', () => {
    expect(getFirstVisitLocale({ cookieLocale: 'xx', country: 'IR' })).toBe('fa');
    expect(isSupportedLocale('xx')).toBe(false);
    expect(isSupportedLocale('fa')).toBe(true);
  });
});
