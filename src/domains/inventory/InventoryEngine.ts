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
      // 1. Find or create allotment for this date
      let allotment = await client.allotment.findUnique({
        where: {
          inventoryItemId_date: {
            inventoryItemId: params.inventoryItemId,
            date: params.date,
          },
        },
      });

      if (!allotment) {
        allotment = await client.allotment.create({
          data: {
            inventoryItemId: params.inventoryItemId,
            date: params.date,
            total: 10, // default availability allotment
            booked: 0,
            stopSell: false,
          },
        });
      }

      if (allotment.stopSell) {
        return { success: false, error: 'Stop-sell active for this date' };
      }

      // 2. Calculate active holds that haven't expired
      const now = new Date();
      const activeHolds = await client.inventoryHold.findMany({
        where: {
          inventoryItemId: params.inventoryItemId,
          allotmentDate: params.date,
          status: 'ACTIVE',
          expiresAt: { gt: now },
        },
      });

      const heldQty = activeHolds.reduce((sum, h) => sum + h.quantity, 0);
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
    return prisma.$transaction(execute);
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

      // Mark hold captured
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
    return prisma.$transaction(execute);
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
