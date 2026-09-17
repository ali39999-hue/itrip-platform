/**
 * @packages/money
 *
 * Immutable monetary calculation standards, rounding rules, and precision helpers.
 * Strictly forbids IEEE 754 floating-point operations on currency.
 */
import { Prisma } from '@prisma/client';

export type DecimalValue = Prisma.Decimal | string | number;

export class Money {
  public readonly amount: Prisma.Decimal;
  public readonly currency: string;

  constructor(amount: DecimalValue | Money, currency: string = 'IRR') {
    if (amount instanceof Money) {
      this.amount = amount.amount;
      this.currency = amount.currency;
      return;
    }
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

  static from(amount: DecimalValue | Money, currency: string = 'IRR'): Money {
    return new Money(amount, currency);
  }

  static sum(items: Money[], defaultCurrency: string = 'IRR'): Money {
    if (items.length === 0) return Money.zero(defaultCurrency);
    const curr = items[0].currency;
    return items.reduce((acc, cur) => acc.add(cur), Money.zero(curr));
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: Cannot operate on ${this.currency} and ${other.currency}`);
    }
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount.plus(other.amount), this.currency);
  }

  sub(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount.minus(other.amount), this.currency);
  }

  mul(factor: DecimalValue): Money {
    const decFactor = factor instanceof Prisma.Decimal ? factor : new Prisma.Decimal(factor.toString());
    return new Money(this.amount.times(decFactor), this.currency);
  }

  div(divisor: DecimalValue): Money {
    const decDiv = divisor instanceof Prisma.Decimal ? divisor : new Prisma.Decimal(divisor.toString());
    if (decDiv.isZero()) throw new Error('Division by zero in Money');
    return new Money(this.amount.dividedBy(decDiv), this.currency);
  }

  round(decimalPlaces: number = 0): Money {
    return new Money(this.amount.toDecimalPlaces(decimalPlaces, Prisma.Decimal.ROUND_HALF_UP), this.currency);
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.amount.equals(other.amount);
  }

  greaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount.greaterThan(other.amount);
  }

  toNumber(): number {
    return this.amount.toNumber();
  }

  toString(): string {
    return `${this.amount.toString()} ${this.currency}`;
  }

  toDecimal(): Prisma.Decimal {
    return this.amount;
  }
}
