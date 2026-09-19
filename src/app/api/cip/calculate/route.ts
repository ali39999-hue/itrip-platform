import { NextRequest } from 'next/server';
import { CipService } from '@/services/cip-service';
import { apiSuccess, apiError } from '@/lib/api-response';
import type { CipSuiteType } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      airportCode,
      adults = 1,
      children = 0,
      infants = 0,
      accompanyingGuests = 0,
      petCount = 0,
      wheelchairCount = 0,
      suiteType = 'NONE',
      transferVehicleId = 'NONE',
      transferAddress = '',
    } = body;

    if (!airportCode) {
      return apiError('airportCode is required', 400);
    }

    const calculation = CipService.calculatePrice({
      airportCode,
      adults: Number(adults) || 1,
      children: Number(children) || 0,
      infants: Number(infants) || 0,
      accompanyingGuests: Number(accompanyingGuests) || 0,
      petCount: Number(petCount) || 0,
      wheelchairCount: Number(wheelchairCount) || 0,
      suiteType: suiteType as CipSuiteType,
      transferVehicleId: transferVehicleId || 'NONE',
      transferAddress,
    });

    return apiSuccess({ calculation });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Price calculation error';
    return apiError(message, 500);
  }
}
