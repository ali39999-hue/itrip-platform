/**
 * Dedicated Background Worker Runtime Entrypoint (ASYNC-101)
 *
 * Separates worker loops from the web serving runtime (Next.js server).
 * Runs dedicated loops for Outbox event processing, Saga recovery,
 * Hold expiration, Auto-Buy evaluation, and Queue health metrics.
 *
 * Usage:
 *   npm run worker
 */

import { prisma } from '@/lib/prisma';
import { OutboxConsumer } from '@/domains/events/OutboxConsumer';
import { SagaWorker } from './saga-worker';
import { HoldExpirationWorker } from './hold-expiration-worker';
import { AutoBuyWorker } from './auto-buy-worker';
import { WorkerLeaseService } from '@/domains/events/WorkerLeaseService';
import { QueueMetricsService } from '@/domains/events/QueueMetricsService';
import crypto from 'crypto';

const workerNodeId = `worker_node_${crypto.randomBytes(3).toString('hex')}_${process.pid}`;
let isShuttingDown = false;

console.log(`[WorkerRuntime] Starting dedicated worker process: ${workerNodeId}`);

async function runOutboxCycle() {
  if (isShuttingDown) return;
  try {
    const processed = await OutboxConsumer.processPendingEvents(workerNodeId);
    if (processed > 0) {
      console.log(`[WorkerRuntime:Outbox] Processed ${processed} events`);
    }
  } catch (err) {
    console.error('[WorkerRuntime:Outbox] Error during outbox cycle:', err);
  }
}

async function runSagaCycle() {
  if (isShuttingDown) return;
  try {
    const res = await SagaWorker.runSagaCycle(workerNodeId);
    if (res.processedSagas > 0) {
      console.log(`[WorkerRuntime:Saga] Sagas: ${res.processedSagas}, Steps: +${res.completedSteps}/-${res.failedSteps}`);
    }
  } catch (err) {
    console.error('[WorkerRuntime:Saga] Error during saga cycle:', err);
  }
}

async function runHoldExpirationCycle() {
  if (isShuttingDown) return;
  try {
    const res = await HoldExpirationWorker.runSweep(workerNodeId);
    if (res.sweptCount > 0) {
      console.log(`[WorkerRuntime:Holds] Expired ${res.sweptCount} holds (active remaining: ${res.activeRemaining})`);
    }
  } catch (err) {
    console.error('[WorkerRuntime:Holds] Error during hold sweep:', err);
  }
}

async function runAutoBuyCycle() {
  if (isShuttingDown) return;
  try {
    const res = await AutoBuyWorker.runSweep(workerNodeId);
    if (res.executed > 0) {
      console.log(`[WorkerRuntime:AutoBuy] Executed ${res.executed} auto-purchases`);
    }
  } catch (err) {
    console.error('[WorkerRuntime:AutoBuy] Error during auto-buy sweep:', err);
  }
}

async function runQueueMetricsAndLeaseRecovery() {
  if (isShuttingDown) return;
  try {
    // 1. Recover crashed leases
    const recoveredLeases = await WorkerLeaseService.recoverCrashedLeases();
    if (recoveredLeases > 0) {
      console.warn(`[WorkerRuntime:LeaseRecovery] Cleaned up ${recoveredLeases} expired leases`);
    }

    // 2. Report queue metrics
    const metrics = await QueueMetricsService.getQueueMetrics();
    if (metrics.depth > 0 || metrics.dlqCount > 0) {
      console.log(`[WorkerRuntime:Metrics] Depth: ${metrics.depth}, DLQ: ${metrics.dlqCount}, Latency p95: ${metrics.p95LatencyMs}ms`);
    }
  } catch (err) {
    console.error('[WorkerRuntime:Metrics] Error during queue metrics cycle:', err);
  }
}

// Setup timers
const outboxInterval = setInterval(runOutboxCycle, 5000);
const sagaInterval = setInterval(runSagaCycle, 5000);
const holdInterval = setInterval(runHoldExpirationCycle, 30000);
const autoBuyInterval = setInterval(runAutoBuyCycle, 60000);
const metricsInterval = setInterval(runQueueMetricsAndLeaseRecovery, 60000);

// Kick off immediately on start
runOutboxCycle();
runSagaCycle();
runHoldExpirationCycle();
runAutoBuyCycle();
runQueueMetricsAndLeaseRecovery();

// Graceful shutdown handling
async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[WorkerRuntime] Received ${signal}. Initiating graceful shutdown...`);

  clearInterval(outboxInterval);
  clearInterval(sagaInterval);
  clearInterval(holdInterval);
  clearInterval(autoBuyInterval);
  clearInterval(metricsInterval);

  // Allow in-flight operations 2 seconds to complete
  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    await prisma.$disconnect();
    console.log('[WorkerRuntime] Database disconnected. Goodbye.');
  } catch (err) {
    console.error('[WorkerRuntime] Error during disconnect:', err);
  }

  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
