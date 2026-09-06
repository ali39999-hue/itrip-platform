import { AutoBuyDomainService, type EvaluationResult } from '@/domains/autobuy/AutoBuyDomainService';

export interface AutoBuySweepReport {
  scanned: number;
  executed: number;
  durationMs: number;
  workerId: string;
  results: EvaluationResult[];
  error?: string;
}

export class AutoBuyWorker {
  private static isRunning = false;

  /**
   * Evaluates all active auto-buy rules and triggers purchase when conditions are met.
   * Concurrency-safe against multiple overlapping invocations.
   */
  static async runSweep(workerId: string = `autobuy_worker_${Date.now().toString(36)}`): Promise<AutoBuySweepReport> {
    if (this.isRunning) {
      return {
        scanned: 0,
        executed: 0,
        durationMs: 0,
        workerId,
        results: [],
        error: 'Sweep cycle already in progress on this instance',
      };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      const sweep = await AutoBuyDomainService.runSweep();
      const durationMs = Date.now() - startTime;

      if (sweep.executed > 0) {
        console.log(`[AutoBuyWorker:${workerId}] Processed ${sweep.scanned} rules, executed ${sweep.executed} bookings in ${durationMs}ms`);
      }

      return {
        scanned: sweep.scanned,
        executed: sweep.executed,
        durationMs,
        workerId,
        results: sweep.results,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[AutoBuyWorker:${workerId}] Error during sweep:`, errMsg);
      return {
        scanned: 0,
        executed: 0,
        durationMs: Date.now() - startTime,
        workerId,
        results: [],
        error: errMsg,
      };
    } finally {
      this.isRunning = false;
    }
  }
}
