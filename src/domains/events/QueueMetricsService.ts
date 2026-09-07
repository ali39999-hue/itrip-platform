import { prisma } from '@/lib/prisma';

export interface QueueMetricsSnapshot {
  timestamp: Date;
  depth: number; // Pending count
  processingCount: number;
  dlqCount: number; // Dead letter count
  processedCount: number;
  eventsWithRetries: number;
  oldestPendingAgeSeconds: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  healthy: boolean;
  breakdownByType: Record<string, { pending: number; processing: number; processed: number; deadLetter: number }>;
}

export class QueueMetricsService {
  /**
   * Calculate real-time queue metrics across Outbox events (ASYNC-108)
   */
  static async getQueueMetrics(): Promise<QueueMetricsSnapshot> {
    const now = new Date();

    // 1. Group counts by status and eventType
    const grouped = await prisma.outboxEvent.groupBy({
      by: ['status', 'eventType'],
      _count: { _all: true },
    });

    let depth = 0;
    let processingCount = 0;
    let dlqCount = 0;
    let processedCount = 0;
    const breakdownByType: Record<string, { pending: number; processing: number; processed: number; deadLetter: number }> = {};

    for (const row of grouped) {
      const type = row.eventType || 'UNKNOWN';
      if (!breakdownByType[type]) {
        breakdownByType[type] = { pending: 0, processing: 0, processed: 0, deadLetter: 0 };
      }

      const count = row._count._all;
      switch (row.status) {
        case 'PENDING':
          depth += count;
          breakdownByType[type].pending += count;
          break;
        case 'PROCESSING':
          processingCount += count;
          breakdownByType[type].processing += count;
          break;
        case 'DEAD_LETTER':
          dlqCount += count;
          breakdownByType[type].deadLetter += count;
          break;
        case 'PROCESSED':
          processedCount += count;
          breakdownByType[type].processed += count;
          break;
      }
    }

    // 2. Count events that experienced retries
    const eventsWithRetries = await prisma.outboxEvent.count({
      where: { retryCount: { gt: 0 } },
    });

    // 3. Oldest pending event age
    const oldestPending = await prisma.outboxEvent.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    const oldestPendingAgeSeconds = oldestPending
      ? Math.max(0, Math.floor((now.getTime() - oldestPending.createdAt.getTime()) / 1000))
      : 0;

    // 4. Processing latency sample (from createdAt to processedAt for recently processed events)
    const recentProcessed = await prisma.outboxEvent.findMany({
      where: { status: 'PROCESSED', processedAt: { not: null } },
      orderBy: { processedAt: 'desc' },
      take: 100,
      select: { createdAt: true, processedAt: true },
    });

    const latencies = recentProcessed
      .map((e) => (e.processedAt ? e.processedAt.getTime() - e.createdAt.getTime() : 0))
      .filter((l) => l >= 0)
      .sort((a, b) => a - b);

    const p50LatencyMs = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;
    const p95LatencyMs = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;

    // 5. Health evaluation: healthy if DLQ <= 5 and oldest pending event is < 5 minutes old
    const healthy = dlqCount <= 5 && oldestPendingAgeSeconds < 300;

    return {
      timestamp: now,
      depth,
      processingCount,
      dlqCount,
      processedCount,
      eventsWithRetries,
      oldestPendingAgeSeconds,
      p50LatencyMs,
      p95LatencyMs,
      healthy,
      breakdownByType,
    };
  }
}
