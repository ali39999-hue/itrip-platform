/**
 * QA LAYER 4a — Payment integrity against the M1 schema (data-level).
 *
 * Owns: src/domains/business/**\/*.test.ts (QA session, exclusive).
 *
 * The backend session has not delivered the API routes yet, so this suite pins
 * what M1 already guarantees at the DATA level (`prisma/schema.prisma`):
 *   - `BusinessPayment.idempotencyKey` is UNIQUE — a double-click may create
 *     no second payment row (the API must still pass the key through; that
 *     part is tested when routes land);
 *   - payment `kind` is deposit | settlement and `amount` is whole Rial;
 *   - the voucher gate (`paid_amount == total_amount − grant_amount`) holds on
 *     REAL rows, not only on pure functions.
 *
 * Cleanup contract (AGENTS.md §Testing): every fixture is run-scoped via
 * `suffix` (BUSINESS_RECONCILIATION.md §تلهٔ ۳) and removed in afterAll.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { isVoucherIssuable } from '../pricing';

const suffix = `qa4_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const nationalId = `00123${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`;
const repPhone = `0912${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;
const idemBase = `QA4-${suffix}`;
const requestCode = `FZB-2026-${suffix}`;
const pkgSlug = `biz-qa4-${suffix}`;

let companyRef: { id: string } | null = null;
let departureRef: { id: string } | null = null;
const requestIds: string[] = [];
let seq = 0;

afterAll(async () => {
  // Children first — payments/vouchers restrict the request, which restricts
  // the departure and company (mirrors firuzo-core-client.test.ts cleanup).
  await prisma.businessPayment.deleteMany({ where: { requestId: { in: requestIds } } });
  await prisma.businessRequest.deleteMany({ where: { code: { startsWith: `${requestCode}-` } } });
  await prisma.businessDeparture.deleteMany({ where: { id: departureRef?.id } });
  await prisma.businessTourPackage.deleteMany({ where: { slug: pkgSlug } });
  await prisma.businessCompany.deleteMany({ where: { repPhone } });
});

/** Creates the full fixture chain and returns the request id. Each call gets a unique code. */
async function makeRequest(overrides: Partial<{
  status: string;
  totalAmount: number;
  depositAmount: number;
  grantAmount: number;
  paidAmount: number;
}>): Promise<string> {
  if (!companyRef) {
    companyRef = await prisma.businessCompany.create({
      data: { name: 'شرکت QA', nationalId, field: 'technology', repName: 'نماینده', repPhone },
      select: { id: true },
    });
  }
  if (!departureRef) {
    const pkg = await prisma.businessTourPackage.create({
      data: { slug: pkgSlug, title: 'تور QA', destination: 'استانبول', basePrice: 1_000_000 },
      select: { id: true },
    });
    departureRef = await prisma.businessDeparture.create({
      data: {
        packageId: pkg.id,
        departDate: new Date('2027-02-01T00:00:00Z'),
        returnDate: new Date('2027-02-08T00:00:00Z'),
        capacity: 30,
      },
      select: { id: true },
    });
  }
  const req = await prisma.businessRequest.create({
    data: {
      code: `${requestCode}-${++seq}`,
      companyId: companyRef.id,
      departureId: departureRef.id,
      paxCount: 2,
      status: overrides.status ?? 'submitted',
      totalAmount: overrides.totalAmount ?? 2_000_000,
      depositAmount: overrides.depositAmount ?? 600_000,
      grantAmount: overrides.grantAmount ?? 0,
      paidAmount: overrides.paidAmount ?? 0,
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
    },
    select: { id: true },
  });
  requestIds.push(req.id);
  return req.id;
}

describe('QA — Idempotency-Key is enforced at the database level', () => {
  it('a second payment with the SAME idempotency key cannot be created', async () => {
    const requestId = await makeRequest({ status: 'submitted' });
    await prisma.businessPayment.create({
      data: { requestId, kind: 'deposit', method: 'gateway', amount: 600_000, idempotencyKey: idemBase },
    });

    // The double-click replay: same key, same payload. The unique index is the
    // last line of defence when the API race slips through.
    await expect(
      prisma.businessPayment.create({
        data: { requestId, kind: 'deposit', method: 'gateway', amount: 600_000, idempotencyKey: idemBase },
      }),
    ).rejects.toThrow(/unique|idempotencyKey/i);
  });

  it('DIFFERENT keys may coexist for one request (retry with a fresh key is legal)', async () => {
    const requestId = await makeRequest({ status: 'submitted' });
    await prisma.businessPayment.create({
      data: { requestId, kind: 'deposit', method: 'gateway', amount: 600_000, idempotencyKey: `${idemBase}-a` },
    });
    const second = await prisma.businessPayment.create({
      data: { requestId, kind: 'deposit', method: 'gateway', amount: 600_000, idempotencyKey: `${idemBase}-b` },
    });
    expect(second.id).toBeTruthy();
  });

  it('deposit and settlement are distinguishable kinds on one request', async () => {
    // The spec's normal flow creates TWO payment rows (one per kind). They must
    // coexist and stay queryable per kind (AGENTS.md: DB-level aggregation).
    const requestId = await makeRequest({ status: 'approved', paidAmount: 2_000_000 });
    await prisma.businessPayment.create({
      data: { requestId, kind: 'deposit', method: 'gateway', amount: 600_000, idempotencyKey: `${idemBase}-d` },
    });
    await prisma.businessPayment.create({
      data: { requestId, kind: 'settlement', method: 'gateway', amount: 1_400_000, idempotencyKey: `${idemBase}-s` },
    });
    const rows = await prisma.businessPayment.groupBy({
      by: ['kind'],
      where: { requestId },
      _sum: { amount: true },
    });
    const byKind = Object.fromEntries(rows.map((r) => [r.kind, r._sum.amount]));
    expect(byKind).toEqual({ deposit: 600_000, settlement: 1_400_000 });
  });
});

describe('QA — voucher gate on REAL rows', () => {
  it('a fully-paid request (total − grant) satisfies the voucher gate', async () => {
    const requestId = await makeRequest({
      status: 'approved',
      totalAmount: 2_000_000,
      depositAmount: 600_000,
      grantAmount: 200_000,
      paidAmount: 1_800_000,
    });
    const req = await prisma.businessRequest.findUniqueOrThrow({ where: { id: requestId } });
    expect(
      isVoucherIssuable({
        totalAmount: req.totalAmount,
        grantAmount: req.grantAmount,
        paidAmount: req.paidAmount,
      }),
    ).toBe(true);
  });

  it('a request short by one Rial does NOT satisfy the gate', async () => {
    const requestId = await makeRequest({
      status: 'approved',
      totalAmount: 2_000_000,
      depositAmount: 600_000,
      grantAmount: 0,
      paidAmount: 1_999_999,
    });
    const req = await prisma.businessRequest.findUniqueOrThrow({ where: { id: requestId } });
    expect(
      isVoucherIssuable({
        totalAmount: req.totalAmount,
        grantAmount: req.grantAmount,
        paidAmount: req.paidAmount,
      }),
    ).toBe(false);
  });

  it('amounts persisted through Prisma come back as the exact Ints stored', async () => {
    // The schema stores whole Rial as Int. Round-trip must be lossless — no
    // Decimal/float conversion may appear anywhere on this path.
    const weird = 8_191_237; // arbitrary, not representable as n×10^k
    const requestId = await makeRequest({ status: 'approved', totalAmount: weird, paidAmount: weird });
    const req = await prisma.businessRequest.findUniqueOrThrow({ where: { id: requestId } });
    expect(req.totalAmount).toBe(weird);
    expect(req.paidAmount).toBe(weird);
    expect(Number.isSafeInteger(req.totalAmount)).toBe(true);
  });
});
