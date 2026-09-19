import { describe, it, expect } from 'vitest';
import { InsuranceService } from './insurance-service';
import { BASE_INSURANCE_PLANS } from '@/lib/insurance-data';

describe('InsuranceService', () => {
  it('should list all insurance companies and assistance partners', () => {
    const companies = InsuranceService.getCompanies();
    expect(companies.length).toBeGreaterThanOrEqual(6);
    expect(companies.some((c) => c.id === 'saman')).toBe(true);
    expect(companies.some((c) => c.id === 'kowsar')).toBe(true);
    expect(companies.some((c) => c.id === 'razi')).toBe(true);
    expect(companies.some((c) => c.id === 'iran')).toBe(true);

    const partners = InsuranceService.getAssistancePartners();
    expect(partners.length).toBeGreaterThanOrEqual(4);
    expect(partners.some((p) => p.id === 'swiss_assist')).toBe(true);
    expect(partners.some((p) => p.id === 'remed')).toBe(true);
  });

  it('should calculate exact base tariff matching Azki user screenshots for 1-7 days Zone 1', () => {
    const kowsarPlan = BASE_INSURANCE_PLANS.find((p) => p.id === 'kowsar-50k-swiss');
    expect(kowsarPlan).toBeDefined();

    const kowsarQuote = InsuranceService.calculatePlanPrice(
      kowsarPlan!,
      'ZONE_TURKEY_NEIGHBORS',
      '1-7',
      ['13-65']
    );
    // Exact match with user Screenshot 1 & 2: 174,240 Toman
    expect(kowsarQuote.finalPriceToman).toBe(174240);
    expect(kowsarQuote.finalPriceRials).toBe(1742400);

    const raziPlan = BASE_INSURANCE_PLANS.find((p) => p.id === 'razi-50k-remed');
    expect(raziPlan).toBeDefined();
    const raziQuote = InsuranceService.calculatePlanPrice(
      raziPlan!,
      'ZONE_TURKEY_NEIGHBORS',
      '1-7',
      ['13-65']
    );
    // Exact match with user Screenshot 2: 181,433 Toman
    expect(raziQuote.finalPriceToman).toBe(181433);

    const iran10kPlan = BASE_INSURANCE_PLANS.find((p) => p.id === 'iran-10k-swiss');
    expect(iran10kPlan).toBeDefined();
    const iran10kQuote = InsuranceService.calculatePlanPrice(
      iran10kPlan!,
      'ZONE_TURKEY_NEIGHBORS',
      '1-7',
      ['13-65']
    );
    // Exact match with user Screenshot 2: 57,191 Toman
    expect(iran10kQuote.finalPriceToman).toBe(57191);

    const iran30kPlan = BASE_INSURANCE_PLANS.find((p) => p.id === 'iran-30k-swiss');
    expect(iran30kPlan).toBeDefined();
    const iran30kQuote = InsuranceService.calculatePlanPrice(
      iran30kPlan!,
      'ZONE_TURKEY_NEIGHBORS',
      '1-7',
      ['13-65']
    );
    // Exact match with user Screenshot 3: 69,930 Toman
    expect(iran30kQuote.finalPriceToman).toBe(69930);
  });

  it('should scale price accurately for multiple travelers with age bracket multipliers', () => {
    const kowsarPlan = BASE_INSURANCE_PLANS.find((p) => p.id === 'kowsar-50k-swiss')!;

    // 1 standard adult (13-65 -> 1.0) + 1 senior (66-70 -> 1.50) + 1 child (0-12 -> 0.85)
    const quote = InsuranceService.calculatePlanPrice(
      kowsarPlan,
      'ZONE_TURKEY_NEIGHBORS',
      '1-7',
      ['13-65', '66-70', '0-12']
    );

    expect(quote.passengersCount).toBe(3);
    expect(quote.passengerLineItems.length).toBe(3);

    const p1 = quote.passengerLineItems[0];
    const p2 = quote.passengerLineItems[1];
    const p3 = quote.passengerLineItems[2];

    expect(p1.individualPriceToman).toBe(174240);
    expect(p2.individualPriceToman).toBe(Math.round(174240 * 1.5));
    expect(p3.individualPriceToman).toBe(Math.round(174240 * 0.85));

    expect(quote.finalPriceToman).toBe(
      p1.individualPriceToman + p2.individualPriceToman + p3.individualPriceToman
    );
  });

  it('should filter plans by Schengen compliance (enforcing min 30k coverage)', () => {
    const schengenResults = InsuranceService.searchPlans({
      zoneId: 'ZONE_SCHENGEN_EUROPE',
      durationId: '1-7',
      passengersAges: ['13-65'],
    });

    expect(schengenResults.length).toBeGreaterThan(0);
    // All returned plans for Schengen must have coverage >= 30,000 EUR
    expect(schengenResults.every((r) => r.coverageEur >= 30000)).toBe(true);
  });

  it('should filter by specific coverage limit (e.g. 50,000 EUR)', () => {
    const results50k = InsuranceService.searchPlans({
      zoneId: 'ZONE_TURKEY_NEIGHBORS',
      durationId: '1-7',
      coverageLimits: [50000],
    });

    expect(results50k.length).toBeGreaterThan(0);
    expect(results50k.every((r) => r.coverageEur === 50000)).toBe(true);
  });
});
