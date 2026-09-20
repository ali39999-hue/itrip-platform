/**
 * Canonical Release Identity (BASE-106 / REL-001)
 *
 * Single Source of Truth for APP_VERSION, GIT_COMMIT, BUILD_ID, ENVIRONMENT, DEPLOYMENT_ID.
 * Consumed identically by:
 *   - /api/version
 *   - /api/health/live
 *   - /api/health/ready
 *   - Frontend Footer (APP_VERSION)
 *   - Telemetry & Error Logging (REL-002)
 *   - Quality Report & Reality Matrix
 */

export const NEXT_PUBLIC_APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.8.6';
export const NEXT_PUBLIC_COMMIT_SHA =
  process.env.NEXT_PUBLIC_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  'dev';

export const APP_VERSION = NEXT_PUBLIC_APP_VERSION;
export const COMMIT_SHA = NEXT_PUBLIC_COMMIT_SHA;
export const GIT_COMMIT = COMMIT_SHA;
export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || process.env.VERCEL_DEPLOYMENT_ID || 'local';
export const ENVIRONMENT = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
export const DEPLOYMENT_ID = process.env.VERCEL_DEPLOYMENT_ID || 'local';

export interface CanonicalReleaseIdentity {
  version: string;
  commitSha: string;
  buildId: string;
  environment: string;
  deploymentId: string;
  timestamp?: string;
}

export type AppVersionInfo = CanonicalReleaseIdentity;

export function getCanonicalReleaseIdentity(): CanonicalReleaseIdentity {
  return {
    version: APP_VERSION,
    commitSha: COMMIT_SHA,
    buildId: BUILD_ID,
    environment: ENVIRONMENT,
    deploymentId: DEPLOYMENT_ID,
    timestamp: new Date().toISOString(),
  };
}

export function getAppVersion(): CanonicalReleaseIdentity {
  return getCanonicalReleaseIdentity();
}
