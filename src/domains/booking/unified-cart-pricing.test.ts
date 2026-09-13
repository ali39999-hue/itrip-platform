import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnifiedCartService, type UnifiedCartItem } from './UnifiedCartService';
import { InventoryEngine } from '@/domains/inventory/InventoryEngine';
import { FLIGHTS } from '@/lib/data';

/**
 * BUG-001 regression: the unified cart must resolve every line's unit price
 * server-side (catalog → InventoryItem.basePrice). Client-supplied unitPrice
 * values are display hints and can never influence money math, and carts
 * containing unpriceable items fail closed before any inventory hold is taken.
 */
describe('UnifiedCartService server-side price authority (BUG-001)', () => {
  const flight = FLIGHTS[0];

  it('ignores tampered client unitPrice and uses the catalog price', async () => {
    const res = await UnifiedCartService.resolveServerCartPricing(
      [
        {
          type: 'FLIGHT',
          itemId: flight.id,
          title: 'tampered cart line',
          count: 1,
          unitPrice: 1, // attacker-supplied value far below real price
          travelDate: '2026-12-01',
        },
      ],
      'IRR'
    );

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.pricedItems[0].unitPrice).toBe(flight.price);
      expect(res.pricedItems[0].unitPrice).not.toBe(1);
    }
  });

  it('fails closed when a line has no server-resolvable price', async () => {
    const res = await UnifiedCartService.resolveServerCartPricing(
      [
        {
          type: 'FLIGHT',
          itemId: 'does_not_exist_anywhere',
          title: 'ghost offer',
          count: 1,
          unitPrice: 9_999,
          travelDate: '2026-12-01',
        },
      ],
      'IRR'
    );

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain('ghost offer');
    }
  });

  it('falls back to InventoryItem.basePrice with a currency-mismatch guard', async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValueOnce({ basePrice: 5_500_000, currency: 'IRR' })
      .mockResolvedValueOnce({ basePrice: 100, currency: 'USDT' });

    // Re-import with the mocked prisma to exercise the inventory fallback branch.
    // tour.findUnique must resolve null so the TOUR branch falls through to the
    // InventoryItem.basePrice lookup this regression test targets.
    vi.resetModules();
    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        tour: { findUnique: vi.fn().mockResolvedValue(null) },
        inventoryItem: { findUnique },
      },
    }));
    const { UnifiedCartService: MockedService } = await import('./UnifiedCartService');

    const okRes = await MockedService.resolveServerCartPricing(
      [
        {
          type: 'TOUR',
          itemId: 'not_in_catalog',
          title: 'erp inventory tour',
          count: 2,
          unitPrice: 1,
          travelDate: '2026-12-01',
          inventoryItemId: 'inv_test_1',
        },
      ],
      'IRR'
    );
    expect(okRes.ok).toBe(true);
    if (okRes.ok) expect(okRes.pricedItems[0].unitPrice).toBe(5_500_000);

    const mismatchRes = await MockedService.resolveServerCartPricing(
      [
        {
          type: 'TOUR',
          itemId: 'not_in_catalog',
          title: 'currency mismatch tour',
          count: 1,
          unitPrice: 1,
          travelDate: '2026-12-01',
          inventoryItemId: 'inv_test_usdt',
        },
      ],
      'IRR'
    );
    expect(mismatchRes.ok).toBe(false);

    vi.doUnmock('@/lib/prisma');
    vi.resetModules();
  });

  it('refuses to acquire holds when cart pricing fails closed', async () => {
    const createHoldSpy = vi.spyOn(InventoryEngine, 'createHold');

    const items: UnifiedCartItem[] = [
      {
        type: 'FLIGHT',
        itemId: 'unresolvable_item',
        title: 'unpriceable line',
        count: 1,
        unitPrice: 5,
        travelDate: '2026-12-01',
        inventoryItemId: 'inv_any',
      },
    ];

    const res = await UnifiedCartService.createMultiItemBooking({
      actorId: 'price-authority-test-user',
      items,
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('unpriceable line');
    expect(createHoldSpy).not.toHaveBeenCalled();

    createHoldSpy.mockRestore();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });
});
