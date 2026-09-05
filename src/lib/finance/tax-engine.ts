import { Money } from '@/lib/finance';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface TaxCalculationParams {
  taxableAmount: Money | Prisma.Decimal | number;
  jurisdiction?: string;
  serviceType?: 'FLIGHT' | 'HOTEL' | 'TRANSFER' | 'TOUR' | 'INSURANCE' | 'VISA' | 'ESIM' | 'GENERAL';
  currency?: string;
  effectiveDate?: Date;
}

export interface TaxCalculationResult {
  taxableAmount: Money;
  taxRate: Prisma.Decimal;
  taxAmount: Money;
  totalWithTax: Money;
  jurisdiction: string;
  serviceType: string;
  ruleId?: string;
  ruleVersion?: string;
}

export interface StaticTaxRule {
  jurisdiction: string;
  category: string;
  rate: Prisma.Decimal;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

export class TaxEngine {
  // Versioned default rules
  private static versionedRules: StaticTaxRule[] = [
    { jurisdiction: 'IR', category: 'GENERAL', rate: new Prisma.Decimal('0.09'), effectiveFrom: new Date('2020-01-01') },
    { jurisdiction: 'IR', category: 'FLIGHT', rate: new Prisma.Decimal('0.09'), effectiveFrom: new Date('2020-01-01') },
    { jurisdiction: 'IR', category: 'HOTEL', rate: new Prisma.Decimal('0.09'), effectiveFrom: new Date('2020-01-01') },
    { jurisdiction: 'IR', category: 'TOUR', rate: new Prisma.Decimal('0.09'), effectiveFrom: new Date('2020-01-01') },
    { jurisdiction: 'IR', category: 'TRANSFER', rate: new Prisma.Decimal('0.09'), effectiveFrom: new Date('2020-01-01') },
    { jurisdiction: 'IR', category: 'INSURANCE', rate: new Prisma.Decimal('0.00'), effectiveFrom: new Date('2020-01-01') },
    { jurisdiction: 'IR', category: 'VISA', rate: new Prisma.Decimal('0.00'), effectiveFrom: new Date('2020-01-01') },
    { jurisdiction: 'IR', category: 'ESIM', rate: new Prisma.Decimal('0.00'), effectiveFrom: new Date('2020-01-01') },
    { jurisdiction: 'GLOBAL', category: 'GENERAL', rate: new Prisma.Decimal('0.00'), effectiveFrom: new Date('2020-01-01') },
    { jurisdiction: 'GLOBAL', category: 'EXEMPT', rate: new Prisma.Decimal('0.00'), effectiveFrom: new Date('2020-01-01') },
    { jurisdiction: 'CN', category: 'GENERAL', rate: new Prisma.Decimal('0.06'), effectiveFrom: new Date('2020-01-01') },
    { jurisdiction: 'AE', category: 'GENERAL', rate: new Prisma.Decimal('0.05'), effectiveFrom: new Date('2020-01-01') },
    { jurisdiction: 'TR', category: 'GENERAL', rate: new Prisma.Decimal('0.10'), effectiveFrom: new Date('2020-01-01') },
  ];

  /**
   * Synchronous pure calculation using versioned rules
   */
  static calculateTax(params: TaxCalculationParams): TaxCalculationResult {
    const currency = params.currency || (params.taxableAmount instanceof Money ? params.taxableAmount.currency : 'IRR');
    const taxable = params.taxableAmount instanceof Money
      ? params.taxableAmount
      : new Money(params.taxableAmount, currency);
    
    const jurisdiction = (params.jurisdiction || 'IR').toUpperCase();
    const serviceType = (params.serviceType || 'GENERAL').toUpperCase();
    const effectiveDate = params.effectiveDate || new Date();

    const matchedRule = this.versionedRules.find(
      (r) =>
        r.jurisdiction === jurisdiction &&
        r.category === serviceType &&
        effectiveDate >= r.effectiveFrom &&
        (!r.effectiveTo || effectiveDate <= r.effectiveTo)
    ) || this.versionedRules.find(
      (r) =>
        r.jurisdiction === jurisdiction &&
        r.category === 'GENERAL' &&
        effectiveDate >= r.effectiveFrom &&
        (!r.effectiveTo || effectiveDate <= r.effectiveTo)
    ) || {
      jurisdiction,
      category: serviceType,
      rate: new Prisma.Decimal('0.09'),
      effectiveFrom: new Date('2020-01-01'),
    };

    const taxRate = matchedRule.rate;
    const taxAmount = taxable.mul(taxRate).round(0);
    const totalWithTax = taxable.add(taxAmount);

    return {
      taxableAmount: taxable,
      taxRate,
      taxAmount,
      totalWithTax,
      jurisdiction,
      serviceType,
      ruleVersion: `v_${matchedRule.effectiveFrom.toISOString().slice(0, 10)}`,
    };
  }

  /**
   * Async database-backed tax rate lookup with fallback to versioned defaults
   */
  static async resolveTaxRule(params: TaxCalculationParams): Promise<TaxCalculationResult> {
    const jurisdictionCode = (params.jurisdiction || 'IR').toUpperCase();
    const serviceType = (params.serviceType || 'GENERAL').toUpperCase();
    const effectiveDate = params.effectiveDate || new Date();

    try {
      const dbRule = await prisma.taxRule.findFirst({
        where: {
          jurisdiction: { code: jurisdictionCode },
          category: serviceType,
          isActive: true,
          effectiveFrom: { lte: effectiveDate },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: effectiveDate } },
          ],
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (dbRule) {
        const currency = params.currency || (params.taxableAmount instanceof Money ? params.taxableAmount.currency : 'IRR');
        const taxable = params.taxableAmount instanceof Money
          ? params.taxableAmount
          : new Money(params.taxableAmount, currency);

        const taxRate = dbRule.ratePercentage;
        const taxAmount = taxable.mul(taxRate).round(0);
        const totalWithTax = taxable.add(taxAmount);

        return {
          taxableAmount: taxable,
          taxRate,
          taxAmount,
          totalWithTax,
          jurisdiction: jurisdictionCode,
          serviceType,
          ruleId: dbRule.id,
          ruleVersion: `db_${dbRule.effectiveFrom.toISOString().slice(0, 10)}`,
        };
      }
    } catch {
      // Fall back to in-memory versioned rules if DB query fails or unseeded
    }

    return this.calculateTax(params);
  }

  static getRate(jurisdiction: string = 'IR', serviceType: string = 'GENERAL'): Prisma.Decimal {
    return this.calculateTax({
      taxableAmount: Money.zero(),
      jurisdiction,
      serviceType: serviceType as TaxCalculationParams['serviceType'],
    }).taxRate;
  }
}
