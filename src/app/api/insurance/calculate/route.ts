import { NextRequest } from 'next/server';
import { InsuranceService } from '@/services/insurance-service';
import { apiSuccess, apiError } from '@/lib/api-response';
import type { TravelInsuranceZone, InsuranceAgeBracket } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      planId,
      zoneId = 'ZONE_TURKEY_NEIGHBORS',
      durationId = '1-7',
      passengersAges = ['13-65'],
    } = body;

    if (!planId) {
      return apiError('planId is required', 400);
    }

    const calculated = InsuranceService.getPlanById(
      planId,
      zoneId as TravelInsuranceZone,
      durationId,
      passengersAges as InsuranceAgeBracket[]
    );

    if (!calculated) {
      return apiError(`Insurance plan with id ${planId} not found`, 404);
    }

    return apiSuccess({ calculation: calculated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Insurance price calculation failed';
    return apiError(message, 500);
  }
}
