import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { OrganizationService } from './OrganizationService';

describe('OrganizationService - B2B Multi-tenancy Domain Suite', () => {
  const suffix = `org_${Date.now().toString(36)}_${randomBytes(3).toString('hex')}`;
  let orgId = '';
  let userId = '';
  let membershipId = '';

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `corp_${suffix}@firuzo.com`,
        phone: `+98912${Math.floor(1000000 + Math.random() * 9000000)}`,
        name: 'مدیر آژانس همسفران',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    try {
      if (orgId) {
        await prisma.organizationMembership.deleteMany({ where: { organizationId: orgId } });
        await prisma.organizationBranch.deleteMany({ where: { organizationId: orgId } });
        await prisma.organization.deleteMany({ where: { id: orgId } });
      }
      if (userId) {
        await prisma.user.deleteMany({ where: { id: userId } });
      }
    } catch {
      // Ignore
    }
  });

  it('should create an organization with default headquarters branch', async () => {
    const org = await OrganizationService.createOrganization({
      type: 'AGENCY',
      legalName: `شرکت خدمات مسافرتی همسفران ${suffix}`,
      displayName: 'آژانس همسفران ارس',
      registrationNo: '12345678',
      taxNo: '987654321',
      defaultCurrency: 'IRR',
    });

    expect(org).toBeDefined();
    expect(org.id).toBeDefined();
    expect(org.type).toBe('AGENCY');
    expect(org.displayName).toBe('آژانس همسفران ارس');
    expect(org.branches.length).toBe(1);
    expect(org.branches[0].name).toBe('دفتر مرکزی');
    orgId = org.id;
  });

  it('should list organizations and filter by type', async () => {
    const res = await OrganizationService.listOrganizations({
      type: 'AGENCY',
      limit: 10,
    });

    expect(res.total).toBeGreaterThanOrEqual(1);
    const found = res.items.find((o) => o.id === orgId);
    expect(found).toBeDefined();
    expect(found?.type).toBe('AGENCY');
    expect(found?.branchesCount).toBeGreaterThanOrEqual(1);
  });

  it('should update organization details', async () => {
    const updated = await OrganizationService.updateOrganization(orgId, {
      displayName: 'آژانس بین‌المللی همسفران ارس',
      status: 'ACTIVE',
    });

    expect(updated.displayName).toBe('آژانس بین‌المللی همسفران ارس');
    expect(updated.status).toBe('ACTIVE');
  });

  it('should add an operational branch to the organization', async () => {
    const branch = await OrganizationService.createBranch(orgId, 'شعبه فرودگاه امام خمینی', 'IKA');
    expect(branch).toBeDefined();
    expect(branch.name).toBe('شعبه فرودگاه امام خمینی');
    expect(branch.code).toBe('IKA');

    const detail = await OrganizationService.getOrganizationById(orgId);
    expect(detail?.branches.length).toBe(2);
  });

  it('should add a member to the organization', async () => {
    const member = await OrganizationService.addMember({
      organizationId: orgId,
      userIdentifier: userId,
    });

    expect(member).toBeDefined();
    expect(member.userId).toBe(userId);
    membershipId = member.id;

    const detail = await OrganizationService.getOrganizationById(orgId);
    expect(detail?.members.length).toBe(1);
    expect(detail?.members[0].userId).toBe(userId);
  });

  it('should remove a member from the organization', async () => {
    const removed = await OrganizationService.removeMember(orgId, membershipId);
    expect(removed).toBe(true);

    const detail = await OrganizationService.getOrganizationById(orgId);
    expect(detail?.members.length).toBe(0);
  });
});
