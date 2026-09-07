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
