import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    name: 'itrip-platform',
    brand: 'Firuzo (فیروزو)',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.5.0',
    commitSha: process.env.NEXT_PUBLIC_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || '4196538',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    runtime: 'Node.js ' + process.version,
    timestamp: new Date().toISOString(),
  });
}
