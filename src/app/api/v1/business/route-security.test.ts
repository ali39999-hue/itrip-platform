import { describe, it, expect, vi, afterAll, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * SEC — Firuzo Business (specialist Child) route guards.
 * Operator endpoints (review, grant) must fail closed for anonymous callers
 * (401), and the PSP result callback must reject unsigned requests (403) —
 * roadmap §21 (webhook signature verification) and Gate E.
 * Object-level access (T0804): owned requests are readable only by their
 * owner or reviewing staff; guest-created requests stay id-addressable.
 */
const state = vi.hoisted(() => ({
  sessionUserId: null as string | null,
}));

vi.mock('@/auth', () => ({
  safeAuth: vi.fn(async () =>
    state.sessionUserId ? { user: { id: state.sessionUserId } } : null
  ),
  auth: vi.fn(async () => (state.sessionUserId ? { user: { id: state.sessionUserId } } : null)),
}));

import { POST as reviewPOST } from './requests/[id]/review/route';
import { POST as grantPOST } from './requests/[id]/grant/route';
import { POST as callbackPOST } from './payments/callback/route';
import { GET as requestGET } from './requests/[id]/route';

function jsonReq(url: string, body: unknown, headers?: Record<string, string>) {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(headers || {}) },
  });
}

describe('Business route security guards', () => {
  const suffix = `sec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  let guestRequestId = '';
  let ownedRequestId = '';
  const ownerId = `u_owner_${suffix}`;
  let companyAndCatalogIds: { companyId: string; packageId: string; departureId: string } | null = null;

  beforeAll(async () => {
    const pkg = await prisma.businessTourPackage.create({
      data: {
        slug: `pkg_${suffix}`,
        title: 'تور تستی امنیت',
        destination: 'تست',
        durationDays: 3,
        basePrice: 1000,
        includes: [],
        requiredDocs: [],
        status: 'PUBLISHED',
        departures: {
          create: [{ departDate: new Date('2027-01-10'), returnDate: new Date('2027-01-13'), capacity: 5 }],
        },
      },
      include: { departures: true },
    });
    const company = await prisma.businessCompany.create({
      data: {
        name: `شرکت امنیتی ${suffix}`,
        nationalId: `${String(Date.now()).slice(-11)}`,
        field: 'QA',
        repName: 'تستر',
        repPhone: `0912${String(Date.now()).slice(-7)}`,
      },
    });
    companyAndCatalogIds = { companyId: company.id, packageId: pkg.id, departureId: pkg.departures[0].id };

    const guest = await prisma.businessRequest.create({
      data: {
        code: `FZB-2026-${suffix}-G`,
        companyId: company.id,
        departureId: pkg.departures[0].id,
        paxCount: 1,
        status: 'draft',
        createdById: null,
      },
    });
    const owned = await prisma.businessRequest.create({
      data: {
        code: `FZB-2026-${suffix}-O`,
        companyId: company.id,
        departureId: pkg.departures[0].id,
        paxCount: 1,
        status: 'draft',
        createdById: ownerId,
      },
    });
    guestRequestId = guest.id;
    ownedRequestId = owned.id;
  }, 30000);

  afterAll(async () => {
    await prisma.businessRequest.deleteMany({ where: { id: { in: [guestRequestId, ownedRequestId] } } });
    if (companyAndCatalogIds) {
      await prisma.businessDeparture.deleteMany({ where: { packageId: companyAndCatalogIds.packageId } });
      await prisma.businessTourPackage.deleteMany({ where: { id: companyAndCatalogIds.packageId } });
      await prisma.businessCompany.deleteMany({ where: { id: companyAndCatalogIds.companyId } });
    }
  });

  it('review endpoint returns 401 for anonymous callers (fail closed)', async () => {
    const res = await reviewPOST(
      jsonReq('http://localhost:3000/api/v1/business/requests/r1/review', { decision: 'approve' }),
      { params: Promise.resolve({ id: 'r1' }) }
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('unauthorized');
  });

  it('grant endpoint returns 401 for anonymous callers (fail closed)', async () => {
    const res = await grantPOST(
      jsonReq('http://localhost:3000/api/v1/business/requests/r1/grant', { grant_amount: 1000 }),
      { params: Promise.resolve({ id: 'r1' }) }
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('unauthorized');
  });

  it('payment callback rejects unsigned requests with 403 invalid_signature', async () => {
    const res = await callbackPOST(
      jsonReq('http://localhost:3000/api/v1/business/payments/callback', {
        payment_id: 'pay_123',
        status: 'success',
      })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('invalid_signature');
  });

  it('payment callback rejects a forged signature with 403', async () => {
    const res = await callbackPOST(
      jsonReq(
        'http://localhost:3000/api/v1/business/payments/callback',
        { payment_id: 'pay_123', status: 'success' },
        { 'x-business-signature': 'deadbeef'.repeat(8) }
      )
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('invalid_signature');
  });

  it('payment callback still validates the body shape before signature (422)', async () => {
    const res = await callbackPOST(
      jsonReq('http://localhost:3000/api/v1/business/payments/callback', { status: 'success' })
    );
    expect(res.status).toBe(422);
  });

  it('T0804: guest-created request stays readable without a session', async () => {
    state.sessionUserId = null;
    const res = await requestGET(new NextRequest(`http://localhost:3000/api/v1/business/requests/${guestRequestId}`), {
      params: Promise.resolve({ id: guestRequestId }),
    });
    expect(res.status).toBe(200);
  });

  it('T0804: owned request is forbidden for anonymous strangers', async () => {
    state.sessionUserId = null;
    const res = await requestGET(new NextRequest(`http://localhost:3000/api/v1/business/requests/${ownedRequestId}`), {
      params: Promise.resolve({ id: ownedRequestId }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('forbidden');
  });

  it('T0804: owned request is forbidden for a different authenticated user', async () => {
    state.sessionUserId = `u_stranger_${suffix}`;
    const res = await requestGET(new NextRequest(`http://localhost:3000/api/v1/business/requests/${ownedRequestId}`), {
      params: Promise.resolve({ id: ownedRequestId }),
    });
    expect(res.status).toBe(403);
    state.sessionUserId = null;
  });

  it('T0804: owned request is readable by its owner', async () => {
    state.sessionUserId = ownerId;
    const res = await requestGET(new NextRequest(`http://localhost:3000/api/v1/business/requests/${ownedRequestId}`), {
      params: Promise.resolve({ id: ownedRequestId }),
    });
    expect(res.status).toBe(200);
    state.sessionUserId = null;
  });
});
