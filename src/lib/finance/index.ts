import { Prisma } from '@prisma/client';

export type DecimalValue = Prisma.Decimal | string | number;

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
