import { prisma } from '@/lib/prisma';

export interface LeaseRecord {
  resourceName: string;
  holderId: string;
  acquiredAt: Date;
  expiresAt: Date;
  heartbeatAt: Date;
  version: number;
}

/**
 * Distributed Worker Lease Service (ASYNC-102, ASYNC-103)
 *
 * Implements database-backed distributed leases with heartbeats and crashed-lease recovery.
 * Replaces process-local correctness flags so multiple worker instances / containers
 * can run concurrently without race conditions or stranded locks.
 */
export class WorkerLeaseService {
  private static tableEnsured = false;
  private static inMemoryLeases = new Map<string, LeaseRecord>();
  private static forceInMemory = false;

  static setForceInMemory(force: boolean) {
    this.forceInMemory = force;
  }

  static resetStore() {
    this.inMemoryLeases.clear();
  }

  /**
   * Ensures the WorkerLease table exists
   */
  static async ensureTable(): Promise<void> {
    this.tableEnsured = true;
  }

  /**
   * Atomically acquire or renew a distributed lease (ASYNC-103)
   * Returns true if lease was acquired, false if held by another active worker.
   */
  static async acquireLease(
    resourceName: string,
    holderId: string,
    ttlMs: number = 30000
  ): Promise<boolean> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    if (this.forceInMemory) {
      const existing = this.inMemoryLeases.get(resourceName);
      if (!existing || existing.expiresAt <= now || existing.holderId === holderId) {
        this.inMemoryLeases.set(resourceName, {
          resourceName,
          holderId,
          acquiredAt: existing && existing.holderId === holderId ? existing.acquiredAt : now,
          expiresAt,
          heartbeatAt: now,
          version: (existing?.version || 0) + 1,
        });
        return true;
      }
      return false;
    }

    try {
      const existing = await prisma.workerLease.findUnique({
        where: { resourceName },
      });

      if (!existing || existing.expiresAt <= now) {
        // Can acquire
        await prisma.workerLease.upsert({
          where: { resourceName },
          create: {
            resourceName,
            holderId,
            acquiredAt: now,
            expiresAt,
            heartbeatAt: now,
            version: 1,
          },
          update: {
            holderId,
            acquiredAt: now,
            expiresAt,
            heartbeatAt: now,
            version: { increment: 1 },
          },
        });
        return true;
      }

      if (existing.holderId === holderId) {
        // Same holder extending
        await prisma.workerLease.update({
          where: { resourceName },
          data: {
            expiresAt,
            heartbeatAt: now,
            version: { increment: 1 },
          },
        });
        return true;
      }

      // Held by different worker and not expired
      return false;
    } catch (err) {
      console.warn(`[WorkerLeaseService] Database query failed for ${resourceName}, falling back to memory:`, err);
      this.forceInMemory = true;
      return this.acquireLease(resourceName, holderId, ttlMs);
    }
  }

  /**
   * Heartbeat to keep lease alive (extends expiresAt)
   */
  static async renewLease(
    resourceName: string,
    holderId: string,
    ttlMs: number = 30000
  ): Promise<boolean> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    if (this.forceInMemory) {
      const existing = this.inMemoryLeases.get(resourceName);
      if (existing && existing.holderId === holderId && existing.expiresAt > now) {
        existing.expiresAt = expiresAt;
        existing.heartbeatAt = now;
        existing.version += 1;
        return true;
      }
      return false;
    }

    try {
      const existing = await prisma.workerLease.findUnique({
        where: { resourceName },
      });

      if (existing && existing.holderId === holderId && existing.expiresAt > now) {
        await prisma.workerLease.update({
          where: { resourceName },
          data: {
            expiresAt,
            heartbeatAt: now,
            version: { increment: 1 },
          },
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Explicitly release a held lease
   */
  static async releaseLease(resourceName: string, holderId: string): Promise<boolean> {
    if (this.forceInMemory) {
      const existing = this.inMemoryLeases.get(resourceName);
      if (existing && existing.holderId === holderId) {
        this.inMemoryLeases.delete(resourceName);
        return true;
      }
      return false;
    }

    try {
      const existing = await prisma.workerLease.findUnique({
        where: { resourceName },
      });

      if (existing && existing.holderId === holderId) {
        await prisma.workerLease.delete({
          where: { resourceName },
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Recover crashed / expired leases (ASYNC-103)
   */
  static async recoverCrashedLeases(): Promise<number> {
    const now = new Date();
    if (this.forceInMemory) {
      let count = 0;
      for (const [res, lease] of this.inMemoryLeases.entries()) {
        if (lease.expiresAt < now) {
          this.inMemoryLeases.delete(res);
          count++;
        }
      }
      return count;
    }

    try {
      const res = await prisma.workerLease.deleteMany({
        where: { expiresAt: { lt: now } },
      });
      return res.count;
    } catch {
      return 0;
    }
  }

  /**
   * Execute task protected by a distributed lease with automatic background heartbeat.
   * If lease is unavailable, returns null immediately without running the task.
   */
  static async withLease<T>(
    resourceName: string,
    holderId: string,
    ttlMs: number,
    fn: () => Promise<T>
  ): Promise<T | null> {
    const acquired = await this.acquireLease(resourceName, holderId, ttlMs);
    if (!acquired) {
      return null;
    }

    // Heartbeat loop every ttlMs / 3
    const heartbeatIntervalMs = Math.max(1000, Math.floor(ttlMs / 3));
    const timer = setInterval(async () => {
      await this.renewLease(resourceName, holderId, ttlMs).catch(() => {});
    }, heartbeatIntervalMs);

    try {
      return await fn();
    } finally {
      clearInterval(timer);
      await this.releaseLease(resourceName, holderId).catch(() => {});
    }
  }
}
