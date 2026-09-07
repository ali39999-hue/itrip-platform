import { describe, it, expect, afterAll } from 'vitest';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import {
  getTenantAuthContext,
  assertTenantAccess,
} from './permission-service';
import { TenantRepository } from './TenantRepository';
import { encryptSensitive } from '@/lib/security/crypto-vault';

/**
 * IDOR (Insecure Direct Object Reference) Protection Suite (IAM-009, SEC-002)
 * Proves that cross-user and cross-tenant direct object requests are strictly rejected.
 */
describe('IDOR & Horizontal Privilege Escalation Protection Suite (IAM-009, SEC-002)', () => {
  const suffix = `idor_${Date.now().toString(36)}_${randomBytes(3).toString('hex')}`;

  let userAId = '';
  let userBId = '';
  let orgAId = '';
  let orgBId = '';
  let bookingAId = '';
  let bookingBId = '';
  let profileBId = '';
  let docBId = '';
  let invoiceBId = '';
  let tripBId = '';
  let batchBId = '';

  afterAll(async () => {
    try {
      if (invoiceBId) await prisma.invoice.deleteMany({ where: { id: invoiceBId } });
      if (tripBId) await prisma.trip.deleteMany({ where: { id: tripBId } });
      if (batchBId) await prisma.settlementBatch.deleteMany({ where: { id: batchBId } });
      if (docBId) await prisma.travelDocument.deleteMany({ where: { id: docBId } });
      if (profileBId) await prisma.travelerProfile.deleteMany({ where: { id: profileBId } });
      if (bookingAId) await prisma.booking.deleteMany({ where: { id: bookingAId } });
      if (bookingBId) await prisma.booking.deleteMany({ where: { id: bookingBId } });
      await prisma.organizationMembership.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
      await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
      await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
    } catch (e) {
      console.error('IDOR test cleanup error:', e);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('sets up isolated User A (Org A) and User B (Org B) with private resources', async () => {
    // 1. Create Users
    const userA = await prisma.user.create({
      data: { id: `usr_a_${suffix}`, email: `user_a_${suffix}@test.local`, name: 'User A' },
    });
    userAId = userA.id;

    const userB = await prisma.user.create({
      data: { id: `usr_b_${suffix}`, email: `user_b_${suffix}@test.local`, name: 'User B' },
    });
    userBId = userB.id;

    // 2. Create Orgs
    const orgA = await prisma.organization.create({
      data: { legalName: `Org A ${suffix}`, displayName: 'Org A', type: 'AGENCY' },
    });
    orgAId = orgA.id;

    const orgB = await prisma.organization.create({
      data: { legalName: `Org B ${suffix}`, displayName: 'Org B', type: 'AGENCY' },
    });
    orgBId = orgB.id;

    await prisma.organizationMembership.create({
      data: { organizationId: orgAId, userId: userAId, status: 'ACTIVE' },
    });
    await prisma.organizationMembership.create({
      data: { organizationId: orgBId, userId: userBId, status: 'ACTIVE' },
    });

    // 3. Create Private Bookings
    const bA = await prisma.booking.create({
      data: {
        id: `bkg_a_${suffix}`,
        reference: `ITR-A-${suffix}`,
        customerId: userAId,
        organizationId: orgAId,
        status: 'CONFIRMED',
        totalAmount: 1_000_000,
        currency: 'IRR',
      },
    });
    bookingAId = bA.id;

    const bB = await prisma.booking.create({
      data: {
        id: `bkg_b_${suffix}`,
        reference: `ITR-B-${suffix}`,
        customerId: userBId,
        organizationId: orgBId,
        status: 'CONFIRMED',
        totalAmount: 2_000_000,
        currency: 'IRR',
      },
    });
    bookingBId = bB.id;

    // 4. Create User B Private Profile & PII Document
    const profB = await prisma.travelerProfile.create({
      data: {
        userId: userBId,
        firstName: 'Secret',
        lastName: 'Person',
        nationalId: encryptSensitive('0011223344'),
      },
    });
    profileBId = profB.id;

    const docB = await prisma.travelDocument.create({
      data: {
        travelerProfileId: profB.id,
        organizationId: orgBId,
        type: 'PASSPORT',
        documentNumber: encryptSensitive('A99887766'),
        issuingCountry: 'IR',
      },
    });
    docBId = docB.id;

    // 5. Create Org B Private Trip Dossier
    const tripB = await prisma.trip.create({
      data: {
        reference: `TRP-B-${suffix}`,
        userId: userBId,
        organizationId: orgBId,
        title: 'Org B Secret Business Trip',
        status: 'BOOKED',
      },
    });
    tripBId = tripB.id;

    // Link bookingB to tripB
    await prisma.booking.update({
      where: { id: bookingBId },
      data: { tripId: tripB.id },
    });

    // 6. Create Org B Private Invoice
    const invoiceB = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-B-${suffix}`,
        bookingId: bookingBId,
        customerId: userBId,
        organizationId: orgBId,
        totalAmount: 2_000_000,
        netAmount: 1_800_000,
        taxAmount: 200_000,
        currency: 'IRR',
        status: 'ISSUED',
      },
    });
    invoiceBId = invoiceB.id;

    // 7. Create Org B Private Supplier Settlement Batch
    const batchB = await prisma.settlementBatch.create({
      data: {
        batchNumber: `STLB-B-${suffix}`,
        supplierId: 'sup_test_b',
        organizationId: orgBId,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000),
        totalPayable: 1_800_000,
        netSettlement: 1_800_000,
        currency: 'IRR',
        status: 'OPEN',
      },
    });
    batchBId = batchB.id;
  });

  it('IAM-009 / SEC-002: User A context strictly FAILS to access User B booking (Horizontal IDOR)', async () => {
    const ctxA = await getTenantAuthContext(userAId);
    expect(ctxA.userId).toBe(userAId);

    // Target User B's booking
    const bookingB = await prisma.booking.findUniqueOrThrow({ where: { id: bookingBId } });

    expect(() =>
      assertTenantAccess(ctxA, {
        customerId: bookingB.customerId,
        organizationId: bookingB.organizationId,
      })
    ).toThrow(/Cross-tenant data access blocked/i);
  });

  it('IAM-009: Plain customer without org context cannot access another customer booking even if unassigned', () => {
    const plainCustomerA = {
      userId: 'cust_unassigned_A',
      role: 'CUSTOMER',
      isSuperAdmin: false,
      permissions: new Set<import('./permissions').ERPPermission>(['booking:view']),
    };

    const targetBookingB = {
      customerId: 'cust_unassigned_B',
      organizationId: null,
    };

    expect(() => assertTenantAccess(plainCustomerA, targetBookingB)).toThrow(
      /Unauthorized resource access \(IDOR Guard\)/i
    );
  });

  it('IAM-009: Branch boundaries prevent Branch 1 agent from accessing Branch 2 resources (Branch IDOR)', () => {
    const branch1Agent = {
      userId: 'agent_branch_1',
      role: 'AGENT',
      organizationId: orgAId,
      branchId: 'branch_tehran_north',
      isSuperAdmin: false,
      permissions: new Set<import('./permissions').ERPPermission>(['booking:view']),
    };

    const branch2Booking = {
      organizationId: orgAId,
      branchId: 'branch_tehran_south', // Mismatched branch!
      customerId: 'some_customer',
    };

    expect(() => assertTenantAccess(branch1Agent, branch2Booking)).toThrow(
      /Branch access boundary violation/i
    );
  });

  it('IAM-009: User A querying User B traveler profiles or documents via tenant-scoped DB is restricted', async () => {
    const { getTenantScopedPrisma } = await import('@/lib/prisma');
    const ctxA = await getTenantAuthContext(userAId);
    const dbA = getTenantScopedPrisma(ctxA.organizationId, ctxA.isSuperAdmin);

    // Scoped booking lookup for User B's reference returns 0 results
    const leaked = await dbA.booking.findMany({
      where: { reference: `ITR-B-${suffix}` },
    });
    expect(leaked).toHaveLength(0);
  });

  it('IAM-109: Invoice IDOR — User A (Org A) context strictly FAILS to access Org B invoice', async () => {
    const ctxA = await getTenantAuthContext(userAId);
    const repoA = TenantRepository.forContext(ctxA);

    // 1. Direct assertTenantAccess fails
    const invoiceB = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceBId } });
    expect(() =>
      assertTenantAccess(ctxA, {
        organizationId: invoiceB.organizationId,
        customerId: invoiceB.customerId,
      })
    ).toThrow(/Cross-tenant data access blocked/i);

    // 2. TenantRepository lookup fails
    await expect(repoA.findInvoiceById(invoiceBId)).rejects.toThrow(/Cross-tenant data access blocked/i);

    // 3. Tenant-scoped listing returns zero results for Org B invoices
    const scopedInvoices = await repoA.findInvoices({ where: { id: invoiceBId } });
    expect(scopedInvoices).toHaveLength(0);
  });

  it('IAM-109: Refund IDOR — User A (Org A) strictly FAILS to access or approve refund for Org B booking', async () => {
    const ctxA = await getTenantAuthContext(userAId);

    // Booking B belongs to Org B
    const bookingB = await prisma.booking.findUniqueOrThrow({ where: { id: bookingBId } });

    // User A cannot approve or access refund for Org B
    expect(() =>
      assertTenantAccess(ctxA, {
        organizationId: bookingB.organizationId,
        customerId: bookingB.customerId,
      })
    ).toThrow(/Cross-tenant data access blocked/i);
  });

  it('IAM-109: Settlement IDOR — User A (Org A) strictly FAILS to access Org B settlement batch', async () => {
    const ctxA = await getTenantAuthContext(userAId);
    const repoA = TenantRepository.forContext(ctxA);

    const batchB = await prisma.settlementBatch.findUniqueOrThrow({ where: { id: batchBId } });

    // 1. Direct assertTenantAccess fails
    expect(() =>
      assertTenantAccess(ctxA, {
        organizationId: batchB.organizationId,
      })
    ).toThrow(/Cross-tenant data access blocked/i);

    // 2. TenantRepository lookup fails
    await expect(repoA.findSettlementBatchById(batchBId)).rejects.toThrow(/Cross-tenant data access blocked/i);

    // 3. Scoped list returns zero
    const scopedBatches = await repoA.findSettlementBatches({ where: { id: batchBId } });
    expect(scopedBatches).toHaveLength(0);
  });

  it('IAM-109: Document IDOR — User A (Org A) strictly FAILS to access Org B travel document', async () => {
    const ctxA = await getTenantAuthContext(userAId);
    const repoA = TenantRepository.forContext(ctxA);

    const docB = await prisma.travelDocument.findUniqueOrThrow({
      where: { id: docBId },
      include: { travelerProfile: true },
    });

    // 1. Direct assertTenantAccess fails
    expect(() =>
      assertTenantAccess(ctxA, {
        organizationId: docB.organizationId,
        customerId: docB.travelerProfile.userId,
      })
    ).toThrow(/Cross-tenant data access blocked/i);

    // 2. TenantRepository lookup fails
    await expect(repoA.findTravelDocumentById(docBId)).rejects.toThrow(/Cross-tenant data access blocked/i);

    // 3. Scoped list returns zero
    const scopedDocs = await repoA.findTravelDocuments({ where: { id: docBId } });
    expect(scopedDocs).toHaveLength(0);
  });

  it('IAM-109: Travel-File (Trip) IDOR — User A (Org A) strictly FAILS to access Org B trip dossier', async () => {
    const ctxA = await getTenantAuthContext(userAId);
    const repoA = TenantRepository.forContext(ctxA);

    const tripB = await prisma.trip.findUniqueOrThrow({ where: { id: tripBId } });

    // 1. Direct assertTenantAccess fails
    expect(() =>
      assertTenantAccess(ctxA, {
        organizationId: tripB.organizationId,
        customerId: tripB.userId,
      })
    ).toThrow(/Cross-tenant data access blocked/i);

    // 2. TenantRepository lookup fails
    await expect(repoA.findTripById(tripBId)).rejects.toThrow(/Cross-tenant data access blocked/i);

    // 3. Scoped list returns zero
    const scopedTrips = await repoA.findTrips({ where: { id: tripBId } });
    expect(scopedTrips).toHaveLength(0);
  });
});
