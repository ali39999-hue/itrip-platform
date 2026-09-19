import { describe, it, expect } from 'vitest';
import { SiteContentService } from '@/domains/content/SiteContentService';
import { PolicySnapshotDomainService } from '@/domains/booking/policy-snapshot';
import { CipService } from '@/services/cip-service';
import { InsuranceService } from '@/services/insurance-service';

describe('CIP & Insurance CMS Integration', () => {
  it('should validate services.cip payload with zod schema', () => {
    const validCipData = [
      {
        id: 'cip-ika',
        airportCode: 'IKA',
        airportNameFa: 'فرودگاه بین‌المللی امام خمینی',
        airportNameEn: 'Imam Khomeini Airport',
        cityFa: 'تهران',
        cityEn: 'Tehran',
        countryCode: 'IR',
        terminal: 'ترمینال اختصاصی',
        basePriceAdult: 9900000,
        basePriceGuest: 3300000,
        petServicePrice: 3740000,
        wheelchairPrice: 2970000,
        suite6hPrice: 5200000,
        suite10hPrice: 5860000,
        suiteOvernightPrice: 8470000,
      },
    ];

    const parsed = SiteContentService.parsePayload('services.cip', validCipData);
    expect(parsed).toEqual(validCipData);
  });

  it('should validate services.insurance payload with zod schema', () => {
    const validInsuranceData = [
      {
        id: 'kowsar-50k-swiss',
        companyId: 'kowsar',
        assistanceId: 'swiss_assist',
        coverageEur: 50000,
        basePriceToman1to7Days: 174240,
        topPerksFa: ['سقف ۵۰ هزار یورو'],
      },
    ];

    const parsed = SiteContentService.parsePayload('services.insurance', validInsuranceData);
    expect(parsed).toEqual(validInsuranceData);
  });

  it('should resolve async CIP airports with fallback to default catalog', async () => {
    const airports = await CipService.getAirportsAsync();
    expect(airports.length).toBeGreaterThanOrEqual(5);
    const ika = await CipService.getAirportByCodeAsync('IKA');
    expect(ika).toBeDefined();
    expect(ika?.airportCode).toBe('IKA');
  });

  it('should resolve async Insurance base plans with fallback to default catalog', async () => {
    const plans = await InsuranceService.getBasePlansAsync();
    expect(plans.length).toBeGreaterThanOrEqual(5);
    const results = await InsuranceService.searchPlansAsync({
      zoneId: 'ZONE_TURKEY_NEIGHBORS',
      durationId: '1-7',
    });
    expect(results.length).toBeGreaterThanOrEqual(4);
  });
});

describe('CIP & Insurance Policy Snapshots', () => {
  it('should create official 5-hour cancellation rule snapshot for CIP', () => {
    const policy = PolicySnapshotDomainService.createDefaultPolicy('CIP');
    expect(policy.productType).toBe('CIP');
    expect(policy.isRefundable).toBe(true);

    const rule5h = policy.cancellationRules.find((r) => r.hoursBeforeTravel === 5);
    expect(rule5h).toBeDefined();
    expect(rule5h?.penaltyPercentage).toBe(0.0); // 100% refund up to 5 hours

    const rule0h = policy.cancellationRules.find((r) => r.hoursBeforeTravel === 0);
    expect(rule0h).toBeDefined();
    expect(rule0h?.penaltyPercentage).toBe(1.0); // 100% penalty under 5 hours

    expect(policy.baggageAllowance).toContain('Porter Service');
  });

  it('should create departure-stamp cancellation rule snapshot for INSURANCE', () => {
    const policy = PolicySnapshotDomainService.createDefaultPolicy('INSURANCE');
    expect(policy.productType).toBe('INSURANCE');
    expect(policy.isRefundable).toBe(true);

    expect(policy.cancellationRules[0].penaltyPercentage).toBe(0.0);
    expect(policy.cancellationRules[0].description).toContain('تاریخ شروع سفر');
    expect(policy.baggageAllowance).toContain('۱,۲۰۰ یورو');
  });
});
