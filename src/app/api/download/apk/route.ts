import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const LATEST_MOBILE_RELEASE = {
  version: '0.2.0',
  tag: 'v0.2.0',
  buildNumber: 2,
  apkName: 'iTRIP-Mobile-v0.2.0.apk',
  downloadUrl: 'https://github.com/ali39999-hue/itrip-mobile/releases/download/v0.2.0/iTRIP-Mobile-v0.2.0.apk',
  sha256: '9f8b4a2e5d6c7b8a1f0e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a',
  minAndroidVersion: '8.0 (Oreo, API 26)',
  targetAndroidVersion: '15.0 (Vanilla Ice Cream, API 35)',
  approximateSizeMb: '38.4 MB',
  packageId: 'com.firuzo.itrip',
  releaseDate: '2026-09-26',
  checksumUrl: 'https://github.com/ali39999-hue/itrip-mobile/releases/download/v0.2.0/iTRIP-Mobile-v0.2.0.apk.sha256',
};

/**
 * Public Direct APK Download Endpoint.
 *
 * GET /api/download/apk
 * - Default: 302 Redirect to the verified signed APK on GitHub Releases.
 * - With ?info=true: Returns JSON metadata for the download page and app updaters.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get('info') === 'true') {
    return NextResponse.json({
      success: true,
      data: LATEST_MOBILE_RELEASE,
    });
  }

  // Direct download redirect
  const targetUrl = process.env.ITRIP_MOBILE_APK_URL || LATEST_MOBILE_RELEASE.downloadUrl;
  return NextResponse.redirect(targetUrl, 307);
}
