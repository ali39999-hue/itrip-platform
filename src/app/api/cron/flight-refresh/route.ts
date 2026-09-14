import { NextRequest, NextResponse } from 'next/server';
import { FlightCacheWorker } from '@/workers/flight-cache-worker';
import { PartoSessionHeartbeatWorker } from '@/workers/parto-session-heartbeat-worker';

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

    const report = await FlightCacheWorker.runSweep('cron_route');
    // Cron-driven deployments have no dedicated worker process — use this
    // invocation as the portal session keep-alive ping too (self-gating).
    const portalHeartbeat = await PartoSessionHeartbeatWorker.runPing('cron_route').catch(() => null);
    return NextResponse.json({ success: true, report, portalHeartbeat });
  } catch (error: unknown) {
    console.error('Error in /api/cron/flight-refresh:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
