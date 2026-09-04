import { describe, it, expect, afterAll } from 'vitest';
import { InventoryEngine } from './InventoryEngine';
import { prisma } from '@/lib/prisma';

describe('InventoryEngine Concurrent Hold Race Conditions', () => {
  const suffix = `race_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const supplierId = `sup_${suffix}`;
  const inventoryItemId = `item_${suffix}`;
  const testDate = '2026-10-15';

  afterAll(async () => {
    // 5. Cleans up all created test data (hold, allotment, inventoryItem, supplier) in afterAll
    try {
      await prisma.inventoryHold.deleteMany({
        where: { inventoryItemId },
      });
      await prisma.allotment.deleteMany({
        where: { inventoryItemId },
      });
      await prisma.inventoryItem.deleteMany({
        where: { id: inventoryItemId },
      });
      await prisma.supplier.deleteMany({
        where: { id: supplierId },
      });
    } catch (e) {
      console.error('Cleanup error:', e);
    } finally {
      await prisma.$disconnect();
    }
  }, 60000);

  it('handles 20 concurrent hold requests with totalCapacity: 1, allowing exactly 1 success and 19 failures', async () => {
    // 1. Sets up an InventoryItem and an Allotment with totalCapacity: 1 on a specific date.
    await prisma.supplier.create({
      data: {
        id: supplierId,
        name: `Test Supplier ${suffix}`,
        type: 'HOTEL',
        mode: 'ALLOTMENT',
      },
    });

    await prisma.inventoryItem.create({
      data: {
        id: inventoryItemId,
        supplierId,
        type: 'HOTEL_ROOM',
        code: `CODE_${suffix}`,
        name: `Deluxe Suite ${suffix}`,
        basePrice: 5000000,
        currency: 'IRR',
      },
    });

    const allotment = await prisma.allotment.create({
      data: {
        inventoryItemId,
        date: testDate,
        total: 1, // totalCapacity: 1
        booked: 0,
        stopSell: false,
      },
    });

    expect(allotment.total).toBe(1);

    // 2. Fires 20 concurrent requests to InventoryEngine.createHold(...) simultaneously using Promise.all.
    const concurrentCount = 20;
    const holdPromises = Array.from({ length: concurrentCount }, () =>
      InventoryEngine.createHold({
        inventoryItemId,
        date: testDate,
        quantity: 1,
        ttlMinutes: 10,
      })
    );

    const results = await Promise.all(holdPromises);

    // 3. Verifies that EXACTLY 1 request succeeds (success: true) and 19 requests fail with appropriate error message
    const successful = results.filter((r) => r.success === true);
    const failed = results.filter((r) => r.success === false);

    expect(successful.length).toBe(1);
    expect(failed.length).toBe(19);

    expect(successful[0].token).toBeDefined();

    // Verify appropriate error message on failures
    for (const failResult of failed) {
      expect(failResult.error).toBeDefined();
      expect(failResult.error).toMatch(/insufficient inventory|allotment not found|stop-sell/i);
    }

    // 4. Verifies that the remaining allotment count is exactly 0 and no oversell occurred.
    const activeHolds = await prisma.inventoryHold.findMany({
      where: {
        inventoryItemId,
        allotmentDate: testDate,
        status: 'ACTIVE',
      },
    });

    const heldQuantity = activeHolds.reduce((sum, h) => sum + h.quantity, 0);
    const updatedAllotment = await prisma.allotment.findUniqueOrThrow({
      where: {
        inventoryItemId_date: {
          inventoryItemId,
          date: testDate,
        },
      },
    });

    const remainingAvailable = updatedAllotment.total - updatedAllotment.booked - heldQuantity;

    expect(heldQuantity).toBe(1);
    expect(activeHolds.length).toBe(1);
    expect(remainingAvailable).toBe(0);
    expect(updatedAllotment.booked).toBe(0);
    expect(remainingAvailable).toBeGreaterThanOrEqual(0);
  }, 60000);
});
