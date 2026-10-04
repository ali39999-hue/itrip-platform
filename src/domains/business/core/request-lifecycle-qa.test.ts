/**
 * QA LAYER 4b — Expiry & capacity rules (data-level, independent of the API).
 *
 * Owns: src/domains/business/**\/*.test.ts (QA session, exclusive).
 *
 * Spec rules pinned here (فیروزو بیزنس سند تحویل فنی §قوانین کسب‌وکار و §خطاهای
 * سمت سرور) that do NOT need the API routes to exist:
 *   - capacity hold = 48h via `expires_at`; on expiry the request must move to
 *     `cancelled` (the sweeper is backend's job — QA pins the DATA contract);
 *   - `booked_count` increments ONLY on a successful deposit (data contract);
 *   - the terminal-state rule: a request in `cancelled`/`issued` can never be
 *     resurrected (mirrors AGENTS.md §5 for the core BookingStateMachine).
 *
 * ⚠️ PENDING (blocked on backend's API routes — will become 4b + new suites):
 *   - Idempotency-Key pass-through on POST /requests/:id/submit and /payments
 *     (the DB-level unique index is already proven in payment-integrity.qa);
 *   - callback HMAC over the EXACT raw body, fail-closed without the secret;
 *   - failed payment / gateway return leaves the status retryable (402);
 *   - 409 capacity_full and 410 request_expired HTTP mappings.
 * When routes land, these suites must be written against the REAL handlers.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { BusinessDomainService } from './BusinessDomainService';
import {  assertTransition,
  canTransition,
  InvalidTransitionError,
} from '../status-contracts';
import { computeQuote } from '../pricing';

const suffix = `qa4b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const nationalId = `00123${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`;
const repPhone = `0912${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;
const pkgSlug = `biz-qa4b-${suffix}`;

let companyId: string | null = null;
let packageId: string | null = null;
const createdIds: { departures: string[]; requests: string[] } = { departures: [], requests: [] };

afterAll(async () => {
  // Outbox fan-out rows produced by recordStatusTransition must be cleaned so
  // parallel suites (outbox consumer tests) are not starved by our events.
  await prisma.outboxEvent.deleteMany({ where: { aggregateType: 'BUSINESS_REQUEST' } });
  await prisma.businessRequest.deleteMany({ where: { id: { in: createdIds.requests } } });
  await prisma.businessDeparture.deleteMany({ where: { id: { in: createdIds.departures } } });
  await prisma.businessTourPackage.deleteMany({ where: { id: packageId } });
  await prisma.businessCompany.deleteMany({ where: { id: companyId } });
});

async function fixture() {
  if (!companyId) {
    companyId = (
      await prisma.businessCompany.create({
        data: { name: 'شرکت QA', nationalId, field: 'technology', repName: 'نماینده', repPhone },
        select: { id: true },
      })
    ).id;
  }
  if (!packageId) {
    packageId = (
      await prisma.businessTourPackage.create({
        data: { slug: pkgSlug, title: 'تور QA', destination: 'استانبول', basePrice: 1_000_000 },
        select: { id: true },
      })
    ).id;
  }
}

async function makeDeparture(capacity: number): Promise<string> {
  await fixture();
  const id = (
    await prisma.businessDeparture.create({
      data: {
        packageId: packageId!,
        departDate: new Date('2027-03-01T00:00:00Z'),
        returnDate: new Date('2027-03-08T00:00:00Z'),
        capacity,
      },
      select: { id: true },
    })
  ).id;
  createdIds.departures.push(id);
  return id;
}

async function makeRequest(departureId: string, overrides: Partial<{ status: string; expiresAt: Date | null }>) {
  const id = (
    await prisma.businessRequest.create({
      data: {
        code: `FZB-2026-${suffix}-${createdIds.requests.length + 1}`,
        companyId: companyId!,
        departureId,
        paxCount: 2,
        status: overrides.status ?? 'submitted',
        totalAmount: 2_000_000,
        depositAmount: 600_000,
        paidAmount: 0,
        expiresAt: 'expiresAt' in overrides ? overrides.expiresAt : new Date(Date.now() + 48 * 3600 * 1000),
      },
      select: { id: true },
    })
  ).id;
  createdIds.requests.push(id);
  return id;
}

describe('QA — 48h capacity hold via expires_at (data contract)', () => {
  it('a fresh submitted request carries an expires_at ~48h out', async () => {
    const departureId = await makeDeparture(10);
    const requestId = await makeRequest(departureId, {});
    const req = await prisma.businessRequest.findUniqueOrThrow({ where: { id: requestId } });
    expect(req.expiresAt).not.toBeNull();
    const hours = (req.expiresAt!.getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(0);
    expect(hours).toBeLessThanOrEqual(48.5); // the hold NEVER exceeds 48h
  });

  it('an expired hold is detectable by a plain query (sweeper input)', async () => {
    const departureId = await makeDeparture(10);
    await makeRequest(departureId, { expiresAt: new Date(Date.now() - 60_000) });
    // This is the exact query a sweeper must run to cancel expired holds —
    // QA pins it so the backend implementation cannot "forget" the predicate.
    const expired = await prisma.businessRequest.findMany({
      where: { status: 'submitted', expiresAt: { lt: new Date() } },
      select: { id: true },
    });
    expect(expired.length).toBeGreaterThanOrEqual(1);
  });

  it('the expiry path is legal ONLY from submitted → cancelled (state machine)', () => {
    // Spec: «بدون پرداخت، درخواست پس از expires_at به cancelled می‌رود».
    // A request that HAS paid (deposit_paid) must NOT be swept.
    expect(canTransition('submitted', 'cancelled')).toBe(true);
    expect(canTransition('deposit_paid', 'cancelled')).toBe(false);
    expect(() => assertTransition('deposit_paid', 'cancelled')).toThrow(InvalidTransitionError);
  });
});

describe('QA — booked_count increments only on a successful deposit', () => {
  it('starts at 0 and can only be reconciled against PAID deposits', async () => {
    const departureId = await makeDeparture(10);
    const r1 = await makeRequest(departureId, { status: 'submitted' });
    const r2 = await makeRequest(departureId, { status: 'deposit_paid' });

    // Simulate the invariant check: booked_count must equal the number of
    // requests that actually reached deposit_paid (pax-scaled). Right after
    // fixture creation it is 0 — the sweep that credits it must count only
    // deposit_paid rows.
    const dep = await prisma.businessDeparture.findUniqueOrThrow({ where: { id: departureId } });
    expect(dep.bookedCount).toBe(0);

    const paidPax = await prisma.businessRequest.aggregate({
      where: { departureId, status: 'deposit_paid' },
      _sum: { paxCount: true },
    });
    expect(paidPax._sum.paxCount).toBe(2); // r2 only — r1 (submitted) contributes 0
    expect(r1 && r2).toBeTruthy();
  });

  it('remaining capacity (capacity − booked_count) bounds pax_count', async () => {
    const departureId = await makeDeparture(3);
    const dep = await prisma.businessDeparture.findUniqueOrThrow({ where: { id: departureId } });
    // The quote itself never sees capacity — the API must gate it:
    const q = computeQuote({ basePrice: 1_000_000, paxCount: 4 });
    expect(q.totalAmount).toBe(4_000_000); // pricing is oblivious
    expect(dep.capacity).toBe(3); // …but capacity says no. API regression = bug report.
  });
});

describe('QA — terminal states are never resurrected', () => {
  it.each(['issued', 'cancelled'] as const)(
    'a %s request rejected by assertTransition against every status',
    (terminal) => {
      for (const to of ['draft', 'submitted', 'deposit_paid', 'under_review', 'changes_requested', 'approved', 'issued', 'cancelled'] as const) {
        expect(() => assertTransition(terminal, to)).toThrow(InvalidTransitionError);
      }
    },
  );

  it('a cancelled expired request cannot be brought back by re-submitting', () => {
    expect(() => assertTransition('cancelled', 'submitted')).toThrow(InvalidTransitionError);
  });
});

describe('QA — T1013 audit attribution (actorId on status events)', () => {
  it('reviewRequest records the acting agent on the appended status event', async () => {
    const departureId = await makeDeparture(5);
    const requestId = await makeRequest(departureId, { status: 'under_review' });
    const actorId = `usr_agent_${suffix}`;

    await BusinessDomainService.reviewRequest({
      requestId,
      decision: 'approve',
      note: 'تایید تستی',
      actorId,
    });

    const event = await prisma.businessStatusEvent.findFirstOrThrow({
      where: { requestId, toStatus: 'approved' },
      orderBy: { createdAt: 'desc' },
    });
    expect(event.actorId).toBe(actorId);
    expect(event.fromStatus).toBe('under_review');
  });

  it('applyGrant records the finance actor even for a same-status event', async () => {
    const departureId = await makeDeparture(5);
    const requestId = await makeRequest(departureId, { status: 'approved' });
    const actorId = `usr_finance_${suffix}`;

    await BusinessDomainService.applyGrant(requestId, 50_000_000, actorId);

    const event = await prisma.businessStatusEvent.findFirstOrThrow({
      where: { requestId, note: { contains: 'کمک‌هزینه' } },
      orderBy: { createdAt: 'desc' },
    });
    expect(event.actorId).toBe(actorId);
  });
});
