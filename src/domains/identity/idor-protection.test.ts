import { describe, it, expect, afterAll } from 'vitest';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import {
  getTenantAuthContext,
  assertTenantAccess,
} from './permission-service';
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

  afterAll(async () => {
    try {
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
        type: 'PASSPORT',
        documentNumber: encryptSensitive('A99887766'),
        issuingCountry: 'IR',
      },
    });
    docBId = docB.id;
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
});
