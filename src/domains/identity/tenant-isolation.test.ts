import { describe, it, expect, afterAll } from 'vitest';
import {
  getUserPermissions,
  getTenantAuthContext,
  assertTenantAccess,
} from './permission-service';
import { TenantRepository, TenantWriteViolationError } from './TenantRepository';
import { prisma } from '@/lib/prisma';

describe('Tenant Isolation & RBAC Security Suite (IAM-001 to IAM-003, SEC-001)', () => {
  const suffix = `sec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  let orgAId = '';
  let orgBId = '';
  let userAId = '';
  let userBId = '';
  let superAdminId = '';
  let superAdminRoleId = '';
  let roleId = '';
  let permId = '';

  afterAll(async () => {
    try {
      if (permId && roleId) {
        await prisma.rolePermission.deleteMany({ where: { roleId } });
        await prisma.userRole.deleteMany({ where: { roleId } });
        await prisma.permission.deleteMany({ where: { id: permId } });
        await prisma.role.deleteMany({ where: { id: roleId } });
      }
      // Detach the admin's relational role link without deleting the shared
      // SUPER_ADMIN role row itself (other fixtures depend on it).
      if (superAdminRoleId) {
        await prisma.userRole.deleteMany({
          where: { roleId: superAdminRoleId, userId: superAdminId },
        });
      }
      await prisma.organizationMembership.deleteMany({
        where: { userId: { in: [userAId, userBId, superAdminId] } },
      });
      await prisma.organizationBranch.deleteMany({
        where: { organizationId: { in: [orgAId, orgBId] } },
      });
      await prisma.organization.deleteMany({
        where: { id: { in: [orgAId, orgBId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [userAId, userBId, superAdminId] } },
      });
    } catch (e) {
      console.error('Test cleanup error:', e);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('sets up 2 distinct organizations (Org A, Org B) and members for tenant boundary verification', async () => {
    // Org A
    const orgA = await prisma.organization.create({
      data: {
        legalName: `Agency A ${suffix}`,
        displayName: `Agency A`,
        type: 'AGENCY',
        branches: {
          create: [{ name: 'Tehran Branch', code: 'THR' }],
        },
      },
      include: { branches: true },
    });
    orgAId = orgA.id;

    // Org B
    const orgB = await prisma.organization.create({
      data: {
        legalName: `Agency B ${suffix}`,
        displayName: `Agency B`,
        type: 'AGENCY',
        branches: {
          create: [{ name: 'Shiraz Branch', code: 'SYZ' }],
        },
      },
      include: { branches: true },
    });
    orgBId = orgB.id;

    // User A in Org A
    const userA = await prisma.user.create({
      data: {
        id: `usr_a_${suffix}`,
        email: `usera_${suffix}@agency-a.com`,
        role: 'AGENT',
      },
    });
    userAId = userA.id;

    await prisma.organizationMembership.create({
      data: {
        organizationId: orgAId,
        userId: userAId,
        status: 'ACTIVE',
      },
    });

    // User B in Org B
    const userB = await prisma.user.create({
      data: {
        id: `usr_b_${suffix}`,
        email: `userb_${suffix}@agency-b.com`,
        role: 'AGENT',
      },
    });
    userBId = userB.id;

    await prisma.organizationMembership.create({
      data: {
        organizationId: orgBId,
        userId: userBId,
        status: 'ACTIVE',
      },
    });

    // Super Admin — authority is granted relationally (IAM-001); the legacy
    // `role` string alone never grants permissions.
    const admin = await prisma.user.create({
      data: {
        id: `adm_${suffix}`,
        email: `admin_${suffix}@firuzo.com`,
        role: 'SUPER_ADMIN',
      },
    });
    superAdminId = admin.id;

    const superAdminRole = await prisma.role.upsert({
      where: { name: 'SUPER_ADMIN' },
      update: {},
      create: { name: 'SUPER_ADMIN', permissions: '[]' },
    });
    superAdminRoleId = superAdminRole.id;
    await prisma.userRole.create({
      data: { userId: superAdminId, roleId: superAdminRole.id },
    });

    expect(orgAId).not.toBe(orgBId);
  });

  it('IAM-001: Relational RolePermission records are authoritative and resolve dynamically', async () => {
    // Create a dynamic relational permission
    const perm = await prisma.permission.create({
      data: {
        code: `finance:custom_${suffix}`,
        name: 'Custom Finance Action',
        module: 'FINANCE',
      },
    });
    permId = perm.id;

    const role = await prisma.role.create({
      data: {
        name: `ROLE_${suffix.toUpperCase()}`,
        permissions: '[]',
      },
    });
    roleId = role.id;

    await prisma.rolePermission.create({
      data: {
        roleId: role.id,
        permissionId: perm.id,
      },
    });

    await prisma.userRole.create({
      data: {
        userId: userAId,
        roleId: role.id,
      },
    });

    const userPerms = await getUserPermissions(userAId);
    expect(userPerms).toContain(perm.code);
  });

  it('IAM-008: Authorization matrix — deny by default, grant via relational chain, revoke takes effect immediately', async () => {
    // Reuse the dynamic permission minted in the IAM-001 test above.
    const customPerm = await prisma.permission.findUniqueOrThrow({
      where: { code: `finance:custom_${suffix}` },
    });

    // 1. DENY by default: userB has no relational path to this permission at all.
    const beforeGrant = await getUserPermissions(userBId);
    expect(beforeGrant).not.toContain(customPerm.code);

    // 2. GRANT: build the full relational chain Role → RolePermission → UserRole.
    const matrixRole = await prisma.role.create({
      data: { name: `ROLE_MATRIX_${suffix.toUpperCase()}`, permissions: '[]' },
    });
    await prisma.userRole.create({ data: { userId: userBId, roleId: matrixRole.id } });
    await prisma.rolePermission.create({
      data: { roleId: matrixRole.id, permissionId: customPerm.id },
    });
    const afterGrant = await getUserPermissions(userBId);
    expect(afterGrant).toContain(customPerm.code);

    // 3. REVOKE: deleting the relational link removes the permission at once —
    // no cache, no legacy JSON fallback.
    await prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId: matrixRole.id, permissionId: customPerm.id } },
    });
    const afterRevoke = await getUserPermissions(userBId);
    expect(afterRevoke).not.toContain(customPerm.code);

    // Self-contained cleanup (afterAll only knows the IAM-001 fixtures).
    await prisma.userRole.deleteMany({ where: { roleId: matrixRole.id } });
    await prisma.role.delete({ where: { id: matrixRole.id } });
  });

  it('IAM-002: Cross-tenant read access is strictly BLOCKED between Org A and Org B', async () => {
    const ctxA = await getTenantAuthContext(userAId);
    const ctxB = await getTenantAuthContext(userBId);

    expect(ctxA.organizationId).toBe(orgAId);
    expect(ctxB.organizationId).toBe(orgBId);

    // Resource belonging to Org A
    const resourceOrgA = {
      organizationId: orgAId,
      customerId: userAId,
    };

    // User A can access Org A's resource
    expect(() => assertTenantAccess(ctxA, resourceOrgA)).not.toThrow();

    // User B from Org B CANNOT access Org A's resource -> Throws Forbidden
    expect(() => assertTenantAccess(ctxB, resourceOrgA)).toThrow(/Cross-tenant data access blocked/i);
  });

  it('IAM-003: IDOR protection blocks Customer A from accessing Customer B private resources', () => {
    const customerACtx = {
      userId: 'cust_a_123',
      role: 'CUSTOMER',
      isSuperAdmin: false,
      permissions: new Set<import('./permissions').ERPPermission>(['booking:create', 'booking:view']),
    };

    const resourceBelongingToCustomerB = {
      customerId: 'cust_b_456',
      organizationId: null,
    };

    expect(() => assertTenantAccess(customerACtx, resourceBelongingToCustomerB)).toThrow(
      /Unauthorized resource access/i
    );
  });

  it('SEC-001: Super Admin retains cross-tenant auditing & resolution authority', async () => {
    const adminCtx = await getTenantAuthContext(superAdminId);
    expect(adminCtx.isSuperAdmin).toBe(true);

    const resourceOrgA = { organizationId: orgAId, customerId: userAId };
    const resourceOrgB = { organizationId: orgBId, customerId: userBId };

    // Super Admin can access both without tenant blockage
    expect(() => assertTenantAccess(adminCtx, resourceOrgA)).not.toThrow();
    expect(() => assertTenantAccess(adminCtx, resourceOrgB)).not.toThrow();
  });

  it('IAM-007: tenant-scoped Prisma extension filters Booking by org and never breaks models without the column', async () => {
    const { getTenantScopedPrisma } = await import('@/lib/prisma');
    const ctxA = await getTenantAuthContext(userAId);
    const dbA = getTenantScopedPrisma(ctxA.organizationId, ctxA.isSuperAdmin);

    // 1. Regression guard (IAM-007 fix): models WITHOUT an organizationId column
    // (Invoice, TravelDocument) must pass through the extension untouched —
    // scoping them used to inject a Prisma validation error for every query.
    await expect(dbA.invoice.findMany({ take: 1 })).resolves.not.toThrow();
    await expect(dbA.travelDocument.findMany({ take: 1 })).resolves.not.toThrow();

    // 2. Booking IS org-scoped: a booking belonging to Org A is visible to A…
    const orgABooking = await prisma.booking.create({
      data: {
        reference: `ITR-SC-${suffix}`,
        customerId: userAId,
        status: 'CONFIRMED',
        totalAmount: 100,
        currency: 'IRR',
        organizationId: orgAId,
      },
    });

    const seenByA = await dbA.booking.findMany({ where: { reference: `ITR-SC-${suffix}` } });
    expect(seenByA).toHaveLength(1);

    // …and invisible to Org B's scoped client.
    const ctxB = await getTenantAuthContext(userBId);
    const dbB = getTenantScopedPrisma(ctxB.organizationId, ctxB.isSuperAdmin);
    const seenByB = await dbB.booking.findMany({ where: { reference: `ITR-SC-${suffix}` } });
    expect(seenByB).toHaveLength(0);

    await prisma.booking.delete({ where: { id: orgABooking.id } });
  });

  it('IAM-004: OrganizationMembership.roleId enforces referential integrity as a real foreign key to Role', async () => {
    // 1. Trying to link a membership to a non-existent roleId violates the foreign key constraint
    await expect(
      prisma.organizationMembership.create({
        data: {
          organizationId: orgAId,
          userId: superAdminId,
          roleId: 'non_existent_role_id_9999',
          status: 'ACTIVE',
        },
      })
    ).rejects.toThrow();

    // 2. Linking to an existing Role succeeds and the relation can be included
    const agentRole = await prisma.role.upsert({
      where: { name: 'AGENT' },
      update: {},
      create: { name: 'AGENT', permissions: '[]', description: 'Agent Role' },
    });

    const membership = await prisma.organizationMembership.create({
      data: {
        organizationId: orgAId,
        userId: superAdminId,
        roleId: agentRole.id,
        status: 'ACTIVE',
      },
      include: { role: true },
    });

    expect(membership.role).not.toBeNull();
    expect(membership.role?.name).toBe('AGENT');

    // Cleanup
    await prisma.organizationMembership.delete({ where: { id: membership.id } });
  });

  it('IAM-108: Complete org/branch authorization matrix in policies and access guards', async () => {
    // 1. Setup Branch THR (in Org A) and Branch SYZ (in Org B)
    const branchesA = await prisma.organizationBranch.findMany({ where: { organizationId: orgAId } });
    const branchA1 = branchesA[0];

    const branchA2 = await prisma.organizationBranch.create({
      data: { organizationId: orgAId, name: 'Org A Secondary Branch', code: 'A2' },
    });

    const branchAgentCtx = {
      userId: userAId,
      role: 'AGENT',
      organizationId: orgAId,
      branchId: branchA1.id,
      isSuperAdmin: false,
      permissions: new Set<import('./permissions').ERPPermission>(['booking:view', 'booking:create']),
    };

    // Matrix Rule 1: Same org, same branch -> ALLOW
    expect(() =>
      assertTenantAccess(branchAgentCtx, {
        organizationId: orgAId,
        branchId: branchA1.id,
      })
    ).not.toThrow();

    // Matrix Rule 2: Same org, different branch -> DENY
    expect(() =>
      assertTenantAccess(branchAgentCtx, {
        organizationId: orgAId,
        branchId: branchA2.id,
      })
    ).toThrow(/Branch access boundary violation/i);

    // Matrix Rule 3: Different org -> DENY
    expect(() =>
      assertTenantAccess(branchAgentCtx, {
        organizationId: orgBId,
        branchId: null,
      })
    ).toThrow(/Cross-tenant data access blocked/i);

    // Matrix Rule 4: Headquarter user without branch restriction can access all branches in own org
    const hqCtx = {
      userId: userAId,
      role: 'AGENT',
      organizationId: orgAId,
      branchId: undefined,
      isSuperAdmin: false,
      permissions: new Set<import('./permissions').ERPPermission>(['booking:view', 'booking:create']),
    };
    expect(() =>
      assertTenantAccess(hqCtx, {
        organizationId: orgAId,
        branchId: branchA2.id,
      })
    ).not.toThrow();

    await prisma.organizationBranch.delete({ where: { id: branchA2.id } });
  });

  it('IAM-110: Cross-organization write tests — TenantRepository blocks cross-org writes', async () => {
    const ctxA = await getTenantAuthContext(userAId);
    const repoA = TenantRepository.forContext(ctxA);

    // 1. User A attempting to create a Booking explicitly targeted at Org B is rejected
    await expect(
      repoA.createBooking({
        reference: `ITR-CROSS-${suffix}`,
        customerId: userAId,
        organizationId: orgBId, // Mismatched target org!
        status: 'DRAFT',
        totalAmount: 100,
        currency: 'IRR',
      })
    ).rejects.toThrow(TenantWriteViolationError);

    // 2. User A attempting to create an Invoice targeting Org B is rejected
    await expect(
      repoA.createInvoice({
        invoiceNumber: `INV-CROSS-${suffix}`,
        bookingId: `bkg_dummy_${suffix}`,
        customerId: userAId,
        organizationId: orgBId, // Mismatched target org!
        totalAmount: 100,
        netAmount: 90,
        taxAmount: 10,
        currency: 'IRR',
      })
    ).rejects.toThrow(TenantWriteViolationError);

    // 3. User A attempting to create a Trip targeting Org B is rejected
    await expect(
      repoA.createTrip({
        reference: `TRP-CROSS-${suffix}`,
        userId: userAId,
        organizationId: orgBId, // Mismatched target org!
        title: 'Cross Org Trip Attempt',
      })
    ).rejects.toThrow(TenantWriteViolationError);
  });

  it('IAM-104: Database consistency triggers prevent persisting cross-tenant ownership', async () => {
    // 1. Trip created for Org A
    const tripA = await prisma.trip.create({
      data: {
        reference: `TRP-TRG-${suffix}`,
        userId: userAId,
        organizationId: orgAId,
        title: 'Org A Trip',
      },
    });

    // 2. DB Trigger prevents inserting a Booking for Org B linked to a Trip belonging to Org A!
    await expect(
      prisma.booking.create({
        data: {
          reference: `ITR-TRG-FAIL-${suffix}`,
          customerId: userBId,
          organizationId: orgBId, // Org B!
          tripId: tripA.id,       // But Trip belongs to Org A!
          totalAmount: 100,
          currency: 'IRR',
          status: 'DRAFT',
        },
      })
    ).rejects.toThrow(/CROSS_ORG_VIOLATION/i);

    // 3. Valid booking with matching org succeeds
    const bookingA = await prisma.booking.create({
      data: {
        reference: `ITR-TRG-PASS-${suffix}`,
        customerId: userAId,
        organizationId: orgAId,
        tripId: tripA.id,
        totalAmount: 100,
        currency: 'IRR',
        status: 'DRAFT',
      },
    });
    expect(bookingA.id).toBeDefined();

    // 4. DB Trigger prevents inserting an Invoice for Org B linked to a Booking belonging to Org A!
    await expect(
      prisma.invoice.create({
        data: {
          invoiceNumber: `INV-TRG-FAIL-${suffix}`,
          bookingId: bookingA.id, // Booking belongs to Org A
          customerId: userBId,
          organizationId: orgBId, // Mismatched Org B!
          totalAmount: 100,
          netAmount: 100,
          currency: 'IRR',
        },
      })
    ).rejects.toThrow(/CROSS_ORG_VIOLATION/i);

    // 5. Cleanup
    await prisma.booking.delete({ where: { id: bookingA.id } });
    await prisma.trip.delete({ where: { id: tripA.id } });
  });
});
