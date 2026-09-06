import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ReconciliationService } from '@/domains/ledger/ReconciliationService';

export const dynamic = 'force-dynamic';

/**
 * The full ledger double-entry scan is O(LedgerEntry) and must not run on every
 * probe (OBS-007: probes arrive every few seconds). The result is cached here
 * and recomputed at most once per LEDGER_CHECK_TTL_MS; a background refresh is
 * performed inline only when the cache has expired.
 */
const LEDGER_CHECK_TTL_MS = 5 * 60 * 1000;
let ledgerCache: { at: number; isBalanced: boolean; totalGroupsChecked: number; unbalancedGroupsCount: number } | null = null;

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
  const checks: Record<string, { status: 'healthy' | 'degraded' | 'unhealthy'; latencyMs?: number; details?: string; error?: string }> = {};
  let overallHealthy = true;

  // 1. PostgreSQL Database Connectivity & Latency
  const startDb = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
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

  // 2. Outbox Queue & Dead-Letter Backlog Probe
  try {
    const [pendingCount, deadLetters] = await Promise.all([
      prisma.outboxEvent.count({ where: { status: 'PENDING' } }),
      prisma.outboxEvent.count({ where: { status: 'DEAD_LETTER' } }),
    ]);

    const isDeadLetterHealthy = deadLetters <= 5;
    checks.outbox = {
      status: isDeadLetterHealthy ? 'healthy' : 'degraded',
      details: `pending: ${pendingCount}, dead_letter: ${deadLetters}`,
      error: deadLetters > 5 ? `High dead-letter count: ${deadLetters}` : undefined,
    };
    if (deadLetters > 20) overallHealthy = false;
  } catch {
    checks.outbox = { status: 'unhealthy', error: 'Could not query outbox queue' };
    overallHealthy = false;
  }

  // 3. Payment Gateway Environment Configuration
  const isDemo = process.env.DEMO_MODE === 'true';
  const hasMerchantCredentials = Boolean(process.env.SHETAB_MERCHANT_ID || isDemo);
  checks.paymentGateway = {
    status: hasMerchantCredentials ? 'healthy' : 'degraded',
    details: isDemo ? 'mode: DEMO_SANDBOX' : hasMerchantCredentials ? 'mode: PRODUCTION_CONFIGURED' : 'mode: MISSING_MERCHANT_ID',
  };

  // 4. Ledger Double-Entry Balance Probe (cached, at most one full scan / 5 min)
  try {
    const ledger = await getLedgerCheck();
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
  } catch {
    checks.ledger = { status: 'unhealthy', error: 'Could not verify ledger balance' };
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
