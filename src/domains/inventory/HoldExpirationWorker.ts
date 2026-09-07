import { prisma } from '@/lib/prisma';
import { InventoryHoldStateMachine } from './hold-state-machine';

export interface HoldSweepOptions {
  workerId?: string;
  batchSize?: number;
  maxAgeMinutes?: number;
}

export interface HoldSweepReport {
  sweptCount: number;
  activeRemaining: number;
  durationMs: number;
  workerId: string;
  error?: string;
}

export interface IHoldExpirationWorker {
  runSweep(options?: HoldSweepOptions | string): Promise<HoldSweepReport>;
}

export class HoldExpirationWorker implements IHoldExpirationWorker {
  private static instance: HoldExpirationWorker;
  private isRunning = false;

  static getInstance(): HoldExpirationWorker {
    if (!this.instance) {
      this.instance = new HoldExpirationWorker();
    }
    return this.instance;
  }

  /**
   * Run a sweep cycle to expire stale active inventory holds (INV-104)
   * Contract enforces atomic execution, idempotency, and state machine transition integrity.
   */
  async runSweep(options?: HoldSweepOptions | string): Promise<HoldSweepReport> {
    const opts: HoldSweepOptions =
      typeof options === 'string'
        ? { workerId: options }
        : options || {};

    const workerId = opts.workerId || `worker_sweep_${Date.now().toString(36)}`;
    const batchSize = opts.batchSize || 200;

    if (this.isRunning) {
      return {
        sweptCount: 0,
        activeRemaining: 0,
        durationMs: 0,
        workerId,
        error: 'Sweep cycle already in progress on this worker instance',
      };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      const now = new Date();

      // Find candidate active expired holds
      const expiredHolds = await prisma.inventoryHold.findMany({
        where: {
          status: 'ACTIVE',
          expiresAt: { lte: now },
        },
        select: { id: true, token: true, status: true },
        take: batchSize,
      });

      let sweptCount = 0;
      if (expiredHolds.length > 0) {
        // Assert state machine transition validity (INV-103)
        InventoryHoldStateMachine.assertTransition('ACTIVE', 'EXPIRED');

        const holdIds = expiredHolds.map((h) => h.id);
        const result = await prisma.inventoryHold.updateMany({
          where: {
            id: { in: holdIds },
            status: 'ACTIVE',
            expiresAt: { lte: now },
          },
          data: {
            status: 'EXPIRED',
          },
        });
        sweptCount = result.count;
      }

      const activeRemaining = await prisma.inventoryHold.count({
        where: {
          status: 'ACTIVE',
          expiresAt: { gt: now },
        },
      });

      const durationMs = Date.now() - startTime;

      if (sweptCount > 0) {
        console.log(`[HoldExpirationWorker:${workerId}] Released ${sweptCount} expired holds in ${durationMs}ms`);
      }

      return {
        sweptCount,
        activeRemaining,
        durationMs,
        workerId,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[HoldExpirationWorker:${workerId}] Error during sweep:`, errMsg);
      return {
        sweptCount: 0,
        activeRemaining: 0,
        durationMs: Date.now() - startTime,
        workerId,
        error: errMsg,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Static helper for backward compatibility with existing callers
   */
  static async runSweep(workerId?: string): Promise<HoldSweepReport> {
    return this.getInstance().runSweep(workerId);
  }
}
