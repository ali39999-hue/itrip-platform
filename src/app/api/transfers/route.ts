import { NextResponse } from 'next/server';
import { SiteContentService } from '@/domains/content/SiteContentService';
import { TRANSFERS, type TransferOption } from '@/lib/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const custom = await SiteContentService.get<TransferOption[]>('services.transfers').catch(() => null);
    const list = custom && custom.length > 0 ? custom : TRANSFERS;

    return NextResponse.json(
      { success: true, count: list.length, data: list },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Error in /api/transfers:', error);
    return NextResponse.json(
      { success: true, count: TRANSFERS.length, data: TRANSFERS },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}
