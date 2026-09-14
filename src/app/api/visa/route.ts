import { NextResponse } from 'next/server';
import { SiteContentService } from '@/domains/content/SiteContentService';
import { VISA_SERVICES } from '@/lib/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const custom = await SiteContentService.get<typeof VISA_SERVICES>('services.visa').catch(() => null);
    const list = custom && custom.length > 0 ? custom : VISA_SERVICES;

    return NextResponse.json(
      { success: true, count: list.length, data: list },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Error in /api/visa:', error);
    return NextResponse.json(
      { success: true, count: VISA_SERVICES.length, data: VISA_SERVICES },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}
