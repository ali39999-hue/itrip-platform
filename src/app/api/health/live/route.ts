/**
 * OBS-105: Lightweight Liveness Probe (/api/health/live)
 *
 * Checks only local node process health, uptime, and memory.
 * Never touches database, network services, or external dependencies.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const mem = process.memoryUsage();
  return NextResponse.json({
    status: 'live',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.5.0',
    commitSha: process.env.NEXT_PUBLIC_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || '4196538',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    process: {
      pid: process.pid,
      memoryMb: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      },
    },
  });
}
