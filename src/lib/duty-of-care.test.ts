import { describe, it, expect } from 'vitest';
import {
  DutyOfCareService,
} from './duty-of-care';

describe('Section 25: Duty of Care & Traveler Safety Infrastructure', () => {
  it('retrieves detailed consular and emergency details for Turkey (TR)', () => {
    const profile = DutyOfCareService.getSafetyProfile('TR');
    expect(profile.countryCode).toBe('TR');
    expect(profile.countryName.fa).toBe('ترکیه');
    expect(profile.emergencyContacts.some((c) => c.type === 'POLICE')).toBe(true);
    expect(profile.emergencyContacts.some((c) => c.type === 'AMBULANCE')).toBe(true);
    expect(profile.embassy).toBeDefined();
    expect(profile.embassy?.city).toBe('Istanbul');
    expect(profile.embassy?.emergencyHotline).toBe('+905308226026');
  });

  it('retrieves Dubai police and Iranian Hospital Dubai for UAE (AE)', () => {
    const profile = DutyOfCareService.getSafetyProfile('AE');
    expect(profile.countryCode).toBe('AE');
    expect(profile.emergencyContacts.find((c) => c.type === 'POLICE')?.phone).toBe('999');
    expect(profile.accreditedHospitals.some((h) => h.name.includes('Iranian Hospital'))).toBe(true);
  });

  it('generates immediate disruption resolution plan with full refund waiver', () => {
    const plan = DutyOfCareService.createDisruptionPlan({
      bookingRef: 'ITR-7788',
      cancelledItemType: 'FLIGHT',
      title: 'پرواز رفت ماهان به استانبول',
      originalDate: '2026-10-15',
    });

    expect(plan.actionRequired).toBe(true);
    expect(plan.priority).toBe('CRITICAL');
    expect(plan.resolutionSteps.length).toBeGreaterThanOrEqual(3);
    expect(plan.resolutionSteps[0].fa).toContain('استرداد ۱۰۰٪');
  });

  it('falls back gracefully to international emergency 112 for unlisted country', () => {
    const profile = DutyOfCareService.getSafetyProfile('XY');
    expect(profile.countryCode).toBe('XY');
    expect(profile.emergencyContacts[0].phone).toBe('112');
  });
});
