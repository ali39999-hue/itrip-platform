import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ReconciliationService } from '@/domains/ledger/ReconciliationService';

export const dynamic = 'force-dynamic';

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

  // 4. Ledger Double-Entry Balance Probe
  try {
    const reconReport = await ReconciliationService.reconcileLedger();
    checks.ledger = {
      status: reconReport.isBalanced ? 'healthy' : 'degraded',
      details: `groupsChecked: ${reconReport.totalGroupsChecked}, unbalanced: ${reconReport.unbalancedGroupsCount}`,
      error: !reconReport.isBalanced ? `Unbalanced ledger groups detected: ${reconReport.unbalancedGroupsCount}` : undefined,
    };
    if (!reconReport.isBalanced && reconReport.unbalancedGroupsCount > 0) {
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
