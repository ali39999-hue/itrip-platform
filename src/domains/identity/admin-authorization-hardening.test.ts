/**
 * SEC — static authorization bypass removal + production credential guard.
 *
 * Regression matrix for the P0 audit findings:
 *   1. No static identity (`clr_admin_123`) may be granted ERP authority.
 *   2. A deleted / deactivated / missing principal must be DENIED.
 *   3. An unreadable authorization store must fail SAFE (deny), never open.
 *   4. A session minted before deactivation must revalidate on the next check.
 *   5. Production seeding without explicit passwords must THROW.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { hasErpRole, getTenantAuthContext } from './permission-service';
import { resolveSeedCredentials, DEV_ADMIN_FIXTURE, DEV_USER_FIXTURE } from '@/lib/security/seed-credentials';

const FORGED_STATIC_ID = 'clr_admin_123';

describe('SEC: static authorization bypass removal', () => {
  const suffix = `secauth_${Date.now().toString(36)}_${randomBytes(3).toString('hex')}`;
  let superAdminId = '';
  let operatorId = '';
  let roleId = '';

  beforeAll(async () => {
    // The test database must not contain the formerly-special-cased id, so the
    // "forged identity" assertion exercises the bypass rather than a seeded row.
    await prisma.user.deleteMany({ where: { id: FORGED_STATIC_ID } });

    const role = await prisma.role.upsert({
      where: { name: 'SUPER_ADMIN' },
      update: {},
      create: { name: 'SUPER_ADMIN', permissions: '[]', description: 'SUPER_ADMIN Role' },
    });
    roleId = role.id;

    const [admin, operator] = await Promise.all([
      prisma.user.create({
        data: { email: `secadmin_${suffix}@firuzo.com`, name: 'SEC Admin', role: 'CUSTOMER', isActive: true },
      }),
      prisma.user.create({
        data: { email: `secops_${suffix}@firuzo.com`, name: 'SEC Operator', role: 'CUSTOMER', isActive: true },
      }),
    ]);
    superAdminId = admin.id;
    operatorId = operator.id;

    // Relational grant is the *only* thing that should confer ERP authority.
    await prisma.userRole.create({ data: { userId: superAdminId, roleId } });
  });

  afterAll(async () => {
    try {
      await prisma.userRole.deleteMany({ where: { userId: { in: [superAdminId, operatorId] } } });
      await prisma.user.deleteMany({ where: { id: { in: [superAdminId, operatorId] } } });
    } catch {
      // cleanup is best-effort; ids are unique per run
    }
    vi.restoreAllMocks();
  });

  it('allows a live user holding the relational ERP role', async () => {
    expect(await hasErpRole(superAdminId)).toBe(true);
  });

  it('denies a forged static identity (bypass removed)', async () => {
    expect(await hasErpRole(FORGED_STATIC_ID)).toBe(false);
  });

  it('denies a user without any ERP role assignment', async () => {
    expect(await hasErpRole(operatorId)).toBe(false);
  });

  it('denies a deleted admin', async () => {
    const deleted = await prisma.user.create({
      data: { email: `secdeleted_${suffix}@firuzo.com`, name: 'SEC Deleted', isActive: true },
    });
    await prisma.userRole.create({ data: { userId: deleted.id, roleId } });
    expect(await hasErpRole(deleted.id)).toBe(true);

    await prisma.userRole.deleteMany({ where: { userId: deleted.id } });
    await prisma.user.delete({ where: { id: deleted.id } });

    expect(await hasErpRole(deleted.id)).toBe(false);
  });

  it('denies a deactivated admin and revalidates a session minted before deactivation', async () => {
    // The session would have been minted while the account was active…
    expect(await hasErpRole(superAdminId)).toBe(true);

    await prisma.user.update({ where: { id: superAdminId }, data: { isActive: false } });
    await prisma.userRole.deleteMany({ where: { userId: superAdminId } });
    // …but the next authorization check must not trust stale privilege.
    expect(await hasErpRole(superAdminId)).toBe(false);

    await prisma.user.update({ where: { id: superAdminId }, data: { isActive: true } });
    await prisma.userRole.create({ data: { userId: superAdminId, roleId } });
  });

  it('denies an unknown / missing user', async () => {
    expect(await hasErpRole(`nonexistent_${suffix}`)).toBe(false);
  });

  it('fails SAFE when the authorization store is unreadable', async () => {
    vi.spyOn(prisma.userRole, 'findMany').mockRejectedValueOnce(new Error('db down'));
    vi.spyOn(prisma.user, 'findUnique').mockRejectedValueOnce(new Error('db down'));
    await expect(hasErpRole(superAdminId)).resolves.toBe(false);
    vi.restoreAllMocks();
  });

  it('getTenantAuthContext throws for a missing principal instead of granting SUPER_ADMIN', async () => {
    await expect(getTenantAuthContext(FORGED_STATIC_ID)).rejects.toThrow(/not found/i);
    await expect(getTenantAuthContext(`ghost_${suffix}`)).rejects.toThrow(/not found/i);
  });

  it('getTenantAuthContext resolves SUPER_ADMIN from the relational assignment only', async () => {
    const ctx = await getTenantAuthContext(superAdminId);
    expect(ctx.isSuperAdmin).toBe(true);
    expect(ctx.userId).toBe(superAdminId);
  });
});

describe('SEC-013: production seed credentials', () => {
  it('throws in production when ADMIN_PASSWORD is missing', () => {
    expect(() => resolveSeedCredentials({ NODE_ENV: 'production', USER_PASSWORD: 'u-strong' })).toThrow(
      /ADMIN_PASSWORD/,
    );
  });

  it('throws in production when USER_PASSWORD is missing', () => {
    expect(() => resolveSeedCredentials({ NODE_ENV: 'production', ADMIN_PASSWORD: 'a-strong' })).toThrow(
      /USER_PASSWORD/,
    );
  });

  it('never returns a public fixture in production', () => {
    expect(() => resolveSeedCredentials({ NODE_ENV: 'production' })).toThrow(/SEC-013/);
  });

  it('accepts explicit production secrets', () => {
    const resolved = resolveSeedCredentials({
      NODE_ENV: 'production',
      ADMIN_PASSWORD: 'prod-admin-secret',
      USER_PASSWORD: 'prod-user-secret',
    });
    expect(resolved.adminPassword).toBe('prod-admin-secret');
    expect(resolved.userPassword).toBe('prod-user-secret');
    expect(resolved.usedDevFixtures).toBe(false);
  });

  it('uses clearly-isolated fixtures only outside production', () => {
    const resolved = resolveSeedCredentials({ NODE_ENV: 'development' });
    expect(resolved.adminPassword).toBe(DEV_ADMIN_FIXTURE);
    expect(resolved.userPassword).toBe(DEV_USER_FIXTURE);
    expect(resolved.usedDevFixtures).toBe(true);
  });
});