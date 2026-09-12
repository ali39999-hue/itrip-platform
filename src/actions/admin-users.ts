'use server';

import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/domains/identity/permission-service';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

export interface AdminUserListItem {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  roles: string[];
}

export async function getAdminUsers(params?: {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
}): Promise<{ success: boolean; users: AdminUserListItem[]; total: number; error?: string }> {
  try {
    await requirePermission(['user:manage', 'ops:override:cancel']);

    const page = Math.max(1, params?.page || 1);
    const limit = Math.min(100, Math.max(1, params?.limit || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (params?.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
        { firstNameFa: { contains: q } },
        { lastNameFa: { contains: q } },
      ];
    }

    if (params?.role && params.role !== 'ALL') {
      where.OR = [
        { role: params.role },
        { userRoles: { some: { role: { name: params.role } } } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          firstNameFa: true,
          lastNameFa: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          userRoles: {
            select: { role: { select: { name: true } } },
          },
        },
      }),
    ]);

    const users: AdminUserListItem[] = rows.map((u) => {
      const assigned = u.userRoles.map((ur) => ur.role.name);
      const displayName =
        u.name ||
        [u.firstNameFa, u.lastNameFa].filter(Boolean).join(' ') ||
        u.phone ||
        u.email ||
        'کاربر بی نام';

      return {
        id: u.id,
        name: displayName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
        roles: assigned.length > 0 ? assigned : [u.role],
      };
    });

    return { success: true, users, total };
  } catch (err: unknown) {
    console.error('[getAdminUsers] error:', err);
    return { success: false, users: [], total: 0, error: err instanceof Error ? err.message : 'Failed to fetch users' };
  }
}

export async function createAdminStaffUser(data: {
  name: string;
  email?: string;
  phone?: string;
  role: 'SUPER_ADMIN' | 'FINANCE' | 'OPS';
  password?: string;
}) {
  try {
    const admin = await requirePermission('user:manage');

    if (!data.name?.trim()) {
      return { success: false, error: 'نام همکار الزامی است.' };
    }
    if (!data.email?.trim() && !data.phone?.trim()) {
      return { success: false, error: 'حداقل یکی از موارد ایمیل یا شماره همراه الزامی است.' };
    }

    const cleanEmail = data.email?.trim().toLowerCase() || null;
    const cleanPhone = data.phone?.trim() || null;

    // Check duplicate
    if (cleanEmail) {
      const existingEmail = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (existingEmail) return { success: false, error: 'این ایمیل قبلاً ثبت شده است.' };
    }
    if (cleanPhone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone: cleanPhone } });
      if (existingPhone) return { success: false, error: 'این شماره تماس قبلاً ثبت شده است.' };
    }

    const passwordHash = data.password?.trim()
      ? await bcrypt.hash(data.password.trim(), 10)
      : await bcrypt.hash('Staff@Firuzo2026!', 10);

    const created = await prisma.$transaction(async (tx) => {
      // 1. Ensure Role exists
      const roleRecord = await tx.role.upsert({
        where: { name: data.role },
        update: {},
        create: {
          name: data.role,
          description: `${data.role} Staff Role`,
        },
      });

      // 2. Create User
      const user = await tx.user.create({
        data: {
          name: data.name.trim(),
          email: cleanEmail,
          phone: cleanPhone,
          role: data.role,
          passwordHash,
          isActive: true,
        },
      });

      // 3. Assign relational UserRole (IAM-001 canonical authority)
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: roleRecord.id,
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: 'STAFF_USER_CREATED',
          resource: 'User',
          resourceId: user.id,
          newData: JSON.stringify({ name: user.name, email: user.email, phone: user.phone, role: data.role }),
          reason: `Admin ${admin.email || admin.id} created staff member ${user.name} with role ${data.role}`,
        },
      });

      return user;
    });

    revalidatePath('/admin/users');
    revalidatePath('/admin/ops');
    return { success: true, userId: created.id };
  } catch (err: unknown) {
    console.error('[createAdminStaffUser] error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'خطا در ثبت همکار جدید' };
  }
}

export async function updateAdminUserRole(data: {
  userId: string;
  roleName: 'SUPER_ADMIN' | 'FINANCE' | 'OPS' | 'CUSTOMER';
}) {
  try {
    const admin = await requirePermission(['user:manage', 'role:manage']);

    await prisma.$transaction(async (tx) => {
      // 1. Update compat role field
      await tx.user.update({
        where: { id: data.userId },
        data: { role: data.roleName },
      });

      // 2. Remove previous staff roles
      const staffRoles = await tx.role.findMany({
        where: { name: { in: ['SUPER_ADMIN', 'FINANCE', 'OPS'] } },
        select: { id: true },
      });
      await tx.userRole.deleteMany({
        where: {
          userId: data.userId,
          roleId: { in: staffRoles.map((r) => r.id) },
        },
      });

      // 3. If new role is a staff role, assign relational UserRole
      if (data.roleName !== 'CUSTOMER') {
        const targetRole = await tx.role.upsert({
          where: { name: data.roleName },
          update: {},
          create: { name: data.roleName, description: `${data.roleName} Role` },
        });

        await tx.userRole.upsert({
          where: { userId_roleId: { userId: data.userId, roleId: targetRole.id } },
          update: {},
          create: { userId: data.userId, roleId: targetRole.id },
        });
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: 'USER_ROLE_UPDATED',
          resource: 'User',
          resourceId: data.userId,
          newData: JSON.stringify({ role: data.roleName }),
          reason: `Role changed to ${data.roleName} by ${admin.email || admin.id}`,
        },
      });
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (err: unknown) {
    console.error('[updateAdminUserRole] error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'خطا در ویرایش دسترسی کاربر' };
  }
}

export async function toggleAdminUserActive(userId: string, isActive: boolean) {
  try {
    const admin = await requirePermission('user:manage');

    if (admin.id === userId) {
      return { success: false, error: 'نمی‌توانید حساب کاربری خودتان را غیرفعال کنید.' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { isActive },
      });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
          resource: 'User',
          resourceId: userId,
          reason: `User ${isActive ? 'activated' : 'deactivated'} by ${admin.email || admin.id}`,
        },
      });
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (err: unknown) {
    console.error('[toggleAdminUserActive] error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'خطا در تغییر وضعیت کاربر' };
  }
}

export async function addCustomerNoteAction(
  targetUserId: string,
  note: string
): Promise<{
  success: boolean;
  note?: { id: string; note: string; authorName: string; createdAt: Date };
  error?: string;
}> {
  try {
    const admin = await requirePermission(['booking:view:all', 'ops:override:cancel']);
    const { Customer360Service } = await import('@/domains/identity/Customer360Service');
    const { getTenantAuthContext } = await import('@/domains/identity/permission-service');
    // Organization-scoped operators may only note customers of their own org.
    const tenantCtx = await getTenantAuthContext(admin.id);
    await Customer360Service.assertCustomerAccess(targetUserId, tenantCtx);
    const createdNote = await Customer360Service.addCustomerNote(targetUserId, admin.id, note);
    revalidatePath(`/admin/users/${targetUserId}`);
    return { success: true, note: createdNote };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطا در ثبت یادداشت';
    return { success: false, error: msg };
  }
}
