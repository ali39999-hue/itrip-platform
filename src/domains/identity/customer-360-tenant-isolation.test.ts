import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import {
  Customer360Service,
  Customer360AccessDeniedError,
} from './Customer360Service';
import type { TenantAuthContext } from './permission-service';

/**
 * §11 MANDATORY tenant-isolation matrix for Customer 360 (P0):
 *
 *   Organization A operator → Customer A          = ALLOW
 *   Organization A operator → Customer B          = DENY
 *   Organization B operator → Customer A          = DENY
 *   Unauthorized operator  → Customer 360         = DENY
 *
 * Cross-tenant access must fail server-side, inside the service.
 */
describe('Customer360 tenant isolation matrix (P0)', () => {
  const suffix = `c360iso_${Date.now().toString(36)}_${randomBytes(3).toString('hex')}`;
  let customerAId = '';
  let customerBId = '';
  let orgAId = '';
  let orgBId = '';
  const cleanupIds: string[] = [];

  function orgOperatorCtx(organizationId: string): TenantAuthContext {
    // An organization-scoped operator that DOES hold the platform-wide view
    // permission — the service must still scope it to the org (IAM-002).
    return {
      userId: `op_${organizationId}`,
      role: 'ORG_OPERATOR',
      organizationId,
      isSuperAdmin: false,
      permissions: new Set(['booking:view:all']) as TenantAuthContext['permissions'],
    };
  }

  function platformStaffCtx(): TenantAuthContext {
    return {
      userId: 'staff_platform',
      role: 'OPS',
      isSuperAdmin: false,
      permissions: new Set(['booking:view:all']) as TenantAuthContext['permissions'],
    };
  }

  beforeAll(async () => {
    const [customerA, customerB, orgA, orgB] = await Promise.all([
      prisma.user.create({ data: { email: `a_${suffix}@firuzo.com`, name: 'مشتری سازمان A' } }),
      prisma.user.create({ data: { email: `b_${suffix}@firuzo.com`, name: 'مشتری سازمان B' } }),
      prisma.organization.create({
        data: { legalName: `OrgA ${suffix}`, displayName: `سازمان A ${suffix}`, type: 'CORPORATE' },
      }),
      prisma.organization.create({
        data: { legalName: `OrgB ${suffix}`, displayName: `سازمان B ${suffix}`, type: 'CORPORATE' },
      }),
    ]);
    customerAId = customerA.id;
    customerBId = customerB.id;
    orgAId = orgA.id;
    orgBId = orgB.id;
    cleanupIds.push(customerAId, customerBId);

    await prisma.organizationMembership.create({
      data: { organizationId: orgAId, userId: customerAId },
    });
    await prisma.organizationMembership.create({
      data: { organizationId: orgBId, userId: customerBId },
    });
  });

  afterAll(async () => {
    try {
      await prisma.auditLog.deleteMany({
        where: { OR: [{ resourceId: { in: cleanupIds } }, { userId: { contains: suffix } }] },
      });
      await prisma.organizationMembership.deleteMany({
        where: { organizationId: { in: [orgAId, orgBId] } },
      });
      await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
      await prisma.user.deleteMany({ where: { id: { in: cleanupIds } } });
    } catch {
      // Best effort
    }
  });

  it('Organization A operator → Customer A (own org member) = ALLOW', async () => {
    const data = await Customer360Service.getCustomer360(customerAId, orgOperatorCtx(orgAId));
    expect(data).not.toBeNull();
    expect(data?.user.id).toBe(customerAId);
  });

  it('Organization A operator → Customer B (other org member) = DENY', async () => {
    await expect(
      Customer360Service.getCustomer360(customerBId, orgOperatorCtx(orgAId))
    ).rejects.toThrow(Customer360AccessDeniedError);
  });

  it('Organization B operator → Customer A = DENY', async () => {
    await expect(
      Customer360Service.getCustomer360(customerAId, orgOperatorCtx(orgBId))
    ).rejects.toThrow(Customer360AccessDeniedError);
  });

  it('Unauthorized (no context) → Customer 360 = DENY', async () => {
    await expect(Customer360Service.getCustomer360(customerAId, undefined)).rejects.toThrow(
      Customer360AccessDeniedError
    );
  });

  it('Organization operator cannot bypass scoping even while holding booking:view:all → unrelated customer = DENY', async () => {
    const outsider = await prisma.user.create({
      data: { email: `out_${suffix}@firuzo.com`, name: 'مشتری بدون سازمان' },
    });
    try {
      await expect(
        Customer360Service.getCustomer360(outsider.id, orgOperatorCtx(orgAId))
      ).rejects.toThrow(Customer360AccessDeniedError);
    } finally {
      await prisma.user.delete({ where: { id: outsider.id } });
    }
  });

  it('Platform staff (no org scope, booking:view:all) → Customer A = ALLOW', async () => {
    const data = await Customer360Service.getCustomer360(customerAId, platformStaffCtx());
    expect(data?.user.id).toBe(customerAId);
  });

  it('Self view = ALLOW', async () => {
    const selfCtx: TenantAuthContext = {
      userId: customerAId,
      role: 'CUSTOMER',
      isSuperAdmin: false,
      permissions: new Set() as TenantAuthContext['permissions'],
    };
    const data = await Customer360Service.getCustomer360(customerAId, selfCtx);
    expect(data?.user.id).toBe(customerAId);
  });

  it('assertCustomerAccess denies a customer viewing another customer even with an org they both belong to check', async () => {
    // A customer of org B trying to view org A's customer (same shape as row 3)
    await expect(
      Customer360Service.assertCustomerAccess(customerAId, orgOperatorCtx(orgBId))
    ).rejects.toThrow(Customer360AccessDeniedError);
  });
});
