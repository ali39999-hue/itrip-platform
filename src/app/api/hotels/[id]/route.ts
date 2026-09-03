import { NextRequest, NextResponse } from 'next/server';
import { getHotelById } from '@/services/hotels-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Hotel ID is required' }, { status: 400 });
    }

    const hotel = getHotelById(id);
    if (!hotel) {
      return NextResponse.json({ success: false, error: 'Hotel not found' }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, data: hotel },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Error in /api/hotels/[id]:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
