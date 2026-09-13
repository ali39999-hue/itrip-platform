import { NextRequest, NextResponse } from 'next/server';
import { EcardoTravelClient } from '@/domains/supplier/adapters/EcardoTravelClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'fa';

    const client = new EcardoTravelClient();
    const data = await client.bootstrap(locale);

    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch travel bootstrap';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
