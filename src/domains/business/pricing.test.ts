/**
 * Business pricing — the money invariants of the technology-tour spec.
 *
 * Amounts are whole Rial in an Int, so these tests exist to prove that no
 * rounding, float drift or percentage mistake can creep into a quote.
 */

import { describe, it, expect } from 'vitest';
import {
  DEPOSIT_PERCENT_DEFAULT,
  computeQuote,
  computeSettlement,
  isVoucherIssuable,
  rialToToman,
} from './pricing';
import { InvalidBusinessMoneyError } from './money-errors';

describe('computeQuote', () => {
  it('multiplies base price by pax count with no rounding', () => {
    const q = computeQuote({ basePrice: 12_500_000, paxCount: 4 });
    expect(q.totalAmount).toBe(50_000_000);
    expect(Number.isInteger(q.totalAmount)).toBe(true);
  });

  it('defaults the deposit to 30% and keeps the percentage configurable', () => {
    expect(DEPOSIT_PERCENT_DEFAULT).toBe(30);
    // base 1,000,000 × 10 pax = 10,000,000 total; 30% of that = 3,000,000.
    expect(computeQuote({ basePrice: 1_000_000, paxCount: 10 }).depositAmount).toBe(3_000_000);
    expect(computeQuote({ basePrice: 1_000_000, paxCount: 10 }, 20).depositAmount).toBe(2_000_000);
    expect(computeQuote({ basePrice: 1_000_000, paxCount: 10 }, 0).depositAmount).toBe(0);
    expect(computeQuote({ basePrice: 1_000_000, paxCount: 10 }, 100).depositAmount).toBe(10_000_000);
  });

  it('scales per_person add-ons with pax count but charges per_group once', () => {
    const q = computeQuote({
      basePrice: 1_000_000,
      paxCount: 5,
      addons: [
        { price: 200_000, quantity: 1, unit: 'per_person' }, // 200k × 5
        { price: 3_000_000, quantity: 1, unit: 'per_group' }, // 3M once
      ],
    });
    expect(q.totalAmount).toBe(1_000_000 * 5 + 200_000 * 5 + 3_000_000);
  });

  it('truncates only the deposit percentage, never the total', () => {
    // 999 × 3 / 100 = 29.97 -> 29. The total must stay 999.
    const q = computeQuote({ basePrice: 333, paxCount: 3 }, 3);
    expect(q.totalAmount).toBe(999);
    expect(q.depositAmount).toBe(29);
  });

  it('keeps deposit + remaining equal to the total for every percentage', () => {
    for (const percent of [0, 1, 7, 30, 33, 50, 99, 100]) {
      const q = computeQuote({ basePrice: 7_777_777, paxCount: 3 }, percent);
      expect(q.depositAmount + q.remainingAmount).toBe(q.totalAmount);
    }
  });

  it('rejects non-integer, negative or zero inputs', () => {
    expect(() => computeQuote({ basePrice: 1.5, paxCount: 1 })).toThrow(InvalidBusinessMoneyError);
    expect(() => computeQuote({ basePrice: -1, paxCount: 1 })).toThrow(InvalidBusinessMoneyError);
    expect(() => computeQuote({ basePrice: 100, paxCount: 0 })).toThrow(InvalidBusinessMoneyError);
    expect(() => computeQuote({ basePrice: 100, paxCount: 1.5 })).toThrow(InvalidBusinessMoneyError);
    expect(() => computeQuote({ basePrice: 100, paxCount: 1 }, 101)).toThrow(InvalidBusinessMoneyError);
  });

  it('carries a stable code on the error', () => {
    try {
      computeQuote({ basePrice: -5, paxCount: 1 });
    } catch (error) {
      expect((error as InvalidBusinessMoneyError).code).toBe('invalid_amount');
    }
  });
});

describe('computeSettlement', () => {
  it('deducts the grant and the deposit already collected', () => {
    // total 10,000,000 − grant 1,000,000 − paid 3,000,000 (the deposit) = 6,000,000
    const r = computeSettlement({
      totalAmount: 10_000_000,
      depositAmount: 3_000_000,
      grantAmount: 1_000_000,
      paidAmount: 3_000_000,
    });
    expect(r.payableAmount).toBe(6_000_000);
    expect(r.grantApplied).toBe(true);
  });

  it('does NOT subtract the deposit twice', () => {
    // The deposit is already inside paidAmount. Billing it again would charge
    // 3,000,000 a second time and under-bill by exactly the deposit.
    const total = 10_000_000;
    const deposit = 3_000_000;
    const grant = 1_000_000;
    const r = computeSettlement({ totalAmount: total, depositAmount: deposit, grantAmount: grant, paidAmount: deposit });
    expect(r.payableAmount).toBe(total - grant - deposit);
  });

  it('ignores the grant until it is actually recorded', () => {
    const r = computeSettlement({
      totalAmount: 10_000_000,
      depositAmount: 3_000_000,
      grantAmount: 0,
      paidAmount: 3_000_000,
    });
    expect(r.payableAmount).toBe(7_000_000);
    expect(r.grantApplied).toBe(false);
  });

  it('never returns a negative payable amount on an over-payment', () => {
    const r = computeSettlement({
      totalAmount: 1_000_000,
      depositAmount: 1_000_000,
      grantAmount: 0,
      paidAmount: 1_000_000,
    });
    expect(r.payableAmount).toBe(0);
  });

  it('rejects a paidAmount below the deposit already collected', () => {
    expect(() =>
      computeSettlement({ totalAmount: 100, depositAmount: 50, grantAmount: 0, paidAmount: 10 }),
    ).toThrow(InvalidBusinessMoneyError);
  });

  it('rejects a grant or deposit larger than the total', () => {
    expect(() =>
      computeSettlement({ totalAmount: 100, depositAmount: 0, grantAmount: 101, paidAmount: 0 }),
    ).toThrow(InvalidBusinessMoneyError);
    expect(() =>
      computeSettlement({ totalAmount: 100, depositAmount: 101, grantAmount: 0, paidAmount: 101 }),
    ).toThrow(InvalidBusinessMoneyError);
  });
});

describe('isVoucherIssuable', () => {
  it('is true only when paid equals total minus grant', () => {
    expect(isVoucherIssuable({ totalAmount: 10_000_000, grantAmount: 1_000_000, paidAmount: 9_000_000 })).toBe(true);
    expect(isVoucherIssuable({ totalAmount: 10_000_000, grantAmount: 0, paidAmount: 10_000_000 })).toBe(true);
  });

  it('is false for a one-Rial shortfall, so a voucher cannot slip through', () => {
    expect(isVoucherIssuable({ totalAmount: 10_000_000, grantAmount: 0, paidAmount: 9_999_999 })).toBe(false);
  });

  it('is false when the grant has not been applied yet', () => {
    expect(isVoucherIssuable({ totalAmount: 10_000_000, grantAmount: 1_000_000, paidAmount: 10_000_000 })).toBe(false);
  });
});

describe('rialToToman', () => {
  it('converts only at the display boundary', () => {
    expect(rialToToman(10_000)).toBe(1_000);
    expect(rialToToman(1_999)).toBe(199);
    expect(rialToToman(0)).toBe(0);
  });
});
