import { NextRequest } from 'next/server';
import { InsuranceService } from '@/services/insurance-service';
import { apiSuccess, apiError } from '@/lib/api-response';
import type { TravelInsuranceZone, InsuranceAgeBracket, InsuranceCoverageLimitEur } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const zoneId = (searchParams.get('zoneId') as TravelInsuranceZone) || 'ZONE_TURKEY_NEIGHBORS';
    const durationId = searchParams.get('durationId') || '1-7';
    const agesParam = searchParams.get('ages'); // comma-separated e.g. "13-65,0-12"
    const coverageParam = searchParams.get('coverage'); // e.g. "50000"
    const companyParam = searchParams.get('company');
    const assistanceParam = searchParams.get('assistance');
    const sortBy = searchParams.get('sortBy') as 'price_asc' | 'price_desc' | 'rating_desc' | 'coverage_desc' || 'price_asc';

    const passengersAges: InsuranceAgeBracket[] = agesParam
      ? (agesParam.split(',').filter(Boolean) as InsuranceAgeBracket[])
      : ['13-65'];

    const coverageLimits = coverageParam
      ? (coverageParam.split(',').map(Number).filter(Boolean) as InsuranceCoverageLimitEur[])
      : undefined;

    const companyIds = companyParam ? companyParam.split(',').filter(Boolean) : undefined;
    const assistanceIds = assistanceParam ? assistanceParam.split(',').filter(Boolean) : undefined;

    const results = await InsuranceService.searchPlansAsync({
      zoneId,
      durationId,
      passengersAges,
      coverageLimits,
      companyIds,
      assistanceIds,
      sortBy,
    });

    return apiSuccess({
      results,
      totalCount: results.length,
      zones: InsuranceService.getDestinationZones(),
      durations: InsuranceService.getDurationPackages(),
      ageBrackets: InsuranceService.getAgeBrackets(),
      companies: InsuranceService.getCompanies(),
      assistancePartners: InsuranceService.getAssistancePartners(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to search insurance plans';
    return apiError(message, 500);
  }
}
