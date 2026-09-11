'use server';

import { requirePermission } from '@/domains/identity/permission-service';
import {
  OrganizationService,
  CreateOrganizationDTO,
  UpdateOrganizationDTO,
  OrganizationListItem,
  OrganizationDetail,
} from '@/domains/identity/OrganizationService';
import { revalidatePath } from 'next/cache';

export type { OrganizationListItem, OrganizationDetail };

export async function getAdminOrganizationsAction(params?: {
  type?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  items?: OrganizationListItem[];
  total?: number;
  error?: string;
}> {
  try {
    await requirePermission(['booking:view:all', 'ops:override:cancel']);
    const res = await OrganizationService.listOrganizations(params);
    return { success: true, items: res.items, total: res.total };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطا در بارگذاری لیست سازمان‌ها';
    return { success: false, error: msg };
  }
}

export async function getAdminOrganizationDetailAction(orgId: string): Promise<{
  success: boolean;
  organization?: OrganizationDetail;
  error?: string;
}> {
  try {
    await requirePermission(['booking:view:all', 'ops:override:cancel']);
    const org = await OrganizationService.getOrganizationById(orgId);
    if (!org) {
      return { success: false, error: 'سازمان یافت نشد.' };
    }
    return { success: true, organization: org };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطا در دریافت مشخصات سازمان';
    return { success: false, error: msg };
  }
}

export async function createOrganizationAction(data: CreateOrganizationDTO): Promise<{
  success: boolean;
  organization?: OrganizationDetail;
  error?: string;
}> {
  try {
    await requirePermission(['user:manage', 'ops:override:cancel']);
    const org = await OrganizationService.createOrganization(data);
    revalidatePath('/admin/organizations');
    return { success: true, organization: org };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطا در ثبت سازمان جدید';
    return { success: false, error: msg };
  }
}

export async function updateOrganizationAction(
  orgId: string,
  data: UpdateOrganizationDTO
): Promise<{
  success: boolean;
  organization?: OrganizationDetail;
  error?: string;
}> {
  try {
    await requirePermission(['user:manage', 'ops:override:cancel']);
    const org = await OrganizationService.updateOrganization(orgId, data);
    revalidatePath('/admin/organizations');
    revalidatePath(`/admin/organizations/${orgId}`);
    return { success: true, organization: org };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطا در ویرایش اطلاعات سازمان';
    return { success: false, error: msg };
  }
}

export async function addOrganizationMemberAction(params: {
  organizationId: string;
  userIdentifier: string;
  roleName?: string;
  branchId?: string;
}): Promise<{
  success: boolean;
  member?: { id: string; userId: string; roleName: string | null };
  error?: string;
}> {
  try {
    await requirePermission(['user:manage', 'ops:override:cancel']);
    const member = await OrganizationService.addMember(params);
    revalidatePath(`/admin/organizations/${params.organizationId}`);
    return { success: true, member };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطا در افزودن عضو به سازمان';
    return { success: false, error: msg };
  }
}

export async function removeOrganizationMemberAction(
  organizationId: string,
  membershipId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await requirePermission(['user:manage', 'ops:override:cancel']);
    await OrganizationService.removeMember(organizationId, membershipId);
    revalidatePath(`/admin/organizations/${organizationId}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطا در حذف عضو از سازمان';
    return { success: false, error: msg };
  }
}

export async function createOrganizationBranchAction(
  organizationId: string,
  name: string,
  code?: string
): Promise<{
  success: boolean;
  branch?: { id: string; name: string; code: string | null };
  error?: string;
}> {
  try {
    await requirePermission(['user:manage', 'ops:override:cancel']);
    const branch = await OrganizationService.createBranch(organizationId, name, code);
    revalidatePath(`/admin/organizations/${organizationId}`);
    return { success: true, branch };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطا در ایجاد شعبه جدید';
    return { success: false, error: msg };
  }
}

export async function getMyOrganizationInfoAction(): Promise<{
  success: boolean;
  memberships?: Array<{
    id: string;
    organization: {
      id: string;
      displayName: string;
      legalName: string;
      type: string;
      registrationNo: string | null;
      taxNo: string | null;
      status: string;
      defaultCurrency: string;
      branches: Array<{ id: string; name: string; code: string | null }>;
    };
    branchName: string | null;
    roleName: string | null;
    createdAt: Date;
  }>;
  corporateBookings?: Array<{
    id: string;
    reference: string;
    status: string;
    totalAmount: number;
    currency: string;
    createdAt: Date;
    title: string;
  }>;
  error?: string;
}> {
  try {
    const { safeAuth } = await import('@/auth');
    const session = await safeAuth();
    if (!session?.user?.id) {
      return { success: false, error: 'احراز هویت انجام نشده است.' };
    }

    const { prisma } = await import('@/lib/prisma');
    const memberships = await prisma.organizationMembership.findMany({
      where: { userId: session.user.id },
      include: {
        organization: {
          include: {
            branches: { select: { id: true, name: true, code: true } },
          },
        },
        branch: { select: { name: true } },
        role: { select: { name: true } },
      },
    });

    const orgIds = memberships.map((m) => m.organizationId);
    let corporateBookings: Array<{
      id: string;
      reference: string;
      status: string;
      totalAmount: number;
      currency: string;
      createdAt: Date;
      title: string;
    }> = [];

    if (orgIds.length > 0) {
      const bookings = await prisma.booking.findMany({
        where: { organizationId: { in: orgIds } },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      corporateBookings = bookings.map((b) => ({
        id: b.id,
        reference: b.reference,
        status: b.status,
        totalAmount: Number(b.totalAmount) || 0,
        currency: b.currency,
        createdAt: b.createdAt,
        title:
          b.items
            .map((it) => {
              try {
                return JSON.parse(it.details).title || it.type;
              } catch {
                return it.type;
              }
            })
            .join(' | ') || 'سفر شرکتی',
      }));
    }

    return {
      success: true,
      memberships: memberships.map((m) => ({
        id: m.id,
        organization: {
          id: m.organization.id,
          displayName: m.organization.displayName,
          legalName: m.organization.legalName,
          type: m.organization.type,
          registrationNo: m.organization.registrationNo,
          taxNo: m.organization.taxNo,
          status: m.organization.status,
          defaultCurrency: m.organization.defaultCurrency,
          branches: m.organization.branches,
        },
        branchName: m.branch?.name || null,
        roleName: m.role?.name || null,
        createdAt: m.createdAt,
      })),
      corporateBookings,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطا در دریافت اطلاعات سازمان';
    return { success: false, error: msg };
  }
}
