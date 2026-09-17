/**
 * /api/cron/async-engine — serverless driver for the async engine (ASYNC-109).
 *
 * Vercel's serverless runtime bypasses in-process timers (instrumentation.ts), so
 * the outbox consumer, saga worker, hold/booking expiration, lease recovery and
 * bounded DLQ second-chance requeue are driven from this cron route instead.
 * The dedicated worker process (`npm run worker`) remains the driver for
 * self-hosted deployments; both paths are lease-protected and idempotent.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { OutboxConsumer } from '@/domains/events/OutboxConsumer';
import { SagaWorker } from '@/workers/saga-worker';
import { HoldExpirationWorker } from '@/workers/hold-expiration-worker';
import { BookingDomainService } from '@/domains/booking/BookingDomainService';
import { ReconciliationService } from '@/domains/ledger/ReconciliationService';
import { WorkerLeaseService } from '@/domains/events/WorkerLeaseService';
import { pruneOldBehaviorEvents } from '@/lib/behavior';
import { ErrorTrackerService } from '@/domains/observability/ErrorTrackerService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;
    const isProduction = process.env.NODE_ENV === 'production';

    // Fail-closed authorization: require secret matching in production, or whenever CRON_SECRET is defined
    if (isProduction || secret) {
      if (!secret || authHeader !== `Bearer ${secret}`) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }

    const workerId = `cron_async_${crypto.randomBytes(3).toString('hex')}`;

    const outbox = await OutboxConsumer.processPendingEvents(workerId);
    const saga = await SagaWorker.runSagaCycle(workerId);
    const holds = await HoldExpirationWorker.runSweep(workerId);
    const expiredBookings = await BookingDomainService.expireStaleBookings();
    const recoveredLeases = await WorkerLeaseService.recoverCrashedLeases().catch(() => 0);
    // Bounded second chance: at most 3 dead events per run get one more attempt
    // cycle; events at retryCount 8+ or UNKNOWN_EVENT_TYPE stay dead for the
    // Exception Center / human remediation.
    const dlqRequeued = await OutboxConsumer.requeueDeadLetters(3).catch(() => 0);
    const ledger = await ReconciliationService.reconcileLedger().catch(() => null);
    const prunedBehaviorEvents = await pruneOldBehaviorEvents().catch(() => 0);
    const purgedErrorLogs = await ErrorTrackerService.purgeOldLogs(30).catch(() => 0);

    return NextResponse.json({
      success: true,
      workerId,
      outboxProcessed: outbox,
      sagasProcessed: saga?.processedSagas ?? 0,
      holdsSwept: holds?.sweptCount ?? 0,
      expiredBookings,
      recoveredLeases,
      dlqRequeued,
      prunedBehaviorEvents,
      purgedErrorLogs,
      ledgerBalanced: ledger ? ledger.isBalanced : null,
    });
  } catch (error: unknown) {
    console.error('Error in /api/cron/async-engine:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
