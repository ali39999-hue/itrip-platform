import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const LATEST_MOBILE_RELEASE = {
  version: '0.2.0',
  tag: 'v0.2.0',
  buildNumber: 2,
  apkName: 'iTRIP-Mobile-v0.2.0.apk',
  downloadUrl: 'https://github.com/ali39999-hue/itrip-mobile/releases/download/v0.2.0/iTRIP-Mobile-v0.2.0.apk',
  sha256: '2b8738a3adffe7d5bc13ccd5ecdd2ae1febe9793c2f2c3daa1f4e645dc6df0d4',
  minAndroidVersion: '8.0 (Oreo, API 26)',
  targetAndroidVersion: '15.0 (Vanilla Ice Cream, API 35)',
  approximateSizeMb: '101 MB',
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
