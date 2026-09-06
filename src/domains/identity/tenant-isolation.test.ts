import { describe, it, expect, afterAll } from 'vitest';
import {
  getUserPermissions,
  getTenantAuthContext,
  assertTenantAccess,
} from './permission-service';
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
});
