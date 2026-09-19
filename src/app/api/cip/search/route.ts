import { NextRequest } from 'next/server';
import { CipService } from '@/services/cip-service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country') || undefined;
    const code = searchParams.get('code') || undefined;

    if (code) {
      const airport = await CipService.getAirportByCodeAsync(code);
      if (!airport) {
        return apiError(`CIP Airport with code ${code} not found`, 404);
      }
      return apiSuccess({ airport });
    }

    const airports = await CipService.getAirportsAsync(country);
    const vehicles = CipService.getVehicles();

    return apiSuccess({
      airports,
      vehicles,
      totalAirports: airports.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch CIP catalog';
    return apiError(message, 500);
  }
}
