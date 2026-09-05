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

/** Role names that grant ERP back-office access (checked relationally via UserRole). */
export const ERP_STAFF_ROLES = ['SUPER_ADMIN', 'FINANCE', 'OPS'] as const;

/**
 * ERP gate resolved strictly from the relational chain (IAM-001).
 * Replaces the legacy `['SUPER_ADMIN','FINANCE','OPS'].includes(user.role)`
 * string check on server-side admin surfaces.
 */
export async function hasErpRole(userId?: string): Promise<boolean> {
  let uid = userId;
  if (!uid) {
    const { safeAuth } = await import('@/auth');
    const session = await safeAuth();
    uid = session?.user?.id;
  }
  if (!uid) return false;

  const assignments = await prisma.userRole.findMany({
    where: { userId: uid },
    select: { role: { select: { name: true } } },
  });
  return assignments.some((ur) => (ERP_STAFF_ROLES as readonly string[]).includes(ur.role.name));
}

/**
 * Resolves user permissions strictly from relational RBAC records (IAM-001).
 * The relational chain User → UserRole → Role → RolePermission → Permission is
 * the SOLE authority. The legacy `User.role` string and `Role.permissions` JSON
 * are display/compat fields only and never grant permissions.
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
  user.userRoles.forEach((ur) => {
    ur.role.rolePermissions.forEach((rp) => {
      perms.add(rp.permission.code as ERPPermission);
    });
  });

  return Array.from(perms);
}

/**
 * Builds an authoritative Tenant Authorization Context (IAM-002, IAM-003)
 * Principal → Organization → Branch → Policy
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
      userRoles: { include: { role: true } },
      organizationMemberships: {
        where: { status: 'ACTIVE' },
        include: {
          branch: true,
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
  // Authority comes from the relational role assignment, not the legacy string.
  const isSuperAdmin = user.userRoles.some((ur) => ur.role.name === 'SUPER_ADMIN');

  const activeMembership = user.organizationMemberships[0];

  return {
    userId: user.id,
    role: user.role,
    organizationId: activeMembership?.organizationId,
    branchId: activeMembership?.branchId ?? activeMembership?.organization?.branches?.[0]?.id,
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
