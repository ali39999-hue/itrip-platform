import { NextRequest, NextResponse } from 'next/server';
import { searchFlights, searchFlightsFromFlights, type FlightSearchParams } from '@/services/flights-service';
import { overlayLiveFlights } from '@/services/flight-cache-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const country = searchParams.get('country') || undefined;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const departDate = searchParams.get('depart') || undefined;

    const airlinesParam = searchParams.get('airlines');
    const airlines = airlinesParam ? airlinesParam.split(',').filter(Boolean) : undefined;

    const stopsParam = searchParams.get('stops');
    const stops = stopsParam ? stopsParam.split(',').map(Number).filter((n) => !isNaN(n)) : undefined;

    const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;

    const ticketType = (searchParams.get('ticketType') as FlightSearchParams['ticketType']) || undefined;
    const cabinClass = (searchParams.get('cabinClass') as FlightSearchParams['cabinClass']) || undefined;
    const timeOfDay = (searchParams.get('timeOfDay') as FlightSearchParams['timeOfDay']) || undefined;

    const sort = (searchParams.get('sort') as FlightSearchParams['sort']) || 'price';
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 25;

    const params: FlightSearchParams = {
      country,
      from,
      to,
      departDate,
      airlines,
      stops,
      minPrice,
      maxPrice,
      ticketType,
      cabinClass,
      timeOfDay,
      sort,
      page,
      limit,
    };

    // Static catalog is the always-available fallback; live Parto cache rows
    // (when present for this route+date) replace it inside the overlay.
    const staticResult = searchFlights(params);
    const overlay = await overlayLiveFlights(staticResult, params, searchFlightsFromFlights);

    return NextResponse.json(
      {
        success: true,
        data: overlay.data,
        liveMeta: overlay.meta,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Error in /api/flights/search:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
