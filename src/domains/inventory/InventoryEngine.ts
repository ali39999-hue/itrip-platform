import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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
   * Atomic Hold Creation without overselling
   */
  static async createHold(
    params: CreateHoldParams,
    tx?: Prisma.TransactionClient
  ): Promise<HoldResult> {
    const ttl = params.ttlMinutes || 10;
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000);
    const token = `hld_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    const execute = async (client: Prisma.TransactionClient): Promise<HoldResult> => {
      // 1. Fetch allotment to check constraints
      const allotment = await client.allotment.findUnique({
        where: {
          inventoryItemId_date: {
            inventoryItemId: params.inventoryItemId,
            date: params.date,
          },
        },
      });

      if (!allotment) {
        return { success: false, error: 'Allotment not found (ON_REQUEST)' };
      }

      if (allotment.stopSell) {
        return { success: false, error: 'Stop-sell active for this date' };
      }

      // 2. Atomic Hold Creation: We rely on the DB's transactional guarantees for isolation.
      // SQLite enforces serializable transactions.
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
        return { success: false, error: 'Insufficient inventory available' };
      }

      // 3. Create the hold record
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
    
    // Auto-retry on database locked (P1008/busy)
    let retries = 5;
    while (retries > 0) {
      try {
        return await prisma.$transaction(execute, {
          maxWait: 15000,
          timeout: 20000,
        });
      } catch (err: unknown) {
        retries--;
        const isLockError = (err as { code?: string })?.code === 'P1008' || String(err).includes('timed out');
        if (isLockError && retries > 0) {
          await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));
          continue;
        }
        throw err;
      }
    }
    return { success: false, error: 'Database busy' };
  }

  /**
   * Capture a valid hold when booking is confirmed
   */
  static async captureHold(
    token: string,
    tx?: Prisma.TransactionClient
  ): Promise<{ success: boolean; error?: string }> {
    const execute = async (client: Prisma.TransactionClient) => {
      const hold = await client.inventoryHold.findUnique({
        where: { token },
      });

      if (!hold) return { success: false, error: 'Hold not found' };
      if (hold.status !== 'ACTIVE') return { success: false, error: `Hold already ${hold.status}` };
      if (new Date() > hold.expiresAt) return { success: false, error: 'Hold expired' };

      // Mark hold captured and atomically verify capacity
      const allotment = await client.allotment.findUnique({
        where: {
          inventoryItemId_date: {
            inventoryItemId: hold.inventoryItemId,
            date: hold.allotmentDate,
          },
        },
      });

      if (!allotment || (allotment.total - allotment.booked < hold.quantity)) {
        return { success: false, error: 'Insufficient capacity to capture hold (Oversell prevented)' };
      }

      await client.inventoryHold.update({
        where: { id: hold.id },
        data: { status: 'CAPTURED' },
      });

      // Increment booked quantity in allotment
      await client.allotment.update({
        where: {
          inventoryItemId_date: {
            inventoryItemId: hold.inventoryItemId,
            date: hold.allotmentDate,
          },
        },
        data: {
          booked: { increment: hold.quantity },
        },
      });

      return { success: true };
    };

    if (tx) return execute(tx);
    return prisma.$transaction(execute, {
      maxWait: 15000,
      timeout: 20000,
    });
  }

  /**
   * Release hold upon cancellation or TTL expiry
   */
  static async releaseHold(
    token: string,
    tx?: Prisma.TransactionClient
  ): Promise<{ success: boolean }> {
    const client = tx || prisma;
    await client.inventoryHold.updateMany({
      where: { token, status: 'ACTIVE' },
      data: { status: 'RELEASED' },
    });
    return { success: true };
  }

  /**
   * Sweeper worker to expire stale holds
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
}
