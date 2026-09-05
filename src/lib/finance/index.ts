import { Prisma } from '@prisma/client';

export type DecimalValue = Prisma.Decimal | string | number;

export interface MoneyLine {
  description: string;
  amount: Money;
  category?: 'SUPPLIER_COST' | 'MARKUP' | 'TAX' | 'FEE' | 'DISCOUNT' | 'ADDON';
}

export interface MoneyBreakdown {
  baseCost: Money;
  supplierFee: Money;
  markupAmount: Money;
  taxAmount: Money;
  platformFee: Money;
  discountAmount: Money;
  roundingDelta: Money;
  sellPrice: Money;
  currency: string;
  lines?: MoneyLine[];
}

export interface FxSnapshot {
  transactionCurrency: string;
  transactionAmount: Money;
  baseCurrency: string;
  baseAmount: Money;
  fxRate: Prisma.Decimal;
  fxSource: string;
  fxTimestamp: Date;
}

export class Money {
  public readonly amount: Prisma.Decimal;
  public readonly currency: string;

  constructor(amount: DecimalValue, currency: string = 'IRR') {
    if (amount instanceof Prisma.Decimal) {
      this.amount = amount;
    } else {
      this.amount = new Prisma.Decimal(amount.toString());
    }
    this.currency = currency.toUpperCase();
  }

  static zero(currency: string = 'IRR'): Money {
    return new Money(0, currency);
  }

  static from(amount: DecimalValue, currency: string = 'IRR'): Money {
    return new Money(amount, currency);
  }

  add(other: Money | DecimalValue): Money {
    if (other instanceof Money) {
      this.assertSameCurrency(other);
      return new Money(this.amount.add(other.amount), this.currency);
    }
    return new Money(this.amount.add(new Prisma.Decimal(other.toString())), this.currency);
  }

  sub(other: Money | DecimalValue): Money {
    if (other instanceof Money) {
      this.assertSameCurrency(other);
      return new Money(this.amount.sub(other.amount), this.currency);
    }
    return new Money(this.amount.sub(new Prisma.Decimal(other.toString())), this.currency);
  }

  mul(factor: DecimalValue): Money {
    const dFactor = factor instanceof Prisma.Decimal ? factor : new Prisma.Decimal(factor.toString());
    return new Money(this.amount.mul(dFactor), this.currency);
  }

  div(divisor: DecimalValue): Money {
    const dDivisor = divisor instanceof Prisma.Decimal ? divisor : new Prisma.Decimal(divisor.toString());
    if (dDivisor.isZero()) {
      throw new Error('Division by zero in Money kernel');
    }
    return new Money(this.amount.div(dDivisor), this.currency);
  }

  round(decimalPlaces: number = 0): Money {
    return new Money(this.amount.toDecimalPlaces(decimalPlaces, Prisma.Decimal.ROUND_HALF_UP), this.currency);
  }

  /**
   * Currency-aware rounding:
   * IRR: Round to nearest 10,000 Rials (1,000 Tomans) without JS float division
   * Others (USD, EUR, USDT, AED): 2 decimal places
   */
  roundForCurrency(): { rounded: Money; delta: Money } {
    if (this.currency === 'IRR') {
      const step = new Prisma.Decimal(10000);
      const units = this.amount.dividedBy(step).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
      const roundedAmount = units.mul(step);
      const rounded = new Money(roundedAmount, this.currency);
      const delta = rounded.sub(this);
      return { rounded, delta };
    }
    const rounded = this.round(2);
    const delta = rounded.sub(this);
    return { rounded, delta };
  }

  convert(rate: DecimalValue, targetCurrency: string, source: string = 'CENTRAL_BANK'): FxSnapshot {
    const dRate = rate instanceof Prisma.Decimal ? rate : new Prisma.Decimal(rate.toString());
    if (dRate.lessThanOrEqualTo(0)) {
      throw new Error(`Invalid FX rate: must be strictly positive, got ${dRate.toString()}`);
    }
    const convertedAmount = this.amount.mul(dRate);
    const targetMoney = new Money(convertedAmount, targetCurrency);

    return {
      transactionCurrency: this.currency,
      transactionAmount: this,
      baseCurrency: targetCurrency.toUpperCase(),
      baseAmount: targetMoney,
      fxRate: dRate,
      fxSource: source,
      fxTimestamp: new Date(),
    };
  }

  isPositive(): boolean {
    return this.amount.greaterThan(0);
  }

  isNegative(): boolean {
    return this.amount.lessThan(0);
  }

  isZero(): boolean {
    return this.amount.isZero();
  }

  equals(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount.equals(other.amount);
  }

  greaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount.greaterThan(other.amount);
  }

  lessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount.lessThan(other.amount);
  }

  toNumber(): number {
    return this.amount.toNumber();
  }

  toString(): string {
    return this.amount.toString();
  }

  toDecimal(): Prisma.Decimal {
    return this.amount;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch in Money operation: ${this.currency} !== ${other.currency}`);
    }
  }
}
