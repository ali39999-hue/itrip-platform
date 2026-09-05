import { describe, it, expect, afterAll } from 'vitest';
import { InventoryEngine } from './InventoryEngine';
import { HoldExpirationWorker } from '@/workers/hold-expiration-worker';
import { prisma } from '@/lib/prisma';

describe('Inventory Concurrency & Oversell Suite (INV-001 to INV-004)', () => {
  const suffix = `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const supplierId = `sup_${suffix}`;
  const itemId = `item_${suffix}`;
  const testDate = '2026-11-20';

  afterAll(async () => {
    try {
      await prisma.inventoryHold.deleteMany({ where: { inventoryItemId: itemId } });
      await prisma.allotment.deleteMany({ where: { inventoryItemId: itemId } });
      await prisma.inventoryItem.deleteMany({ where: { id: itemId } });
      await prisma.supplier.deleteMany({ where: { id: supplierId } });
    } catch (e) {
      console.error('Cleanup error:', e);
    } finally {
      await prisma.$disconnect();
    }
  }, 60000);

  it('sets up inventory item and allotment with capacity = 1', async () => {
    await prisma.supplier.create({
      data: {
        id: supplierId,
        name: `Supplier ${suffix}`,
        type: 'HOTEL',
      },
    });

    await prisma.inventoryItem.create({
      data: {
        id: itemId,
        supplierId,
        type: 'HOTEL_ROOM',
        code: `RM_${suffix}`,
        name: `Single Suite ${suffix}`,
        basePrice: 10_000_000,
        currency: 'IRR',
      },
    });

    const allotment = await prisma.allotment.create({
      data: {
        inventoryItemId: itemId,
        date: testDate,
        total: 1, // EXACTLY 1 SEAT/ROOM AVAILABLE
        booked: 0,
        stopSell: false,
      },
    });

    expect(allotment.total).toBe(1);
    expect(allotment.booked).toBe(0);
  });

  it('INV-001: 50 concurrent holds against capacity=1 yields EXACTLY 1 success (oversell = 0)', async () => {
    const concurrentHoldCount = 50;

    const holdPromises = Array.from({ length: concurrentHoldCount }, () =>
      InventoryEngine.createHold({
        inventoryItemId: itemId,
        date: testDate,
        quantity: 1,
        ttlMinutes: 10,
      })
    );

    const results = await Promise.all(holdPromises);

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    expect(successful.length).toBe(1);
    expect(failed.length).toBe(concurrentHoldCount - 1);
    expect(successful[0].token).toBeDefined();

    // Verify database invariant: active holds sum is exactly 1, oversell = 0
    const activeHolds = await prisma.inventoryHold.findMany({
      where: { inventoryItemId: itemId, allotmentDate: testDate, status: 'ACTIVE' },
    });
    expect(activeHolds.length).toBe(1);

    const allotment = await prisma.allotment.findUniqueOrThrow({
      where: { inventoryItemId_date: { inventoryItemId: itemId, date: testDate } },
    });
    expect(allotment.booked).toBe(0); // Holds do not increment booked until captured
  }, 60000);

  it('INV-002: Concurrent capture requests on the winning hold are idempotent and increment booked by 1', async () => {
    const activeHold = await prisma.inventoryHold.findFirstOrThrow({
      where: { inventoryItemId: itemId, allotmentDate: testDate, status: 'ACTIVE' },
    });

    // Fire 20 concurrent captures on the same hold token
    const capturePromises = Array.from({ length: 20 }, () =>
      InventoryEngine.captureHold(activeHold.token)
    );

    const captureResults = await Promise.all(capturePromises);

    // All must succeed (first performs capture, rest are idempotent success)
    for (const res of captureResults) {
      expect(res.success).toBe(true);
    }

    // Verify database invariant: booked is exactly 1 (no double booking)
    const allotment = await prisma.allotment.findUniqueOrThrow({
      where: { inventoryItemId_date: { inventoryItemId: itemId, date: testDate } },
    });
    expect(allotment.booked).toBe(1);

    const hold = await prisma.inventoryHold.findUniqueOrThrow({
      where: { id: activeHold.id },
    });
    expect(hold.status).toBe('CAPTURED');
  }, 30000);

  it('INV-003: Hold expiration worker sweeps expired holds while leaving active holds intact', async () => {
    const pastDate = new Date(Date.now() - 60_000); // 1 minute ago
    const futureDate = new Date(Date.now() + 600_000); // 10 minutes in future

    // Create an expired hold manually
    const expiredHold = await prisma.inventoryHold.create({
      data: {
        inventoryItemId: itemId,
        allotmentDate: testDate,
        token: `hld_expired_${suffix}`,
        quantity: 1,
        expiresAt: pastDate,
        status: 'ACTIVE',
      },
    });

    // Create an active future hold
    const validHold = await prisma.inventoryHold.create({
      data: {
        inventoryItemId: itemId,
        allotmentDate: testDate,
        token: `hld_valid_${suffix}`,
        quantity: 1,
        expiresAt: futureDate,
        status: 'ACTIVE',
      },
    });

    // Run expiration worker
    const report = await HoldExpirationWorker.runSweep(`test_worker_${suffix}`);
    expect(report.sweptCount).toBeGreaterThanOrEqual(1);

    // Verify expired hold status transitioned to EXPIRED
    const checkExpired = await prisma.inventoryHold.findUniqueOrThrow({
      where: { id: expiredHold.id },
    });
    expect(checkExpired.status).toBe('EXPIRED');

    // Verify valid future hold is still ACTIVE
    const checkValid = await prisma.inventoryHold.findUniqueOrThrow({
      where: { id: validHold.id },
    });
    expect(checkValid.status).toBe('ACTIVE');

    // Cleanup extra holds
    await prisma.inventoryHold.deleteMany({
      where: { id: { in: [expiredHold.id, validHold.id] } },
    });
  });

  it('INV-002: Duplicate release calls are safe and idempotent', async () => {
    const testHold = await prisma.inventoryHold.create({
      data: {
        inventoryItemId: itemId,
        allotmentDate: testDate,
        token: `hld_rel_${suffix}`,
        quantity: 1,
        expiresAt: new Date(Date.now() + 600_000),
        status: 'ACTIVE',
      },
    });

    const rel1 = await InventoryEngine.releaseHold(testHold.token);
    expect(rel1.success).toBe(true);

    const rel2 = await InventoryEngine.releaseHold(testHold.token);
    expect(rel2.success).toBe(true);

    const updated = await prisma.inventoryHold.findUniqueOrThrow({
      where: { id: testHold.id },
    });
    expect(updated.status).toBe('RELEASED');

    await prisma.inventoryHold.delete({ where: { id: testHold.id } });
  });
});
