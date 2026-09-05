import { prisma } from '@/lib/prisma';

export interface HoldSweepReport {
  sweptCount: number;
  activeRemaining: number;
  durationMs: number;
  workerId: string;
  error?: string;
}

export class HoldExpirationWorker {
  private static isRunning = false;

  /**
   * Run a sweep cycle to transition expired active holds to EXPIRED status (INV-003)
   * Safe under concurrent execution and process restart.
   */
  static async runSweep(workerId: string = `worker_sweep_${Date.now().toString(36)}`): Promise<HoldSweepReport> {
    if (this.isRunning) {
      return {
        sweptCount: 0,
        activeRemaining: 0,
        durationMs: 0,
        workerId,
        error: 'Sweep cycle already in progress on this instance',
      };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      const now = new Date();

      // Find and expire stale holds atomically
      const result = await prisma.inventoryHold.updateMany({
        where: {
          status: 'ACTIVE',
          expiresAt: { lte: now },
        },
        data: {
          status: 'EXPIRED',
        },
      });

      const remainingActive = await prisma.inventoryHold.count({
        where: {
          status: 'ACTIVE',
          expiresAt: { gt: now },
        },
      });

      const durationMs = Date.now() - startTime;

      if (result.count > 0) {
        console.log(`[HoldExpirationWorker:${workerId}] Released ${result.count} expired holds in ${durationMs}ms`);
      }

      return {
        sweptCount: result.count,
        activeRemaining: remainingActive,
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
}
