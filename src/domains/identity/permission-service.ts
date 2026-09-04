import { prisma } from '@/lib/prisma';
import { safeAuth } from '@/auth';
import { ERPPermission, ROLE_DEFAULT_PERMISSIONS } from './permissions';

export type { ERPPermission };
export { ROLE_DEFAULT_PERMISSIONS };

export async function getUserPermissions(userId: string): Promise<ERPPermission[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: { role: true },
      },
    },
  });

  if (!user) return [];

  const perms = new Set<ERPPermission>();

  // 1. Direct role mapping
  const roleDefaults = ROLE_DEFAULT_PERMISSIONS[user.role] || [];
  roleDefaults.forEach((p) => perms.add(p));

  // 2. Dynamic DB RBAC roles
  user.userRoles.forEach((ur) => {
    try {
      const rolePerms = JSON.parse(ur.role.permissions || '[]') as ERPPermission[];
      rolePerms.forEach((p) => perms.add(p));
    } catch {}
  });

  return Array.from(perms);
}

export async function requirePermission(permission: ERPPermission | ERPPermission[]): Promise<{
  id: string;
  email: string | null;
  role: string;
}> {
  const session = await safeAuth();
  if (!session || !session.user?.id) {
    throw new Error('Unauthorized');
  }

  const userPerms = await getUserPermissions(session.user.id);
  const required = Array.isArray(permission) ? permission : [permission];
  const hasPermission = required.some((p) => userPerms.includes(p));

  if (!hasPermission) {
    throw new Error(`Forbidden: Missing required permission '${Array.isArray(permission) ? permission.join(' or ') : permission}'`);
  }

  return {
    id: session.user.id,
    email: session.user.email ?? null,
    role: session.user.role ?? 'CUSTOMER',
  };
}
