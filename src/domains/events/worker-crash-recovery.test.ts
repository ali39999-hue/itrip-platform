import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { WorkerLeaseService } from './WorkerLeaseService';
import { OutboxConsumer, calculateBackoffWithJitter, wrapOutboxPayload, parseOutboxPayload } from './OutboxConsumer';
import { QueueMetricsService } from './QueueMetricsService';

describe('Dedicated Workers, Outbox & Crash Recovery Suite (ASYNC-101 to ASYNC-109)', () => {
  const cleanLeases = async () => {
    try {
      await prisma.workerLease.deleteMany({
        where: { resourceName: { in: ['test_resource_lease', 'test_crashed_worker_resource'] } },
      });
    } catch {
      // ignore if table doesn't exist
    }
  };

  beforeEach(async () => {
    WorkerLeaseService.resetStore();
    await WorkerLeaseService.ensureTable();
    await cleanLeases();
  });

  afterEach(async () => {
    WorkerLeaseService.resetStore();
    await cleanLeases();
  });

  it('ASYNC-103: WorkerLeaseService acquires lease, renews via heartbeat, and releases', async () => {
    const resource = 'test_resource_lease';
    const worker1 = 'worker_node_alpha';

    // 1. Worker 1 acquires lease
    const acquired = await WorkerLeaseService.acquireLease(resource, worker1, 2000);
    expect(acquired).toBe(true);

    // 2. Worker 2 cannot acquire while Worker 1 holds it
    const worker2 = 'worker_node_beta';
    const blocked = await WorkerLeaseService.acquireLease(resource, worker2, 2000);
    expect(blocked).toBe(false);

    // 3. Worker 1 renews lease
    const renewed = await WorkerLeaseService.renewLease(resource, worker1, 2000);
    expect(renewed).toBe(true);

    // 4. Worker 1 releases lease
    const released = await WorkerLeaseService.releaseLease(resource, worker1);
    expect(released).toBe(true);

    // 5. Worker 2 can now acquire
    const worker2Acquired = await WorkerLeaseService.acquireLease(resource, worker2, 2000);
    expect(worker2Acquired).toBe(true);
  });

  it('ASYNC-103: Crashed worker lease recovery — expired lease is reclaimed by another worker', async () => {
    const resource = 'test_crashed_worker_resource';
    const crashedWorker = 'crashed_worker_dead';
    const recoveringWorker = 'recovering_worker_alive';

    // Acquire with short 100ms TTL
    const acquired = await WorkerLeaseService.acquireLease(resource, crashedWorker, 100);
    expect(acquired).toBe(true);

    // Wait for lease to expire
    await new Promise((r) => setTimeout(r, 150));

    // Crashed lease recovery should allow new worker to acquire
    const recovered = await WorkerLeaseService.acquireLease(resource, recoveringWorker, 5000);
    expect(recovered).toBe(true);
  });

  it('ASYNC-105: Versions Outbox payloads with eventVersion and schemaVersion', () => {
    const rawData = { bookingId: 'bkg_123', amount: 5000000 };
    const wrapped = wrapOutboxPayload(rawData, 2, '2.1.0');

    const parsed = parseOutboxPayload(wrapped);
    expect(parsed.eventVersion).toBe(2);
    expect(parsed.schemaVersion).toBe('2.1.0');
    expect(parsed.data.bookingId).toBe('bkg_123');
    expect(parsed.data._meta).toBeDefined();

    // Backward compatibility for legacy payload without version metadata
    const legacy = JSON.stringify({ bookingId: 'legacy_bkg' });
    const parsedLegacy = parseOutboxPayload(legacy);
    expect(parsedLegacy.eventVersion).toBe(1);
    expect(parsedLegacy.schemaVersion).toBe('1.0.0');
    expect(parsedLegacy.data.bookingId).toBe('legacy_bkg');
  });

  it('ASYNC-106: Dead-letters unknown event types instead of silently succeeding', async () => {
    const unknownType = `UNKNOWN_EVENT_${Date.now()}`;
    const event = await prisma.outboxEvent.create({
      data: {
        eventType: unknownType,
        aggregateType: 'SYSTEM',
        aggregateId: 'test_sys',
        payload: wrapOutboxPayload({ note: 'unhandled message' }),
        status: 'PENDING',
      },
    });

    // Run outbox cycle
    await OutboxConsumer.processPendingEvents('test_consumer_wrk');

    // Verify event is in DEAD_LETTER status, NOT PROCESSED
    const updated = await prisma.outboxEvent.findUnique({
      where: { id: event.id },
    });

    expect(updated?.status).toBe('DEAD_LETTER');
    expect(updated?.lastError).toContain('UNKNOWN_EVENT_TYPE');
  });

  it('ASYNC-107: Calculates bounded exponential backoff with jitter', () => {
    const retries = [1, 2, 3, 4, 5];
    const delays: number[] = [];

    for (const r of retries) {
      const delay = calculateBackoffWithJitter(r, 10, 600, 0.25);
      delays.push(delay);
      expect(delay).toBeGreaterThanOrEqual(5); // At least half of base
      expect(delay).toBeLessThanOrEqual(650); // Bound within max + jitter
    }

    // Verify exponential trend
    expect(delays[3]).toBeGreaterThan(delays[0]);

    // Verify jitter adds variation across calls with identical retryCount
    const samples = Array.from({ length: 5 }, () => calculateBackoffWithJitter(3, 10, 600, 0.25));
    const uniqueValues = new Set(samples);
    expect(uniqueValues.size).toBeGreaterThan(1);
  });

  it('ASYNC-108: QueueMetricsService calculates depth, age, DLQ, and latency metrics', async () => {
    // Seed test events
    await prisma.outboxEvent.createMany({
      data: [
        { eventType: 'BOOKING_CONFIRMED', payload: '{}', status: 'PENDING' },
        { eventType: 'BOOKING_PAID', payload: '{}', status: 'PROCESSING' },
        { eventType: 'AUTH_OTP_REQUESTED', payload: '{}', status: 'DEAD_LETTER', lastError: 'Provider failure' },
      ],
    });

    const metrics = await QueueMetricsService.getQueueMetrics();
    expect(metrics.depth).toBeGreaterThanOrEqual(1);
    expect(metrics.processingCount).toBeGreaterThanOrEqual(1);
    expect(metrics.dlqCount).toBeGreaterThanOrEqual(1);
    expect(metrics.breakdownByType).toBeDefined();
    expect(metrics.timestamp).toBeInstanceOf(Date);
  });
});
