import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export type OrganizationType = 'AGENCY' | 'CORPORATE' | 'PARTNER' | 'INTERNAL';
export type OrganizationStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING';

export interface CreateOrganizationDTO {
  type: OrganizationType;
  legalName: string;
  displayName: string;
  registrationNo?: string | null;
  taxNo?: string | null;
  defaultCurrency?: string;
  timezone?: string;
}

export interface UpdateOrganizationDTO {
  type?: OrganizationType;
  legalName?: string;
  displayName?: string;
  registrationNo?: string | null;
  taxNo?: string | null;
  status?: OrganizationStatus;
  defaultCurrency?: string;
  timezone?: string;
}

export interface OrganizationListItem {
  id: string;
  type: string;
  legalName: string;
  displayName: string;
  status: string;
  defaultCurrency: string;
  membersCount: number;
  branchesCount: number;
  bookingsCount: number;
  createdAt: Date;
}

export interface OrganizationDetail {
  id: string;
  type: string;
  legalName: string;
  displayName: string;
  registrationNo: string | null;
  taxNo: string | null;
  status: string;
  defaultCurrency: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
  branches: Array<{
    id: string;
    name: string;
    code: string | null;
    status: string;
  }>;
  members: Array<{
    id: string;
    userId: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    roleName: string | null;
    branchName: string | null;
    createdAt: Date;
  }>;
  metrics: {
    totalBookings: number;
    totalInvoices: number;
    totalTrips: number;
  };
}

export class OrganizationService {
  /**
   * Lists organizations with pagination and metrics summary.
   */
  static async listOrganizations(params?: {
    type?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: OrganizationListItem[]; total: number }> {
    const page = Math.max(1, params?.page || 1);
    const limit = Math.min(100, Math.max(1, params?.limit || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.OrganizationWhereInput = {};

    if (params?.type && params.type !== 'ALL') {
      where.type = params.type;
    }
    if (params?.status && params.status !== 'ALL') {
      where.status = params.status;
    }
    if (params?.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { displayName: { contains: q, mode: 'insensitive' } },
        { legalName: { contains: q, mode: 'insensitive' } },
        { registrationNo: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, orgs] = await Promise.all([
      prisma.organization.count({ where }),
      prisma.organization.findMany({
        where,
        include: {
          _count: {
            select: {
              memberships: true,
              branches: true,
              bookings: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      items: orgs.map((o) => ({
        id: o.id,
        type: o.type,
        legalName: o.legalName,
        displayName: o.displayName,
        status: o.status,
        defaultCurrency: o.defaultCurrency,
        membersCount: o._count.memberships,
        branchesCount: o._count.branches,
        bookingsCount: o._count.bookings,
        createdAt: o.createdAt,
      })),
    };
  }

  /**
   * Retrieves full details, branches, and member roster for an organization.
   */
  static async getOrganizationById(orgId: string): Promise<OrganizationDetail | null> {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        branches: {
          orderBy: { createdAt: 'asc' },
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                firstNameFa: true,
                lastNameFa: true,
              },
            },
            role: { select: { name: true } },
            branch: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            bookings: true,
            invoices: true,
            trips: true,
          },
        },
      },
    });

    if (!org) return null;

    return {
      id: org.id,
      type: org.type,
      legalName: org.legalName,
      displayName: org.displayName,
      registrationNo: org.registrationNo,
      taxNo: org.taxNo,
      status: org.status,
      defaultCurrency: org.defaultCurrency,
      timezone: org.timezone,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      branches: org.branches.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        status: b.status,
      })),
      members: org.memberships.map((m) => ({
        id: m.id,
        userId: m.user.id,
        name:
          m.user.name ||
          (m.user.firstNameFa ? `${m.user.firstNameFa} ${m.user.lastNameFa || ''}`.trim() : null),
        email: m.user.email,
        phone: m.user.phone,
        roleName: m.role?.name || null,
        branchName: m.branch?.name || null,
        createdAt: m.createdAt,
      })),
      metrics: {
        totalBookings: org._count.bookings,
        totalInvoices: org._count.invoices,
        totalTrips: org._count.trips,
      },
    };
  }

  /**
   * Creates a new organization and initializes its default headquarters branch.
   */
  static async createOrganization(dto: CreateOrganizationDTO): Promise<OrganizationDetail> {
    if (!dto.legalName.trim() || !dto.displayName.trim()) {
      throw new Error('نام قانونی و نام نمایشی سازمان الزامی است.');
    }

    const created = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          type: dto.type,
          legalName: dto.legalName.trim(),
          displayName: dto.displayName.trim(),
          registrationNo: dto.registrationNo?.trim() || null,
          taxNo: dto.taxNo?.trim() || null,
          defaultCurrency: dto.defaultCurrency || 'IRR',
          timezone: dto.timezone || 'Asia/Tehran',
          status: 'ACTIVE',
        },
      });

      // Initialize default Headquarters branch
      await tx.organizationBranch.create({
        data: {
          organizationId: org.id,
          name: 'دفتر مرکزی',
          code: 'HQ',
          status: 'ACTIVE',
        },
      });

      return org;
    });

    const detail = await this.getOrganizationById(created.id);
    if (!detail) {
      throw new Error('خطا در بارگذاری اطلاعات سازمان پس از ثبت.');
    }
    return detail;
  }

  /**
   * Updates organization profile fields.
   */
  static async updateOrganization(
    orgId: string,
    dto: UpdateOrganizationDTO
  ): Promise<OrganizationDetail> {
    const existing = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!existing) {
      throw new Error('سازمان مورد نظر یافت نشد.');
    }

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(dto.type && { type: dto.type }),
        ...(dto.legalName && { legalName: dto.legalName.trim() }),
        ...(dto.displayName && { displayName: dto.displayName.trim() }),
        ...(dto.registrationNo !== undefined && { registrationNo: dto.registrationNo?.trim() || null }),
        ...(dto.taxNo !== undefined && { taxNo: dto.taxNo?.trim() || null }),
        ...(dto.status && { status: dto.status }),
        ...(dto.defaultCurrency && { defaultCurrency: dto.defaultCurrency }),
        ...(dto.timezone && { timezone: dto.timezone }),
      },
    });

    const detail = await this.getOrganizationById(orgId);
    if (!detail) throw new Error('خطا در دریافت اطلاعات سازمان.');
    return detail;
  }

  /**
   * Adds or updates a user membership in an organization.
   */
  static async addMember(params: {
    organizationId: string;
    userIdentifier: string; // email, phone, or userId
    roleName?: string;
    branchId?: string;
  }): Promise<{ id: string; userId: string; roleName: string | null }> {
    const org = await prisma.organization.findUnique({ where: { id: params.organizationId } });
    if (!org) throw new Error('سازمان یافت نشد.');

    // Find User
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: params.userIdentifier },
          { email: params.userIdentifier },
          { phone: params.userIdentifier },
        ],
      },
    });

    if (!user) {
      throw new Error('کاربری با ایمیل، شماره یا شناسه وارد شده یافت نشد.');
    }

    // Resolve Role if specified
    let roleId: string | undefined;
    if (params.roleName) {
      const role = await prisma.role.findUnique({ where: { name: params.roleName } });
      if (role) roleId = role.id;
    }

    // Verify branch belongs to organization if provided
    if (params.branchId) {
      const branch = await prisma.organizationBranch.findFirst({
        where: { id: params.branchId, organizationId: params.organizationId },
      });
      if (!branch) {
        throw new Error('شعبه انتخاب شده متعلق به این سازمان نیست.');
      }
    }

    const membership = await prisma.organizationMembership.upsert({
      where: {
        organizationId_userId: {
          organizationId: params.organizationId,
          userId: user.id,
        },
      },
      update: {
        branchId: params.branchId || null,
        roleId: roleId || null,
      },
      create: {
        organizationId: params.organizationId,
        userId: user.id,
        branchId: params.branchId || null,
        roleId: roleId || null,
      },
      include: {
        role: true,
      },
    });

    return {
      id: membership.id,
      userId: user.id,
      roleName: membership.role?.name || null,
    };
  }

  /**
   * Removes a member from an organization.
   */
  static async removeMember(organizationId: string, membershipId: string): Promise<boolean> {
    const membership = await prisma.organizationMembership.findFirst({
      where: {
        id: membershipId,
        organizationId,
      },
    });

    if (!membership) {
      throw new Error('عضویت در این سازمان یافت نشد.');
    }

    await prisma.organizationMembership.delete({
      where: { id: membershipId },
    });
    return true;
  }

  /**
   * Creates an additional branch for an organization.
   */
  static async createBranch(
    organizationId: string,
    name: string,
    code?: string
  ): Promise<{ id: string; name: string; code: string | null }> {
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new Error('سازمان یافت نشد.');

    const branch = await prisma.organizationBranch.create({
      data: {
        organizationId,
        name: name.trim(),
        code: code?.trim() || null,
        status: 'ACTIVE',
      },
    });

    return {
      id: branch.id,
      name: branch.name,
      code: branch.code,
    };
  }
}
