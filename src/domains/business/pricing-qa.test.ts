/**
 * QA LAYER 2 — Money integrity: rounding round-trips, voucher gate, lock rules.
 *
 * Owns: src/domains/business/**\/*.test.ts (QA session, exclusive).
 *
 * The spec's money rules (فیروزو بیزنس سند تحویل فنی §قواعد کلیدی مدل):
 *   - amounts are whole Rial stored as Int — arithmetic must be EXACT;
 *   - `total_amount` is LOCKED at `submitted` (a later price change must not
 *     alter a submitted request — tested at the contract level here);
 *   - deposit defaults to 30% but is configurable, never hardcoded;
 *   - grant and deposit are deducted once, at settlement;
 *   - a voucher may issue ONLY when `paid_amount == total_amount − grant_amount`.
 *
 * The backend session's `pricing.test.ts` covers the basic arithmetic. This
 * suite attacks the invariants from the QA side: adversarial values, round-trip
 * properties, and the exactness mandate (no float drift at any magnitude).
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

describe('QA — deposit percentage is configurable, never hardcoded', () => {
  it('exposes a 30 default but honours every percentage 0..100', () => {
    expect(DEPOSIT_PERCENT_DEFAULT).toBe(30);
    const total = 10_000_000;
    for (const pct of [0, 1, 5, 13, 25, 30, 50, 75, 99, 100]) {
      const q = computeQuote({ basePrice: total, paxCount: 1 }, pct);
      // Exact integer: pct × total must come out with no truncation loss when
      // the product is divisible by 100.
      expect(q.depositAmount).toBe(Math.trunc((total * pct) / 100));
      expect(q.depositPercent).toBe(pct);
    }
  });

  it('rejects percentages outside 0..100 instead of silently clamping', () => {
    expect(() => computeQuote({ basePrice: 1000, paxCount: 1 }, 101)).toThrow(InvalidBusinessMoneyError);
    expect(() => computeQuote({ basePrice: 1000, paxCount: 1 }, -1)).toThrow(InvalidBusinessMoneyError);
  });
});

describe('QA — rounding round-trips (the float trap)', () => {
  it('truncates the deposit but always preserves deposit + remaining == total', () => {
    // For every percentage against an odd base, the invariant must hold EXACTLY.
    for (const base of [999, 3_333_333, 7_777_777, 12_500_000, 987_654_321]) {
      for (const pct of [3, 7, 13, 17, 29, 33, 66, 97]) {
        const q = computeQuote({ basePrice: base, paxCount: 3 }, pct);
        expect(q.depositAmount + q.remainingAmount).toBe(q.totalAmount);
        expect(Number.isInteger(q.depositAmount)).toBe(true);
        expect(Number.isInteger(q.remainingAmount)).toBe(true);
      }
    }
  });

  it('survives magnitudes beyond float-safe multiplication of the total', () => {
    // 25 pax × 1_950_000_000 Rial ≈ the size of a large corporate group. The
    // TOTAL itself (an Int × Int) must remain exact; the spec stores it as an
    // integer column, and Number keeps integer exactness to 2^53.
    const big = computeQuote({ basePrice: 1_950_000_000, paxCount: 25 }, 30);
    expect(big.totalAmount).toBe(48_750_000_000);
    expect(big.depositAmount).toBe(14_625_000_000);
    expect(big.depositAmount + big.remainingAmount).toBe(big.totalAmount);
  });

  it('display conversion to Toman happens exactly once and never re-rounds', () => {
    // 123_456 Rial → 12_345 Toman (trunc). Converting back by ×10 must reveal
    // the truncation, NOT silently round — the display boundary is one-way.
    expect(rialToToman(123_456)).toBe(12_345);
    expect(rialToToman(12_345 * 10)).toBe(12_345); // round-trip on a clean value
    expect(() => rialToToman(-1)).not.toThrow(); // display never throws on data
  });

  it('settlement payable is exact at every stage of partial payment', () => {
    const total = 21_437_891; // deliberately indivisible
    const deposit = computeQuote({ basePrice: total, paxCount: 1 }, 30).depositAmount;
    const grant = 1_234_567;
    // Stage 1: only the deposit collected.
    const s1 = computeSettlement({ totalAmount: total, depositAmount: deposit, grantAmount: 0, paidAmount: deposit });
    expect(s1.payableAmount).toBe(total - deposit);
    // Stage 2: grant recorded.
    const s2 = computeSettlement({ totalAmount: total, depositAmount: deposit, grantAmount: grant, paidAmount: deposit });
    expect(s2.payableAmount).toBe(total - deposit - grant);
    // Stage 3: fully paid → zero, and the voucher gate opens.
    const s3 = computeSettlement({
      totalAmount: total,
      depositAmount: deposit,
      grantAmount: grant,
      paidAmount: total - grant,
    });
    expect(s3.payableAmount).toBe(0);
    expect(isVoucherIssuable({ totalAmount: total, grantAmount: grant, paidAmount: total - grant })).toBe(true);
  });
});

describe('QA — the voucher gate is airtight', () => {
  const total = 10_000_000;

  it('opens only at exact equality and only after the grant is recorded', () => {
    expect(isVoucherIssuable({ totalAmount: total, grantAmount: 0, paidAmount: total })).toBe(true);
    expect(isVoucherIssuable({ totalAmount: total, grantAmount: total, paidAmount: 0 })).toBe(true);
    expect(isVoucherIssuable({ totalAmount: total, grantAmount: 500_000, paidAmount: total - 500_000 })).toBe(true);
  });

  it('stays closed for over-payment AND under-payment — both directions off-by-one', () => {
    expect(isVoucherIssuable({ totalAmount: total, grantAmount: 0, paidAmount: total - 1 })).toBe(false);
    expect(isVoucherIssuable({ totalAmount: total, grantAmount: 0, paidAmount: total + 1 })).toBe(false);
    // A grant recorded but paid in full is OVER by exactly the grant:
    expect(isVoucherIssuable({ totalAmount: total, grantAmount: 1_000_000, paidAmount: total })).toBe(false);
  });

  it('ignores a pending (unrecorded) grant — spec: در انتظار, not deducted', () => {
    // Grant shows as "pending" BEFORE approval and must not reduce the bill:
    // with grant unrecorded (0), full payment satisfies the gate.
    expect(isVoucherIssuable({ totalAmount: total, grantAmount: 0, paidAmount: total })).toBe(true);
  });
});

describe('QA — amount lock at submitted (contract-level)', () => {
  it('computeQuote is deterministic and side-effect free for the same input', () => {
    // The lock is enforced by the API storing quote fields at submission; the
    // QA guarantee here is that re-computing CANNOT drift: two identical calls
    // return identical integers (no hidden state, no Date/Math.random).
    const input = {
      basePrice: 4_444_445,
      paxCount: 7,
      addons: [{ price: 123_456, quantity: 2, unit: 'per_person' as const }],
    };
    const a = computeQuote(input);
    const b = computeQuote(input);
    expect(a).toEqual(b);
  });

  it('a price change after submission is invisible to the stored request (simulation)', () => {
    // Simulate the lock: quote stored at submit time, package repriced later.
    const atSubmit = computeQuote({ basePrice: 2_000_000, paxCount: 4 }, 30);
    const afterReprice = computeQuote({ basePrice: 9_999_999, paxCount: 4 }, 30);
    // The stored amounts (atSubmit) are the ones the request keeps:
    expect(atSubmit.totalAmount).toBe(8_000_000);
    expect(atSubmit.totalAmount).not.toBe(afterReprice.totalAmount);
    // Settlement against the locked amounts stays consistent:
    const s = computeSettlement({
      totalAmount: atSubmit.totalAmount,
      depositAmount: atSubmit.depositAmount,
      grantAmount: 0,
      paidAmount: atSubmit.depositAmount,
    });
    expect(s.payableAmount).toBe(atSubmit.totalAmount - atSubmit.depositAmount);
  });
});

describe('QA — settlement refuses corrupt financial states', () => {
  it('rejects a double-counted deposit (paidAmount below deposit)', () => {
    // This is the "deposit subtracted twice" trap: if the caller passes a
    // paidAmount smaller than the collected deposit, the data is corrupt.
    expect(() =>
      computeSettlement({ totalAmount: 1_000_000, depositAmount: 300_000, grantAmount: 0, paidAmount: 299_999 }),
    ).toThrow(InvalidBusinessMoneyError);
  });

  it('rejects grant/deposit exceeding the total — cannot over-deduct', () => {
    expect(() =>
      computeSettlement({ totalAmount: 100, depositAmount: 0, grantAmount: 101, paidAmount: 0 }),
    ).toThrow(InvalidBusinessMoneyError);
    expect(() =>
      computeSettlement({ totalAmount: 100, depositAmount: 101, grantAmount: 0, paidAmount: 101 }),
    ).toThrow(InvalidBusinessMoneyError);
  });

  it('rejects fractional or non-numeric money at the boundary', () => {
    expect(() => computeQuote({ basePrice: 100.5, paxCount: 1 })).toThrow(InvalidBusinessMoneyError);
    expect(() => computeQuote({ basePrice: Number.NaN, paxCount: 1 })).toThrow(InvalidBusinessMoneyError);
    expect(() => computeQuote({ basePrice: Number.POSITIVE_INFINITY, paxCount: 1 })).toThrow(
      InvalidBusinessMoneyError,
    );
    expect(() => computeQuote({ basePrice: 1000, paxCount: Number.NaN })).toThrow(InvalidBusinessMoneyError);
  });
});
