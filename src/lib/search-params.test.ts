import { describe, expect, it } from 'vitest';
import { firstParam, CITY_PARAM_KEYS } from './search-params';

function paramsOf(entries: Record<string, string>) {
  return {
    get: (key: string) => (key in entries ? entries[key] : null),
  };
}

describe('firstParam (UX-P2-002 canonical search params)', () => {
  it('prefers the canonical `city` key over legacy aliases', () => {
    const p = paramsOf({ city: 'istanbul', destination: 'antalya', q: 'dubai' });
    expect(firstParam(p, CITY_PARAM_KEYS)).toBe('istanbul');
  });

  it('falls back to legacy `destination` then `q`', () => {
    expect(firstParam(paramsOf({ destination: 'antalya', q: 'dubai' }), CITY_PARAM_KEYS)).toBe('antalya');
    expect(firstParam(paramsOf({ q: 'dubai' }), CITY_PARAM_KEYS)).toBe('dubai');
  });

  it('treats empty and whitespace-only values as missing', () => {
    expect(firstParam(paramsOf({ city: '  ', destination: 'antalya' }), CITY_PARAM_KEYS)).toBe('antalya');
    expect(firstParam(paramsOf({ city: '' }), CITY_PARAM_KEYS)).toBe('');
  });

  it('trims the returned value and returns empty string when nothing matches', () => {
    expect(firstParam(paramsOf({ city: '  tehran ' }), CITY_PARAM_KEYS)).toBe('tehran');
    expect(firstParam(paramsOf({}), CITY_PARAM_KEYS)).toBe('');
  });
});
