import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, { status: 'healthy' | 'unhealthy'; latencyMs?: number; error?: string }> = {};
  let overallHealthy = true;

  // 1. PostgreSQL Database Connectivity Check
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

  // 2. Outbox & Queue Backlog Check
  try {
    const deadLetters = await prisma.outboxEvent.count({
      where: { status: 'DEAD_LETTER' },
    });
    checks.outbox = {
      status: deadLetters > 10 ? 'unhealthy' : 'healthy',
      error: deadLetters > 10 ? `High dead-letter count: ${deadLetters}` : undefined,
    };
    if (deadLetters > 10) overallHealthy = false;
  } catch {
    checks.outbox = { status: 'unhealthy', error: 'Could not query outbox' };
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
