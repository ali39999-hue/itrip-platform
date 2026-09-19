import {
  INSURANCE_COMPANIES,
  ASSISTANCE_PARTNERS,
  DESTINATION_ZONES,
  DURATION_PACKAGES,
  AGE_BRACKETS,
  BASE_INSURANCE_PLANS,
  type BaseInsurancePlanDefinition,
  type DestinationZoneOption,
  type DurationPackageOption,
  type AgeBracketOption,
} from '@/lib/insurance-data';
import type {
  InsuranceCompanyInfo,
  AssistancePartnerInfo,
  InsuranceCoverageLimitEur,
  TravelInsuranceZone,
  InsuranceAgeBracket,
} from '@/lib/types';

export interface InsuranceSearchCriteria {
  zoneId?: TravelInsuranceZone;
  durationId?: string; // '1-7', '8-15', etc.
  passengersAges?: InsuranceAgeBracket[]; // array of age brackets e.g. ['13-65']
  coverageLimits?: InsuranceCoverageLimitEur[];
  assistanceIds?: string[];
  companyIds?: string[];
  instantOnly?: boolean;
  schengenOnly?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'rating_desc' | 'coverage_desc';
}

export interface InsurancePassengerLineItem {
  passengerIndex: number;
  ageBracket: InsuranceAgeBracket;
  ageBracketLabelFa: string;
  ageMultiplier: number;
  individualPriceToman: number;
}

export interface CalculatedInsuranceCard {
  id: string; // unique key for this plan + duration + zone
  basePlanId: string;
  company: InsuranceCompanyInfo;
  assistance: AssistancePartnerInfo;
  coverageEur: InsuranceCoverageLimitEur;
  zoneId: TravelInsuranceZone;
  durationId: string;
  durationLabelFa: string;
  durationLabelEn: string;
  passengersCount: number;
  passengerLineItems: InsurancePassengerLineItem[];
  subtotalToman: number;
  discountToman: number;
  taxToman: number;
  finalPriceToman: number;
  finalPriceRials: number;
  topPerksFa: string[];
  topPerksEn: string[];
  instantIssuance: boolean;
  schengenCompliant: boolean;
}

export class InsuranceService {
  static getCompanies(): InsuranceCompanyInfo[] {
    return Object.values(INSURANCE_COMPANIES);
  }

  static getAssistancePartners(): AssistancePartnerInfo[] {
    return Object.values(ASSISTANCE_PARTNERS);
  }

  static getDestinationZones(): DestinationZoneOption[] {
    return DESTINATION_ZONES;
  }

  static getZoneById(zoneId: TravelInsuranceZone): DestinationZoneOption | undefined {
    return DESTINATION_ZONES.find((z) => z.id === zoneId);
  }

  static getDurationPackages(): DurationPackageOption[] {
    return DURATION_PACKAGES;
  }

  static getDurationById(durationId: string): DurationPackageOption | undefined {
    return DURATION_PACKAGES.find((d) => d.id === durationId) || DURATION_PACKAGES[0];
  }

  static getAgeBrackets(): AgeBracketOption[] {
    return AGE_BRACKETS;
  }

  static getZoneMultiplier(zoneId: TravelInsuranceZone): number {
    switch (zoneId) {
      case 'ZONE_TURKEY_NEIGHBORS':
        return 1.0;
      case 'ZONE_GULF_MIDDLE_EAST':
        return 1.15;
      case 'ZONE_SCHENGEN_EUROPE':
        return 1.25;
      case 'ZONE_WORLD_EXCL_US_CA':
        return 1.45;
      case 'ZONE_WORLD_ALL':
        return 1.85;
      default:
        return 1.0;
    }
  }

  static calculatePlanPrice(
    plan: BaseInsurancePlanDefinition,
    zoneId: TravelInsuranceZone,
    durationId: string,
    passengersAges: InsuranceAgeBracket[] = ['13-65']
  ): CalculatedInsuranceCard {
    const company = INSURANCE_COMPANIES[plan.companyId] || INSURANCE_COMPANIES.saman;
    const assistance = ASSISTANCE_PARTNERS[plan.assistanceId] || ASSISTANCE_PARTNERS.swiss_assist;
    const duration = this.getDurationById(durationId) || DURATION_PACKAGES[0];
    const zoneMultiplier = this.getZoneMultiplier(zoneId);

    const passengerLineItems: InsurancePassengerLineItem[] = [];

    let subtotalToman = 0;
    passengersAges.forEach((ageBracket, index) => {
      const ageOpt = AGE_BRACKETS.find((a) => a.id === ageBracket) || AGE_BRACKETS[1];
      const ageMultiplier = ageOpt.multiplier;

      // Base formula: plan base (1-7 days Zone 1) * duration mult * zone mult * age mult
      const individualPrice = Math.round(
        plan.basePriceToman1to7Days * duration.durationMultiplier * zoneMultiplier * ageMultiplier
      );

      subtotalToman += individualPrice;
      passengerLineItems.push({
        passengerIndex: index + 1,
        ageBracket,
        ageBracketLabelFa: ageOpt.labelFa,
        ageMultiplier,
        individualPriceToman: individualPrice,
      });
    });

    // Cash discount e.g. 5% if applicable (shown in Azki as cash purchase discount)
    const discountToman = 0;
    const taxToman = 0; // Already included in official consumer tariff
    const finalPriceToman = subtotalToman - discountToman + taxToman;
    const finalPriceRials = finalPriceToman * 10;

    const schengenCompliant = plan.coverageEur >= 30000 && company.schengenApproved;

    return {
      id: `${plan.id}-${zoneId}-${duration.id}-${passengersAges.length}`,
      basePlanId: plan.id,
      company,
      assistance,
      coverageEur: plan.coverageEur,
      zoneId,
      durationId: duration.id,
      durationLabelFa: duration.labelFa,
      durationLabelEn: duration.labelEn,
      passengersCount: passengersAges.length,
      passengerLineItems,
      subtotalToman,
      discountToman,
      taxToman,
      finalPriceToman,
      finalPriceRials,
      topPerksFa: plan.topPerksFa,
      topPerksEn: plan.topPerksEn,
      instantIssuance: company.instantIssuance,
      schengenCompliant,
    };
  }

  static async getBasePlansAsync(): Promise<BaseInsurancePlanDefinition[]> {
    try {
      const { SiteContentService } = await import('@/domains/content/SiteContentService');
      const custom = await SiteContentService.get<BaseInsurancePlanDefinition[]>('services.insurance').catch(() => null);
      if (custom && Array.isArray(custom) && custom.length > 0) {
        return custom;
      }
    } catch {}
    return BASE_INSURANCE_PLANS;
  }

  static searchPlans(criteria: InsuranceSearchCriteria = {}): CalculatedInsuranceCard[] {
    return this.searchPlansWithBaseList(BASE_INSURANCE_PLANS, criteria);
  }

  static async searchPlansAsync(criteria: InsuranceSearchCriteria = {}): Promise<CalculatedInsuranceCard[]> {
    const plans = await this.getBasePlansAsync();
    return this.searchPlansWithBaseList(plans, criteria);
  }

  static searchPlansWithBaseList(
    basePlans: BaseInsurancePlanDefinition[],
    criteria: InsuranceSearchCriteria = {}
  ): CalculatedInsuranceCard[] {
    const zoneId = criteria.zoneId || 'ZONE_TURKEY_NEIGHBORS';
    const durationId = criteria.durationId || '1-7';
    const passengersAges: InsuranceAgeBracket[] =
      criteria.passengersAges && criteria.passengersAges.length > 0
        ? criteria.passengersAges
        : ['13-65' as InsuranceAgeBracket];

    // Check if zone requires minimum 30k coverage (e.g. Schengen)
    const zone = this.getZoneById(zoneId);
    const requiresMin30k = zone?.requiresMin30k ?? false;

    const availablePlans = basePlans.filter((plan) => {
      // If zone requires min 30k, filter out 10k plans
      if (requiresMin30k && plan.coverageEur < 30000) {
        return false;
      }

      // Coverage limit filter
      if (criteria.coverageLimits && criteria.coverageLimits.length > 0) {
        if (!criteria.coverageLimits.includes(plan.coverageEur)) {
          return false;
        }
      }

      // Company filter
      if (criteria.companyIds && criteria.companyIds.length > 0) {
        if (!criteria.companyIds.includes(plan.companyId)) {
          return false;
        }
      }

      // Assistance partner filter
      if (criteria.assistanceIds && criteria.assistanceIds.length > 0) {
        if (!criteria.assistanceIds.includes(plan.assistanceId)) {
          return false;
        }
      }

      return true;
    });

    let results = availablePlans.map((plan) =>
      this.calculatePlanPrice(plan, zoneId, durationId, passengersAges)
    );

    // Schengen only filter
    if (criteria.schengenOnly) {
      results = results.filter((r) => r.schengenCompliant);
    }

    // Instant issuance only filter
    if (criteria.instantOnly) {
      results = results.filter((r) => r.instantIssuance);
    }

    // Sort results
    const sortBy = criteria.sortBy || 'price_asc';
    results.sort((a, b) => {
      if (sortBy === 'price_asc') return a.finalPriceToman - b.finalPriceToman;
      if (sortBy === 'price_desc') return b.finalPriceToman - a.finalPriceToman;
      if (sortBy === 'coverage_desc') return b.coverageEur - a.coverageEur;
      if (sortBy === 'rating_desc') return b.company.rating - a.company.rating;
      return 0;
    });

    return results;
  }

  static getPlanById(
    planId: string,
    zoneId: TravelInsuranceZone = 'ZONE_TURKEY_NEIGHBORS',
    durationId: string = '1-7',
    passengersAges: InsuranceAgeBracket[] = ['13-65']
  ): CalculatedInsuranceCard | undefined {
    const basePlan = BASE_INSURANCE_PLANS.find(
      (p) => p.id === planId || planId.startsWith(p.id)
    );
    if (!basePlan) return undefined;
    return this.calculatePlanPrice(basePlan, zoneId, durationId, passengersAges);
  }

  static async getPlanByIdAsync(
    planId: string,
    zoneId: TravelInsuranceZone = 'ZONE_TURKEY_NEIGHBORS',
    durationId: string = '1-7',
    passengersAges: InsuranceAgeBracket[] = ['13-65']
  ): Promise<CalculatedInsuranceCard | undefined> {
    const plans = await this.getBasePlansAsync();
    const basePlan = plans.find((p) => p.id === planId || planId.startsWith(p.id));
    if (!basePlan) return undefined;
    return this.calculatePlanPrice(basePlan, zoneId, durationId, passengersAges);
  }
}
