/**
 * Application version and commit provenance (BASE-106)
 * Exports canonical version, commit SHA, and provenance helper for runtime transparency.
 */

export const NEXT_PUBLIC_APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.5.9';
export const NEXT_PUBLIC_COMMIT_SHA = process.env.NEXT_PUBLIC_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'b800f5e';
export const APP_VERSION = NEXT_PUBLIC_APP_VERSION;
export const COMMIT_SHA = NEXT_PUBLIC_COMMIT_SHA;

export interface AppVersionInfo {
  version: string;
  commitSha: string;
  environment: string;
  buildTimestamp?: string;
}

export function getAppVersion(): AppVersionInfo {
  return {
    version: APP_VERSION,
    commitSha: COMMIT_SHA,
    environment: process.env.NODE_ENV || 'development',
  };
}
