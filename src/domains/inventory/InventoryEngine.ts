import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import { InventoryHoldStateMachine, InventoryHoldStatus } from './hold-state-machine';

export interface CreateHoldParams {
  inventoryItemId: string;
  date: string; // YYYY-MM-DD
  quantity: number;
  ttlMinutes?: number;
  bookingId?: string;
}

export interface HoldResult {
  success: boolean;
  token?: string;
  expiresAt?: Date;
  error?: string;
}

export class InventoryEngine {
  /**
   * Atomic Hold Creation with PostgreSQL Concurrency Control (INV-001)
   * Prevents oversell under extreme concurrency (oversell = 0 invariant).
   */
  static async createHold(
    params: CreateHoldParams,
    tx?: Prisma.TransactionClient
  ): Promise<HoldResult> {
    const ttl = params.ttlMinutes || 10;
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000);
    const token = `hld_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;

    const execute = async (client: Prisma.TransactionClient): Promise<HoldResult> => {
      // 1. Lock the allotment row FOR UPDATE to prevent race conditions
      const rows: Array<{ id: string; total: number; booked: number; stopSell: boolean }> =
        await client.$queryRaw`
          SELECT id, total, booked, "stopSell"
          FROM "Allotment"
          WHERE "inventoryItemId" = ${params.inventoryItemId} AND date = ${params.date}
          FOR UPDATE
        `;

      const allotment = rows[0];

      if (!allotment) {
        return { success: false, error: 'Allotment not found (ON_REQUEST)' };
      }

      if (allotment.stopSell) {
        return { success: false, error: 'Stop-sell active for this date' };
      }

      // 2. Aggregate active non-expired holds for this allotment
      const now = new Date();
      const activeHolds = await client.inventoryHold.aggregate({
        where: {
          inventoryItemId: params.inventoryItemId,
          allotmentDate: params.date,
          status: 'ACTIVE',
          expiresAt: { gt: now },
        },
        _sum: { quantity: true },
      });

      const heldQty = activeHolds._sum.quantity || 0;
      const available = allotment.total - allotment.booked - heldQty;

      if (available < params.quantity) {
        return { success: false, error: 'Insufficient inventory available (Oversell prevented)' };
      }

      // 3. Persist the hold record
      await client.inventoryHold.create({
        data: {
          inventoryItemId: params.inventoryItemId,
          allotmentDate: params.date,
          token,
          quantity: params.quantity,
          bookingId: params.bookingId,
          expiresAt,
          status: 'ACTIVE',
        },
      });

      return {
        success: true,
        token,
        expiresAt,
      };
    };

    if (tx) {
      return execute(tx);
    }

    // Auto-retry with backoff on serialization failure or lock contention
    let retries = 5;
    while (retries > 0) {
      try {
        return await prisma.$transaction(execute, {
          maxWait: 15000,
          timeout: 25000,
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        });
      } catch (err: unknown) {
        retries--;
        const isLockError =
          (err as { code?: string })?.code === 'P2034' ||
          (err as { code?: string })?.code === 'P1008' ||
          String(err).includes('could not serialize') ||
          String(err).includes('deadlock') ||
          String(err).includes('timed out');
        if (isLockError && retries > 0) {
          await new Promise((r) => setTimeout(r, 20 + Math.random() * 50));
          continue;
        }
        throw err;
      }
    }
    return { success: false, error: 'Database concurrency timeout' };
  }

  /**
   * Concurrency-safe Hold Capture (INV-002)
   * Duplicate capture returns idempotent success without double booking allotment.
   */
  static async captureHold(
    token: string,
    tx?: Prisma.TransactionClient
  ): Promise<{ success: boolean; error?: string }> {
    const execute = async (client: Prisma.TransactionClient) => {
      // Find and lock the hold record FOR UPDATE so concurrent captures on the same hold serialize
      const holds: Array<{
        id: string;
        inventoryItemId: string;
        allotmentDate: string;
        token: string;
        quantity: number;
        status: string;
        expiresAt: Date;
      }> = await client.$queryRaw`
        SELECT id, "inventoryItemId", "allotmentDate", token, quantity, status, "expiresAt"
        FROM "InventoryHold"
        WHERE token = ${token}
        FOR UPDATE
      `;

      const hold = holds[0];

      if (!hold) return { success: false, error: 'Hold not found' };

      // Duplicate capture idempotency: already CAPTURED returns true
      if (hold.status === 'CAPTURED') {
        return { success: true };
      }

      if (hold.status === 'RELEASED' || hold.status === 'EXPIRED') {
        return { success: false, error: `Cannot capture hold in ${hold.status} status` };
      }

      InventoryHoldStateMachine.assertTransition(hold.status as InventoryHoldStatus, 'CAPTURED');

      if (new Date() > new Date(hold.expiresAt)) {
        return { success: false, error: 'Hold expired' };
      }

      // Atomic conditional update on allotment: booked + quantity <= total (Section 6)
      const updateCount: number = await client.$executeRaw`
        UPDATE "Allotment"
        SET booked = booked + ${hold.quantity}
        WHERE "inventoryItemId" = ${hold.inventoryItemId}
          AND date = ${hold.allotmentDate}
          AND (booked + ${hold.quantity}) <= total
      `;

      if (updateCount === 0) {
        return { success: false, error: 'Insufficient capacity to capture hold (Oversell prevented)' };
      }

      // Mark hold captured
      await client.inventoryHold.update({
        where: { id: hold.id },
        data: { status: 'CAPTURED' },
      });

      return { success: true };
    };

    if (tx) return execute(tx);
    return prisma.$transaction(execute, {
      maxWait: 15000,
      timeout: 25000,
    });
  }

  /**
   * Release hold upon cancellation or TTL expiry (INV-002, INV-103)
   * Idempotent: duplicate release is safe and state machine transitions are enforced.
   */
  static async releaseHold(
    token: string,
    tx?: Prisma.TransactionClient
  ): Promise<{ success: boolean; error?: string }> {
    const execute = async (client: Prisma.TransactionClient) => {
      const holds: Array<{
        id: string;
        status: InventoryHoldStatus;
      }> = await client.$queryRaw`
        SELECT id, status
        FROM "InventoryHold"
        WHERE token = ${token}
        FOR UPDATE
      `;

      const hold = holds[0];
      if (!hold) return { success: true };
      if (hold.status === 'RELEASED' || hold.status === 'EXPIRED') {
        return { success: true };
      }

      // If hold is already CAPTURED, cannot release via releaseHold without allotment compensation
      if (hold.status === 'CAPTURED') {
        return { success: false, error: 'Cannot release CAPTURED hold via releaseHold; use compensateCapturedHold' };
      }

      InventoryHoldStateMachine.assertTransition(hold.status, 'RELEASED');

      await client.inventoryHold.update({
        where: { id: hold.id },
        data: { status: 'RELEASED' },
      });
      return { success: true };
    };

    if (tx) return execute(tx);
    return prisma.$transaction(execute, {
      maxWait: 15000,
      timeout: 25000,
    });
  }

  /**
   * Links an existing hold token to a bookingId through the engine (INV-101)
   */
  static async linkHoldToBooking(
    token: string,
    bookingId: string,
    tx?: Prisma.TransactionClient
  ): Promise<boolean> {
    const client = tx || prisma;
    const res = await client.inventoryHold.updateMany({
      where: { token },
      data: { bookingId },
    });
    return res.count > 0;
  }

  /**
   * Bulk creates allotments through the engine enforcing capacity invariants (INV-101)
   */
  static async createAllotments(
    allotments: Array<{
      inventoryItemId: string;
      date: string;
      total: number;
      booked?: number;
      stopSell?: boolean;
    }>,
    tx?: Prisma.TransactionClient
  ): Promise<{ count: number }> {
    const client = tx || prisma;
    for (const a of allotments) {
      if ((a.booked || 0) > a.total) {
        throw new Error(`Invalid allotment: booked (${a.booked}) cannot exceed total capacity (${a.total})`);
      }
    }
    return client.allotment.createMany({
      data: allotments.map((a) => ({
        inventoryItemId: a.inventoryItemId,
        date: a.date,
        total: a.total,
        booked: a.booked || 0,
        stopSell: a.stopSell || false,
      })),
    });
  }

  /**
   * Sweeper worker to expire stale holds (INV-003)
   */
  static async sweepExpiredHolds(): Promise<number> {
    const now = new Date();
    const result = await prisma.inventoryHold.updateMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lte: now },
      },
      data: { status: 'EXPIRED' },
    });
    return result.count;
  }

  /**
   * Admin allotment policy update (INV-004/INV-005).
   * All Allotment mutations must flow through the engine: this locks the row
   * FOR UPDATE and enforces the capacity invariant — `total` can never drop
   * below what is already `booked` (that would fabricate negative availability).
   */
  static async setAllotmentPolicy(
    id: string,
    policy: { total?: number; stopSell?: boolean },
    tx?: Prisma.TransactionClient
  ): Promise<{ success: boolean; error?: string }> {
    const client = tx || prisma;

    const rows: Array<{ id: string; total: number; booked: number; stopSell: boolean }> =
      await client.$queryRaw`
        SELECT id, total, booked, "stopSell"
        FROM "Allotment"
        WHERE id = ${id}
        FOR UPDATE
      `;

    const allotment = rows[0];
    if (!allotment) return { success: false, error: 'Allotment not found' };

    if (policy.total !== undefined && policy.total < allotment.booked) {
      return {
        success: false,
        error: `Cannot set total (${policy.total}) below already-booked capacity (${allotment.booked})`,
      };
    }

    await client.allotment.update({
      where: { id: allotment.id },
      data: {
        ...(policy.total !== undefined ? { total: policy.total } : {}),
        ...(policy.stopSell !== undefined ? { stopSell: policy.stopSell } : {}),
      },
    });

    return { success: true };
  }

  /**
   * Compensation path for captured holds (INV-010, saga/refund compensation).
   * Restores capacity consumed by a CAPTURED hold exactly once; releasing an
   * ACTIVE hold never touches the allotment (capacity was not consumed).
   * Idempotent: already-released/expired holds return success without effects.
   */
  static async compensateCapturedHold(
    token: string,
    tx?: Prisma.TransactionClient
  ): Promise<{ success: boolean; capacityRestored: boolean; error?: string }> {
    const execute = async (client: Prisma.TransactionClient): Promise<{ success: boolean; capacityRestored: boolean; error?: string }> => {
      const holds: Array<{
        id: string;
        inventoryItemId: string;
        allotmentDate: string;
        quantity: number;
        status: string;
      }> = await client.$queryRaw`
        SELECT id, "inventoryItemId", "allotmentDate", quantity, status
        FROM "InventoryHold"
        WHERE token = ${token}
        FOR UPDATE
      `;

      const hold = holds[0];
      if (!hold) return { success: false, capacityRestored: false, error: 'Hold not found' };

      if (hold.status === 'RELEASED' || hold.status === 'EXPIRED') {
        return { success: true, capacityRestored: false };
      }

      if (hold.status === 'CAPTURED') {
        InventoryHoldStateMachine.assertTransition('CAPTURED', 'RELEASED');
        // Guarded decrement: only fires while booked >= quantity, so repeated
        // compensation can never push booked negative (double-release safety).
        const restoredCount: number = await client.$executeRaw`
          UPDATE "Allotment"
          SET booked = booked - ${hold.quantity}
          WHERE "inventoryItemId" = ${hold.inventoryItemId}
            AND date = ${hold.allotmentDate}
            AND booked >= ${hold.quantity}
        `;
        if (restoredCount === 0) {
          return { success: false, capacityRestored: false, error: 'Allotment booked counter below hold quantity — capacity not restored' };
        }
        await client.inventoryHold.update({
          where: { id: hold.id },
          data: { status: 'RELEASED' },
        });
        return { success: true, capacityRestored: true };
      }

      // ACTIVE hold: nothing consumed yet — just mark released.
      InventoryHoldStateMachine.assertTransition('ACTIVE', 'RELEASED');
      await client.inventoryHold.update({
        where: { id: hold.id },
        data: { status: 'RELEASED' },
      });
      return { success: true, capacityRestored: false };
    };

    if (tx) return execute(tx);
    return prisma.$transaction(execute, {
      maxWait: 15000,
      timeout: 25000,
    });
  }
}
