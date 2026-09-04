import { Money } from '@/lib/finance';
import { Prisma } from '@prisma/client';

export interface TaxCalculationParams {
  taxableAmount: Money | Prisma.Decimal | number;
  jurisdiction?: string;
  serviceType?: 'FLIGHT' | 'HOTEL' | 'TRANSFER' | 'TOUR' | 'INSURANCE' | 'GENERAL';
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
}

export class TaxEngine {
  private static defaultRates: Record<string, number> = {
    'IR:GENERAL': 0.09,
    'IR:FLIGHT': 0.09,
    'IR:HOTEL': 0.09,
    'IR:TOUR': 0.09,
    'IR:TRANSFER': 0.09,
    'IR:INSURANCE': 0.00,
    'GLOBAL:EXEMPT': 0.00,
  };

  static calculateTax(params: TaxCalculationParams): TaxCalculationResult {
    const currency = params.currency || (params.taxableAmount instanceof Money ? params.taxableAmount.currency : 'IRR');
    const taxable = params.taxableAmount instanceof Money ? params.taxableAmount : new Money(params.taxableAmount, currency);
    
    const jurisdiction = (params.jurisdiction || 'IR').toUpperCase();
    const serviceType = params.serviceType || 'GENERAL';
    const key = `${jurisdiction}:${serviceType}`;
    
    const rateNumber = this.defaultRates[key] ?? this.defaultRates[`${jurisdiction}:GENERAL`] ?? 0.09;
    const taxRate = new Prisma.Decimal(rateNumber.toString());
    
    const taxAmount = taxable.mul(taxRate).round(0);
    const totalWithTax = taxable.add(taxAmount);

    return {
      taxableAmount: taxable,
      taxRate,
      taxAmount,
      totalWithTax,
      jurisdiction,
      serviceType,
    };
  }

  static getRate(jurisdiction: string = 'IR', serviceType: string = 'GENERAL'): Prisma.Decimal {
    const key = `${jurisdiction.toUpperCase()}:${serviceType.toUpperCase()}`;
    const rate = this.defaultRates[key] ?? this.defaultRates[`${jurisdiction.toUpperCase()}:GENERAL`] ?? 0.09;
    return new Prisma.Decimal(rate.toString());
  }
}
