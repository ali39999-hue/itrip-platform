import { NextRequest, NextResponse } from 'next/server';
import { FlightCacheWorker } from '@/workers/flight-cache-worker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;

    // If CRON_SECRET is configured in environment, require bearer authorization
    if (secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const report = await FlightCacheWorker.runSweep('cron_route');
    return NextResponse.json({ success: true, report });
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
