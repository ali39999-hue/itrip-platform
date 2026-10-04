import { describe, it, expect, vi } from 'vitest';

/**
 * T0502/T0513 QA — CMS action guards. Every content action must fail closed
 * for anonymous callers (403-equivalent error from requirePermission), and
 * the section catalog is the only unguarded read (static registry data).
 */
const state = vi.hoisted(() => ({
  sessionUserId: null as string | null,
}));

vi.mock('@/auth', () => ({
  safeAuth: vi.fn(async () =>
    state.sessionUserId ? { user: { id: state.sessionUserId } } : null
  ),
  auth: vi.fn(async () => (state.sessionUserId ? { user: { id: state.sessionUserId } } : null)),
}));

import { listContentPages, publishContentPage, getSectionCatalog } from './business-content-ops';

describe('QA — CMS action guards (T0502/T0513)', () => {
  it('listContentPages fails closed for anonymous callers', async () => {
    state.sessionUserId = null;
    const res = await listContentPages();
    expect(res.success).toBe(false);
    expect(res.error).toBeTruthy();
  });

  it('publishContentPage fails closed for anonymous callers', async () => {
    state.sessionUserId = null;
    const res = await publishContentPage('page_x');
    expect(res.success).toBe(false);
    expect(res.error).toBeTruthy();
  });

  it('section catalog is registry-driven and unguarded (static data)', async () => {
    state.sessionUserId = null;
    const res = await getSectionCatalog();
    expect(res.success).toBe(true);
    expect(res.sections.map((s) => s.key).sort()).toEqual([
      'faq_accordion',
      'hero_banner',
      'included_services',
      'itinerary_timeline',
    ]);
  });
});
