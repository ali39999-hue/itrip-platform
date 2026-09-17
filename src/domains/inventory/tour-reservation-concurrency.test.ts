import { describe, it, expect, afterAll } from 'vitest';
import { InventoryEngine } from './InventoryEngine';
import { prisma } from '@/lib/prisma';

describe('Tour Reservation 100-Concurrent Race Condition Suite (§17, §63)', () => {
  const suffix = `tour_race_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const supplierId = `sup_tour_${suffix}`;
  const tourItemId = `item_tour_${suffix}`;
  const departureDate = '2026-11-28';

  afterAll(async () => {
    try {
      await prisma.inventoryHold.deleteMany({ where: { inventoryItemId: tourItemId } });
      await prisma.allotment.deleteMany({ where: { inventoryItemId: tourItemId } });
      await prisma.inventoryItem.deleteMany({ where: { id: tourItemId } });
      await prisma.supplier.deleteMany({ where: { id: supplierId } });
    } catch (err) {
      console.error('Tour concurrency cleanup error:', err);
    }
  }, 60000);

  it('sets up tour departure inventory with exact capacity = 1', async () => {
    await prisma.supplier.create({
      data: {
        id: supplierId,
        name: `VIP Tours Partner ${suffix}`,
        type: 'TOUR',
        mode: 'ALLOTMENT',
      },
    });

    await prisma.inventoryItem.create({
      data: {
        id: tourItemId,
        supplierId,
        type: 'TOUR_PACKAGE',
        code: `TOUR_PKG_${suffix}`,
        name: `Isfahan Luxury Tour ${suffix}`,
        basePrice: 85_000_000,
        currency: 'IRR',
      },
    });

    const allotment = await prisma.allotment.create({
      data: {
        inventoryItemId: tourItemId,
        date: departureDate,
        total: 1, // EXACTLY 1 SEAT/SPOT AVAILABLE
        booked: 0,
        stopSell: false,
      },
    });

    expect(allotment.total).toBe(1);
    expect(allotment.booked).toBe(0);
  });

  it('TOUR-CONCURRENCY-100: 100 concurrent reservation hold requests yield EXACTLY 1 success (zero oversell)', async () => {
    const concurrentRequests = 100;

    const holdPromises = Array.from({ length: concurrentRequests }, () =>
      InventoryEngine.createHold({
        inventoryItemId: tourItemId,
        date: departureDate,
        quantity: 1,
        ttlMinutes: 15,
      })
    );

    const results = await Promise.all(holdPromises);

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    // EXACTLY 1 winner allowed
    expect(successful.length).toBe(1);
    expect(failed.length).toBe(concurrentRequests - 1);
    expect(successful[0].token).toBeDefined();

    // Verify database state: holds = 1, booked = 0, oversell = 0
    const activeHolds = await prisma.inventoryHold.findMany({
      where: {
        inventoryItemId: tourItemId,
        allotmentDate: departureDate,
        status: 'ACTIVE',
      },
    });
    expect(activeHolds.length).toBe(1);

    const allotment = await prisma.allotment.findUniqueOrThrow({
      where: {
        inventoryItemId_date: {
          inventoryItemId: tourItemId,
          date: departureDate,
        },
      },
    });
    expect(allotment.booked).toBe(0);
  }, 60000);

  it('captures the single winning hold and increments booked to 1', async () => {
    const winningHold = await prisma.inventoryHold.findFirstOrThrow({
      where: {
        inventoryItemId: tourItemId,
        allotmentDate: departureDate,
        status: 'ACTIVE',
      },
    });

    const captureRes = await InventoryEngine.captureHold(winningHold.token);
    expect(captureRes.success).toBe(true);

    const updatedAllotment = await prisma.allotment.findUniqueOrThrow({
      where: {
        inventoryItemId_date: {
          inventoryItemId: tourItemId,
          date: departureDate,
        },
      },
    });
    expect(updatedAllotment.booked).toBe(1);
  });
});
