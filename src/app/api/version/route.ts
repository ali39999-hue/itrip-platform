import { NextResponse } from 'next/server';
import { APP_VERSION, COMMIT_SHA } from '@/lib/version';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    name: 'itrip-platform',
    brand: 'Firuzo (فیروزو)',
    version: APP_VERSION,
    commitSha: COMMIT_SHA,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    runtime: 'Node.js ' + process.version,
    timestamp: new Date().toISOString(),
  });
}
