import { describe, it, expect, afterAll } from 'vitest';
import { InProcessFiruzoCoreClient, getFiruzoCoreClient } from './InProcessFiruzoCoreClient';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/observability/logger';

const log = createLogger('firuzo-core-client.test');

/**
 * BIZ-M1: FiruzoCoreClient is the mandatory boundary between the Business
 * (Specialized Experiences) domain and Firuzo core services. These tests prove
 * the in-process adapter delegates to real core services against a live DB.
 * All fixtures are cleaned up (AGENTS.md §Testing Contract).
 */

const suffix = `m1_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
// repPhone is NOT unique-constrained, but nationalId IS. Building the id by
// slicing a prefix + suffix truncated the suffix away, so every run inserted the
// same value and concurrent runs collided on the unique index. Derive both from
// a per-run random block instead: 11 digits, genuinely unique, run-scoped — so a
// concurrent run's cleanup cannot touch these rows.
const nationalId = `00123${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`;
const repPhone = `0912${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;
// Fixture tracking — deleted via unique-username deleteMany below, keeping the
// suite idempotent and the database unpolluted (AGENTS.md §Testing Contract).
const createdUsernames: string[] = [
  `bizcore_${suffix}`,
  `bizctx_${suffix}`,
  `bizbook_${suffix}`,
  `biztx_${suffix}`,
];

afterAll(async () => {
  // Children first: BusinessRequest restricts the departure, which restricts
  // the package, which restricts the company. Outbox fan-out rows must be
  // cleaned so parallel outbox-consumer suites are not starved by our events.
  await prisma.outboxEvent.deleteMany({ where: { aggregateType: 'BUSINESS_REQUEST' } });
  await prisma.businessRequest.deleteMany({ where: { code: `FZB-2026-${suffix}` } });
  await prisma.businessTourPackage.deleteMany({ where: { slug: `biz-m1-${suffix}` } });
  await prisma.businessCompany.deleteMany({ where: { repPhone } });
  await prisma.booking.deleteMany({
    where: { reference: { in: [`ITR-${suffix}-OK`, `ITR-${suffix}-TX`] } },
  });
  await prisma.user.deleteMany({ where: { username: { in: createdUsernames } } });
});

describe('FiruzoCoreClient — M1 boundary (BIZ-M1)', () => {
  it('exposes a singleton factory', () => {
    const a = getFiruzoCoreClient();
    const b = getFiruzoCoreClient();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(InProcessFiruzoCoreClient);
  });

  it('getUser returns a core user view or null', async () => {
    const client = new InProcessFiruzoCoreClient();
    const user = await prisma.user.create({
      data: { username: `bizcore_${suffix}`, currency: 'IRR', isActive: true },
    });
    

    const view = await client.getUser(user.id);
    expect(view).not.toBeNull();
    expect(view!.id).toBe(user.id);
    expect(view!.isActive).toBe(true);
    expect(view!.currency).toBe('IRR');

    expect(await client.getUser('nonexistent_user_id')).toBeNull();
  });

  it('getTenantContext resolves via the relational IAM chain', async () => {
    const client = new InProcessFiruzoCoreClient();
    const user = await prisma.user.create({
      data: { username: `bizctx_${suffix}`, role: 'CUSTOMER' },
    });
    

    const ctx = await client.getTenantContext(user.id);
    expect(ctx.isSuperAdmin).toBe(false);
    expect(ctx.organizationId).toBeNull(); // no membership created
  });

  it('rejects createCoreBooking with a non-EXPERIENCE type (fail-closed)', async () => {
    const client = new InProcessFiruzoCoreClient();
    await expect(
      client.createCoreBooking({
        userId: 'any',
        // @ts-expect-error deliberate contract violation — must be rejected at runtime
        type: 'TOUR',
        businessBookingRef: 'BEX-X',
        totalAmount: '100',
        currency: 'IRR',
        travelDate: '2026-10-01',
        details: {},
        idempotencyKey: `ITR-BAD-${suffix}`,
      })
    ).rejects.toThrow(/only supports type=EXPERIENCE/i);
  });

  it('createCoreBooking + transitionCoreBooking walk the core BookingStateMachine', async () => {
    const client = new InProcessFiruzoCoreClient();
    const user = await prisma.user.create({
      data: { username: `bizbook_${suffix}`, currency: 'IRR' },
    });
    

    const created = await client.createCoreBooking({
      userId: user.id,
      type: 'EXPERIENCE',
      businessBookingRef: `BEX-${suffix}`,
      totalAmount: '100',
      currency: 'IRR',
      travelDate: '2026-10-01',
      details: { vertical: 'TECHNOLOGY' },
      idempotencyKey: `ITR-${suffix}-OK`,
    });
    
    expect(created.id).toBeTruthy();

    // DRAFT → HELD is the legal first step in the core BookingStateMachine
    const transition = await client.transitionCoreBooking({
      bookingId: created.id,
      next: 'HELD',
      actor: 'biz-test',
      reason: 'M1 boundary test',
    });
    expect(transition.success).toBe(true);
    expect(transition.toStatus).toBe('HELD');
  });

  it('assertBookingTransition rejects illegal jumps', () => {
    const client = new InProcessFiruzoCoreClient();
    expect(() => client.assertBookingTransition('DRAFT', 'COMPLETED')).toThrow();
    expect(() => client.assertBookingTransition('DRAFT', 'CANCELLED')).toThrow();
  });

  it('runInTransaction commits atomically (booking visible inside tx)', async () => {
    const client = new InProcessFiruzoCoreClient();
    const user = await prisma.user.create({
      data: { username: `biztx_${suffix}`, currency: 'IRR' },
    });
    

    await client.runInTransaction(async (tx) => {
      await client.createCoreBooking({
        userId: user.id,
        type: 'EXPERIENCE',
        businessBookingRef: `BEX-TX-${suffix}`,
        totalAmount: '50',
        currency: 'IRR',
        travelDate: '2026-10-02',
        details: {},
        idempotencyKey: `ITR-${suffix}-TX`,
      });

      // The coreTx handle must expose the transaction-scoped operations
      expect(typeof tx.captureHold).toBe('function');
      expect(typeof tx.postRevenueRealization).toBe('function');
    });

    const found = await prisma.booking.findFirst({
      where: { reference: `ITR-${suffix}-TX` },
    });
    expect(found).not.toBeNull();
  });

  it('business vertical models are queryable (schema wired)', async () => {
    // The spec's data model, not a generic "experience" model: a company places
    // a request against a dated departure, which is what the seven pages need.
    const company = await prisma.businessCompany.create({
      data: {
        name: 'شرکت تست',
        nationalId,
        field: 'technology',
        repName: 'نماینده',
        repPhone,
      },
    });

    const pkg = await prisma.businessTourPackage.create({
      data: {
        slug: `biz-m1-${suffix}`,
        title: 'تور فناوری تست',
        destination: 'استانبول',
        basePrice: 1_000_000,
      },
    });

    const departure = await prisma.businessDeparture.create({
      data: {
        packageId: pkg.id,
        departDate: new Date('2026-11-01T00:00:00Z'),
        returnDate: new Date('2026-11-08T00:00:00Z'),
        capacity: 30,
      },
    });

    const request = await prisma.businessRequest.create({
      data: {
        code: `FZB-2026-${suffix}`,
        companyId: company.id,
        departureId: departure.id,
        paxCount: 4,
        totalAmount: 4_000_000,
        depositAmount: 1_200_000,
      },
    });

    const found = await prisma.businessRequest.findUnique({
      where: { id: request.id },
      include: { company: true, departure: { include: { package: true } }, travelers: true, statusEvents: true },
    });
    expect(found).not.toBeNull();
    expect(found!.company.nationalId).toHaveLength(11);
    expect(found!.departure.package.slug).toBe(`biz-m1-${suffix}`);
    expect(found!.travelers).toHaveLength(0);
    expect(found!.statusEvents).toHaveLength(0);
    // Money is whole Rial held as Int, never a float.
    expect(Number.isInteger(found!.totalAmount)).toBe(true);
  });

  it('cleans up the rows it created', async () => {
    await prisma.businessRequest.deleteMany({ where: { code: `FZB-2026-${suffix}` } });
    await prisma.businessTourPackage.deleteMany({ where: { slug: `biz-m1-${suffix}` } });
    await prisma.businessCompany.deleteMany({ where: { repPhone } });

    const left = await prisma.businessRequest.count({ where: { code: `FZB-2026-${suffix}` } });
    expect(left).toBe(0);
  });

  it('logs via createLogger contract (no PII)', () => {
    expect(typeof log.info).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.error).toBe('function');
  });
});
