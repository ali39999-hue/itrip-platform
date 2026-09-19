import { NextResponse } from 'next/server';
import { getCanonicalReleaseIdentity } from '@/lib/version';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const identity = getCanonicalReleaseIdentity();

  return NextResponse.json({
    name: 'itrip-platform',
    brand: 'Firuzo (فیروزو)',
    version: identity.version,
    commitSha: identity.commitSha,
    buildId: identity.buildId,
    environment: identity.environment,
    deploymentId: identity.deploymentId,
    runtime: 'Node.js ' + process.version,
    timestamp: identity.timestamp,
  });
}
