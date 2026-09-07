/**
 * OBS-105 & OBS-106: Canonical Readiness Probe (/api/health/ready)
 *
 * Verifies deep service readiness including:
 * - PostgreSQL Connectivity with strict max 2000ms timeout
 * - Redis / Distributed Cache with strict max 1500ms timeout
 * - Outbox Queue & DLQ backlog threshold
 * - Ledger Double-Entry Balance (cached TTL to prevent probe self-DoS)
 * Never hangs: times out deterministically and returns HTTP 503 on critical failures.
 */

import { NextResponse } from 'next/server';
import { createConnection } from 'node:net';
import { prisma } from '@/lib/prisma';
import { ReconciliationService } from '@/domains/ledger/ReconciliationService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DB_CHECK_TIMEOUT_MS = 2000;
const REDIS_CHECK_TIMEOUT_MS = 1500;
const LEDGER_CHECK_TTL_MS = 5 * 60 * 1000;

let ledgerCache: { at: number; isBalanced: boolean; totalGroupsChecked: number; unbalancedGroupsCount: number } | null = null;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${operationName} exceeded deadline of ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([
    promise.finally(() => {
      if (timer) clearTimeout(timer);
    }),
    timeoutPromise,
  ]);
}

async function getLedgerCheck() {
  if (ledgerCache && Date.now() - ledgerCache.at < LEDGER_CHECK_TTL_MS) {
    return { ...ledgerCache, cached: true };
  }
  const reconReport = await ReconciliationService.reconcileLedger();
  ledgerCache = {
    at: Date.now(),
    isBalanced: reconReport.isBalanced,
    totalGroupsChecked: reconReport.totalGroupsChecked,
    unbalancedGroupsCount: reconReport.unbalancedGroupsCount,
  };
  return { ...ledgerCache, cached: false };
}

export async function GET() {
  const checks: Record<
    string,
    { status: 'healthy' | 'degraded' | 'unhealthy'; latencyMs?: number; details?: string; error?: string }
  > = {};
  let overallHealthy = true;

  // 1. PostgreSQL Database Connectivity (OBS-106: max 2000ms timeout)
  const startDb = Date.now();
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, DB_CHECK_TIMEOUT_MS, 'Database query');
    checks.database = {
      status: 'healthy',
      latencyMs: Date.now() - startDb,
    };
  } catch (err: unknown) {
    overallHealthy = false;
    checks.database = {
      status: 'unhealthy',
      latencyMs: Date.now() - startDb,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // 2. Redis / Distributed Cache Health (OBS-106: max 1500ms timeout)
  const startRedis = Date.now();
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      // Direct network socket/probe with 1500ms deadline
      await withTimeout(
        new Promise<void>((resolve, reject) => {
          try {
            const parsed = new URL(redisUrl);
            const socket = createConnection({
              host: parsed.hostname,
              port: Number(parsed.port) || 6379,
              timeout: REDIS_CHECK_TIMEOUT_MS,
            });
            socket.on('connect', () => {
              socket.end();
              resolve();
            });
            socket.on('error', (err: Error) => reject(err));
            socket.on('timeout', () => {
              socket.destroy();
              reject(new Error('Redis connection timed out'));
            });
          } catch (e) {
            reject(e);
          }
        }),
        REDIS_CHECK_TIMEOUT_MS,
        'Redis connectivity'
      );
      checks.redis = {
        status: 'healthy',
        latencyMs: Date.now() - startRedis,
        details: 'connected',
      };
    } catch (redisErr: unknown) {
      // In development or if fallback is allowed, redis failure degrades rather than blocks
      checks.redis = {
        status: process.env.NODE_ENV === 'production' ? 'unhealthy' : 'degraded',
        latencyMs: Date.now() - startRedis,
        error: redisErr instanceof Error ? redisErr.message : String(redisErr),
      };
      if (process.env.NODE_ENV === 'production') {
        overallHealthy = false;
      }
    }
  } else {
    checks.redis = {
      status: 'healthy',
      details: 'mode: IN_MEMORY_FALLBACK (REDIS_URL not set)',
    };
  }

  // 3. Outbox Queue & Dead-Letter Backlog Probe (bounded max 2000ms)
  try {
    const [pendingCount, deadLetters] = await withTimeout(
      Promise.all([
        prisma.outboxEvent.count({ where: { status: 'PENDING' } }),
        prisma.outboxEvent.count({ where: { status: 'DEAD_LETTER' } }),
      ]),
      2000,
      'Outbox backlog probe'
    );

    const isDeadLetterHealthy = deadLetters <= 5;
    checks.outbox = {
      status: isDeadLetterHealthy ? 'healthy' : 'degraded',
      details: `pending: ${pendingCount}, dead_letter: ${deadLetters}`,
      error: deadLetters > 5 ? `High dead-letter count: ${deadLetters}` : undefined,
    };
    if (deadLetters > 20) overallHealthy = false;
  } catch (outboxErr: unknown) {
    checks.outbox = {
      status: 'unhealthy',
      error: outboxErr instanceof Error ? outboxErr.message : 'Could not query outbox queue',
    };
    overallHealthy = false;
  }

  // 4. Payment Gateway Environment Configuration
  const isDemo = process.env.DEMO_MODE === 'true';
  const hasMerchantCredentials = Boolean(process.env.SHETAB_MERCHANT_ID || isDemo);
  checks.paymentGateway = {
    status: hasMerchantCredentials ? 'healthy' : 'degraded',
    details: isDemo ? 'mode: DEMO_SANDBOX' : hasMerchantCredentials ? 'mode: PRODUCTION_CONFIGURED' : 'mode: MISSING_MERCHANT_ID',
  };

  // 5. Ledger Double-Entry Balance Probe (cached, at most one full scan / 5 min)
  try {
    const ledger = await withTimeout(getLedgerCheck(), 2000, 'Ledger reconciliation probe');
    checks.ledger = {
      status: ledger.isBalanced ? 'healthy' : 'degraded',
      details: `groupsChecked: ${ledger.totalGroupsChecked}, unbalanced: ${ledger.unbalancedGroupsCount}${ledger.cached ? ' (cached)' : ''}`,
      error: !ledger.isBalanced && ledger.unbalancedGroupsCount > 0
        ? `Unbalanced ledger groups detected: ${ledger.unbalancedGroupsCount}`
        : undefined,
    };
    if (!ledger.isBalanced && ledger.unbalancedGroupsCount > 0) {
      overallHealthy = false;
    }
  } catch (ledgerErr: unknown) {
    checks.ledger = {
      status: 'degraded',
      error: ledgerErr instanceof Error ? ledgerErr.message : 'Could not verify ledger balance within timeout',
    };
  }

  const statusCode = overallHealthy ? 200 : 503;
  return NextResponse.json(
    {
      status: overallHealthy ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: statusCode }
  );
}
