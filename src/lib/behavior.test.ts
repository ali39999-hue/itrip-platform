import { describe, expect, it } from 'vitest';
import { normalizeRoute, sanitizeBehaviorEvent, sanitizeBatch } from './behavior';

describe('normalizeRoute', () => {
  it('strips query and hash (PII safety)', () => {
    expect(normalizeRoute('/fa/flights/search?from=IKA&phone=09120000000#top')).toBe(
      '/fa/flights/search',
    );
  });

  it('collapses dynamic ids', () => {
    expect(normalizeRoute('/fa/admin/users/cm12345678901234567890')).toBe('/fa/admin/users/:id');
  });

  it('collapses underscore db-ids (usr_/saga_ tokens)', () => {
    expect(normalizeRoute('/fa/admin/users/usr_saga_tst_mtykh1de_881kw')).toBe(
      '/fa/admin/users/:id',
    );
  });

  it('collapses booking references but keeps real slugs', () => {
    expect(normalizeRoute('/fa/bookings/FZ-8X2K9Q')).toBe('/fa/bookings/:id');
    expect(normalizeRoute('/fa/admin/travel-files')).toBe('/fa/admin/travel-files');
    expect(normalizeRoute('/fa/hotels/search')).toBe('/fa/hotels/search');
  });

  it('keeps Persian slugs after decoding', () => {
    expect(normalizeRoute('/fa/guide/' + encodeURIComponent('تهران'))).toBe(
      '/fa/guide/' + encodeURIComponent('تهران').toLowerCase(),
    );
  });

  it('handles full URLs', () => {
    expect(normalizeRoute('https://firuzo.example/fa/hotels/123?x=1')).toBe('/fa/hotels/:id');
  });
});

describe('sanitizeBehaviorEvent', () => {
  it('accepts a valid click', () => {
    const out = sanitizeBehaviorEvent({
      type: 'CLICK',
      route: '/fa/flights',
      xPct: 12.345,
      yPct: 67.891,
      selector: 'button[data-testid=search]',
      viewportW: 390,
      viewportH: 844,
    });
    expect(out).toMatchObject({ type: 'CLICK', route: '/fa/flights', device: 'mobile' });
    expect(out?.xPct).toBeCloseTo(12.3);
  });

  it('drops unknown types', () => {
    expect(
      sanitizeBehaviorEvent({ type: 'KEYLOG' as never, route: '/fa' }),
    ).toBeNull();
  });

  it('rejects invalid scroll milestones', () => {
    expect(
      sanitizeBehaviorEvent({ type: 'SCROLL_DEPTH', route: '/fa', scrollPct: 33 }),
    ).toBeNull();
    expect(
      sanitizeBehaviorEvent({ type: 'SCROLL_DEPTH', route: '/fa', scrollPct: 50 }),
    ).toMatchObject({ scrollPct: 50 });
  });

  it('scrubs PII props', () => {
    const out = sanitizeBehaviorEvent({
      type: 'FUNNEL',
      route: '/fa/checkout',
      event: 'checkout_started',
      props: { route: '/fa/checkout', email: 'a@b.com', stops: 0 },
    });
    expect(out?.propsJson).toContain('checkout_started');
    expect(out?.propsJson).not.toContain('a@b.com');
  });
});

describe('sanitizeBatch', () => {
  it('caps batch size and drops invalid', () => {
    const big = Array.from({ length: 60 }, (_, i) => ({
      type: 'PAGE_VIEW' as const,
      route: `/fa/p${i}`,
    }));
    const out = sanitizeBatch([...big, { type: 'NOPE', route: '/x' }]);
    expect(out.length).toBeLessThanOrEqual(50);
  });
});
