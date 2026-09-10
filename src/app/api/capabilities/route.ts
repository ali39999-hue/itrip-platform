import { NextResponse } from 'next/server';
import { getAllCapabilities, getPublicCapabilitiesSummary } from '@/lib/capabilities';
import { APP_VERSION, COMMIT_SHA } from '@/lib/version';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const detail = searchParams.get('detail') === 'full';

  return NextResponse.json({
    version: APP_VERSION,
    commitSha: COMMIT_SHA,
    timestamp: new Date().toISOString(),
    capabilities: detail ? getAllCapabilities() : getPublicCapabilitiesSummary(),
  });
}
