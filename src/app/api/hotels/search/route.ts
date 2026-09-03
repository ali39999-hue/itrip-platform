import { NextRequest, NextResponse } from 'next/server';
import { searchHotels, type HotelSearchParams } from '@/services/hotels-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const query = searchParams.get('q') || searchParams.get('query') || undefined;
    const city = searchParams.get('city') || undefined;
    const country = (searchParams.get('country') as HotelSearchParams['country']) || undefined;

    const starsParam = searchParams.get('stars');
    const stars = starsParam ? starsParam.split(',').map(Number).filter((n) => !isNaN(n)) : undefined;

    const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
    const minScore = searchParams.get('minScore') ? Number(searchParams.get('minScore')) : undefined;
    const freeCancel = searchParams.get('freeCancel') === 'true';

    const sort = (searchParams.get('sort') as HotelSearchParams['sort']) || 'rec';
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 12;

    const result = searchHotels({
      query,
      city,
      country,
      stars,
      minPrice,
      maxPrice,
      minScore,
      freeCancel,
      sort,
      page,
      limit,
    });

    return NextResponse.json(
      { success: true, data: result },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Error in /api/hotels/search:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
