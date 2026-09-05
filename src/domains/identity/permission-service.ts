import { prisma } from '@/lib/prisma';
import { ERPPermission, ROLE_DEFAULT_PERMISSIONS } from './permissions';

export type { ERPPermission };
export { ROLE_DEFAULT_PERMISSIONS };

export interface TenantAuthContext {
  userId: string;
  role: string;
  organizationId?: string;
  branchId?: string;
  isSuperAdmin: boolean;
  permissions: Set<ERPPermission>;
}

/**
 * Resolves user permissions strictly preferring relational DB records (IAM-001)
 */
export async function getUserPermissions(userId: string): Promise<ERPPermission[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user) return [];

  const perms = new Set<ERPPermission>();

  // 1. Relational DB RBAC roles take primary authority (IAM-001)
  user.userRoles.forEach((ur) => {
    if (ur.role.rolePermissions && ur.role.rolePermissions.length > 0) {
      ur.role.rolePermissions.forEach((rp) => {
        perms.add(rp.permission.code as ERPPermission);
      });
    }

    // JSON fallback for backwards compatibility
    try {
      const rolePerms = JSON.parse(ur.role.permissions || '[]') as ERPPermission[];
      rolePerms.forEach((p) => perms.add(p));
    } catch {}
  });

  // 2. Direct system role defaults (SUPER_ADMIN, FINANCE, OPS, CUSTOMER)
  const roleDefaults = ROLE_DEFAULT_PERMISSIONS[user.role] || [];
  roleDefaults.forEach((p) => perms.add(p));

  return Array.from(perms);
}

/**
 * Builds an authoritative Tenant Authorization Context (IAM-002)
 * Principal -> Organization -> Branch -> Policy
 */
export async function getTenantAuthContext(userId?: string): Promise<TenantAuthContext> {
  let uid = userId;
  if (!uid) {
    const { safeAuth } = await import('@/auth');
    const session = await safeAuth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized: No active authenticated principal');
    }
    uid = session.user.id;
  }

  const user = await prisma.user.findUnique({
    where: { id: uid },
    include: {
      organizationMemberships: {
        where: { status: 'ACTIVE' },
        include: {
          organization: {
            include: { branches: true },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error(`Principal ${uid} not found`);
  }

  const permissionsList = await getUserPermissions(user.id);
  const permissions = new Set<ERPPermission>(permissionsList);
  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  const activeMembership = user.organizationMemberships[0];

  return {
    userId: user.id,
    role: user.role,
    organizationId: activeMembership?.organizationId,
    branchId: activeMembership?.organization?.branches?.[0]?.id,
    isSuperAdmin,
    permissions,
  };
}

/**
 * Strict Tenant Isolation Guard (IAM-002, IAM-003)
 * Blocks IDOR and cross-tenant access.
 * Organization A user CANNOT access Organization B resource.
 */
export function assertTenantAccess(
  ctx: TenantAuthContext,
  resource: { organizationId?: string | null; customerId?: string | null; branchId?: string | null }
): void {
  // Super Admin bypasses tenant isolation for cross-organization administration
  if (ctx.isSuperAdmin) {
    return;
  }

  // If resource belongs to a specific customer and caller is the owner
  if (resource.customerId && resource.customerId === ctx.userId) {
    return;
  }

  // If resource is scoped to an organization
  if (resource.organizationId) {
    if (!ctx.organizationId || ctx.organizationId !== resource.organizationId) {
      throw new Error('Forbidden: Cross-tenant data access blocked (Tenant Isolation)');
    }
    // If resource is scoped to a specific branch
    if (resource.branchId && ctx.branchId && resource.branchId !== ctx.branchId) {
      throw new Error('Forbidden: Branch access boundary violation');
    }
    return;
  }

  // If customer is viewing unassigned/public data with permission
  if (ctx.permissions.has('booking:view:all')) {
    return;
  }

  throw new Error('Forbidden: Unauthorized resource access (IDOR Guard)');
}

/**
 * Require specific resource-level permission
 */
export async function requirePermission(permission: ERPPermission | ERPPermission[]): Promise<{
  id: string;
  email: string | null;
  role: string;
  organizationId?: string;
}> {
  const { safeAuth } = await import('@/auth');
  const session = await safeAuth();
  if (!session || !session.user?.id) {
    throw new Error('Unauthorized');
  }

  const ctx = await getTenantAuthContext(session.user.id);
  const required = Array.isArray(permission) ? permission : [permission];
  const hasPermission = ctx.isSuperAdmin || required.some((p) => ctx.permissions.has(p));

  if (!hasPermission) {
    throw new Error(`Forbidden: Missing required permission '${Array.isArray(permission) ? permission.join(' or ') : permission}'`);
  }

  return {
    id: ctx.userId,
    email: session.user.email ?? null,
    role: ctx.role,
    organizationId: ctx.organizationId,
  };
}
