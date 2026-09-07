import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { InventoryEngine } from './InventoryEngine';
import { InventoryHoldStateMachine } from './hold-state-machine';
import { prisma } from '@/lib/prisma';

describe('Wave 4: Inventory Capture / Release Race Suite (INV-106)', () => {
  const suffix = `race_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const supplierId = `sup_${suffix}`;
  const itemId = `item_${suffix}`;
  const testDate = '2026-11-25';

  beforeAll(async () => {
    await prisma.supplier.create({
      data: {
        id: supplierId,
        name: `Supplier Race ${suffix}`,
        type: 'HOTEL',
      },
    });

    await prisma.inventoryItem.create({
      data: {
        id: itemId,
        supplierId,
        type: 'HOTEL_ROOM',
        code: `RACE_${suffix}`,
        name: `Race Suite ${suffix}`,
        basePrice: 5_000_000,
        currency: 'IRR',
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.inventoryHold.deleteMany({ where: { inventoryItemId: itemId } });
      await prisma.allotment.deleteMany({ where: { inventoryItemId: itemId } });
      await prisma.inventoryItem.deleteMany({ where: { id: itemId } });
      await prisma.supplier.deleteMany({ where: { id: supplierId } });
      await prisma.$disconnect();
    } catch (e) {
      console.error('Race test cleanup error:', e);
    }
  }, 60000);

  it('INV-106: Simultaneous concurrent capture vs release on same hold settles into exact deterministic state', async () => {
    const raceDate = `${testDate}_single`;
    await prisma.allotment.create({
      data: {
        inventoryItemId: itemId,
        date: raceDate,
        total: 1,
        booked: 0,
        stopSell: false,
      },
    });

    const hold = await InventoryEngine.createHold({
      inventoryItemId: itemId,
      date: raceDate,
      quantity: 1,
      ttlMinutes: 10,
    });
    expect(hold.success).toBe(true);
    const token = hold.token!;

    // Launch simultaneous capture and release racing against each other
    const [captureRes, releaseRes] = await Promise.all([
      InventoryEngine.captureHold(token),
      InventoryEngine.releaseHold(token),
    ]);

    expect(captureRes.success || releaseRes.success).toBe(true);

    // Verify DB invariant:
    const finalHold = await prisma.inventoryHold.findUniqueOrThrow({ where: { token } });
    const finalAllotment = await prisma.allotment.findUniqueOrThrow({
      where: { inventoryItemId_date: { inventoryItemId: itemId, date: raceDate } },
    });

    expect(['CAPTURED', 'RELEASED']).toContain(finalHold.status);

    if (finalHold.status === 'CAPTURED') {
      // If capture won the race, booked must be exactly 1
      expect(finalAllotment.booked).toBe(1);
    } else {
      // If release won the race, booked must be 0
      expect(finalAllotment.booked).toBe(0);
    }
  });

  it('INV-106: 10 holds racing concurrent captures and releases maintain strict allotment booking balance', async () => {
    const multiDate = `${testDate}_multi`;
    const capacity = 10;

    await prisma.allotment.create({
      data: {
        inventoryItemId: itemId,
        date: multiDate,
        total: capacity,
        booked: 0,
        stopSell: false,
      },
    });

    // Create 10 holds
    const tokens: string[] = [];
    for (let i = 0; i < capacity; i++) {
      const h = await InventoryEngine.createHold({
        inventoryItemId: itemId,
        date: multiDate,
        quantity: 1,
        ttlMinutes: 10,
      });
      expect(h.success).toBe(true);
      tokens.push(h.token!);
    }

    // Race capture vs release on each of the 10 holds simultaneously (20 total operations)
    const raceOps = tokens.flatMap((t) => [
      InventoryEngine.captureHold(t),
      InventoryEngine.releaseHold(t),
    ]);

    await Promise.all(raceOps);

    // Invariant: The count of CAPTURED holds must match the booked count on the allotment
    const capturedHolds = await prisma.inventoryHold.count({
      where: { inventoryItemId: itemId, allotmentDate: multiDate, status: 'CAPTURED' },
    });
    const releasedHolds = await prisma.inventoryHold.count({
      where: { inventoryItemId: itemId, allotmentDate: multiDate, status: 'RELEASED' },
    });

    expect(capturedHolds + releasedHolds).toBe(capacity);

    const allotment = await prisma.allotment.findUniqueOrThrow({
      where: { inventoryItemId_date: { inventoryItemId: itemId, date: multiDate } },
    });

    expect(allotment.booked).toBe(capturedHolds);
    expect(allotment.booked).toBeLessThanOrEqual(capacity);
    expect(allotment.booked).toBeGreaterThanOrEqual(0);
  }, 45000);

  it('INV-106: Compensation of captured hold restores capacity exactly once under concurrent compensation calls', async () => {
    const compDate = `${testDate}_comp`;
    await prisma.allotment.create({
      data: {
        inventoryItemId: itemId,
        date: compDate,
        total: 2,
        booked: 0,
      },
    });

    const hold = await InventoryEngine.createHold({
      inventoryItemId: itemId,
      date: compDate,
      quantity: 1,
      ttlMinutes: 10,
    });
    const token = hold.token!;

    // First capture
    await InventoryEngine.captureHold(token);

    const afterCapture = await prisma.allotment.findUniqueOrThrow({
      where: { inventoryItemId_date: { inventoryItemId: itemId, date: compDate } },
    });
    expect(afterCapture.booked).toBe(1);

    // Fire 5 concurrent compensations on the same captured hold
    const compPromises = Array.from({ length: 5 }, () =>
      InventoryEngine.compensateCapturedHold(token)
    );

    const compResults = await Promise.all(compPromises);

    // Exactly one call restores capacity, others are idempotent
    const restoredCount = compResults.filter((r) => r.capacityRestored).length;
    expect(restoredCount).toBe(1);

    for (const r of compResults) {
      expect(r.success).toBe(true);
    }

    // Booked capacity must be restored back to 0 (never negative)
    const afterComp = await prisma.allotment.findUniqueOrThrow({
      where: { inventoryItemId_date: { inventoryItemId: itemId, date: compDate } },
    });
    expect(afterComp.booked).toBe(0);

    const finalHold = await prisma.inventoryHold.findUniqueOrThrow({ where: { token } });
    expect(finalHold.status).toBe('RELEASED');
  });

  it('INV-103: Hold state machine validates legal and blocks illegal transitions', () => {
    // Legal transitions
    expect(InventoryHoldStateMachine.canTransition('ACTIVE', 'CAPTURED')).toBe(true);
    expect(InventoryHoldStateMachine.canTransition('ACTIVE', 'RELEASED')).toBe(true);
    expect(InventoryHoldStateMachine.canTransition('ACTIVE', 'EXPIRED')).toBe(true);
    expect(InventoryHoldStateMachine.canTransition('CAPTURED', 'RELEASED')).toBe(true);

    // Illegal transitions
    expect(InventoryHoldStateMachine.canTransition('RELEASED', 'CAPTURED')).toBe(false);
    expect(InventoryHoldStateMachine.canTransition('RELEASED', 'ACTIVE')).toBe(false);
    expect(InventoryHoldStateMachine.canTransition('EXPIRED', 'CAPTURED')).toBe(false);
    expect(InventoryHoldStateMachine.canTransition('EXPIRED', 'ACTIVE')).toBe(false);
    expect(InventoryHoldStateMachine.canTransition('CAPTURED', 'ACTIVE')).toBe(false);

    expect(() => InventoryHoldStateMachine.assertTransition('RELEASED', 'CAPTURED')).toThrow(
      /Invalid inventory hold state transition/i
    );
  });
});
