import { describe, expect, it } from 'vitest';
import { sanitizeProps } from './analytics';

describe('sanitizeProps', () => {
  it('keeps scalar funnel props', () => {
    expect(
      sanitizeProps({ route: '/flights/search', locale: 'fa', stops: 0, refundable: true }),
    ).toEqual({ route: '/flights/search', locale: 'fa', stops: 0, refundable: true });
  });

  it('strips PII-ish keys', () => {
    const out = sanitizeProps({
      route: '/checkout',
      email: 'user@example.com',
      contactPhone: '09120000000',
      passportNo: 'L1234567',
      nationalId: '0012345678',
      firstName: 'ALI',
    });
    expect(out).toEqual({ route: '/checkout' });
  });

  it('drops objects/arrays and truncates long strings', () => {
    const out = sanitizeProps({
      passengers: [{ firstName: 'ALI' }],
      note: 'x'.repeat(500),
    });
    expect(out).toEqual({ note: 'x'.repeat(120) });
  });

  it('drops nullish values', () => {
    expect(sanitizeProps({ a: undefined, b: null, c: 1 })).toEqual({ c: 1 });
  });
});
