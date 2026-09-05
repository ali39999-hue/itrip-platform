import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ROLE_DEFAULT_PERMISSIONS } from '../src/domains/identity/permissions';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const userPassword = process.env.USER_PASSWORD;

  if (!adminPassword || !userPassword) {
    throw new Error('ADMIN_PASSWORD and USER_PASSWORD environment variables are strictly required for database seeding.');
  }

  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  const userPasswordHash = await bcrypt.hash(userPassword, 10);

  // 1. Seed Core Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@firuzo.com' },
    update: {
      passwordHash: adminPasswordHash,
      phone: '09120000000',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    create: {
      id: 'clr_admin_123',
      email: 'admin@firuzo.com',
      phone: '09120000000',
      name: 'Firuzo Admin',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { phone: '09123456789' },
    update: {
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    create: {
      id: 'clr_admin_test_123',
      phone: '09123456789',
      name: 'Firuzo Test Admin',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@firuzo.com' },
    update: {
      passwordHash: userPasswordHash,
      role: 'CUSTOMER',
      isActive: true,
    },
    create: {
      id: 'clr_mock_user_123',
      email: 'user@firuzo.com',
      name: 'Firuzo User',
      passwordHash: userPasswordHash,
      role: 'CUSTOMER',
      isActive: true,
    },
  });

  // 2. Seed Relational Permissions and Roles (IAM-001)
  const allPermissions = new Set<string>();
  Object.values(ROLE_DEFAULT_PERMISSIONS).forEach((perms) => {
    perms.forEach((p) => allPermissions.add(p));
  });

  for (const permCode of Array.from(allPermissions)) {
    const parts = permCode.split(':');
    const moduleName = (parts[0] || 'GENERAL').toUpperCase();
    await prisma.permission.upsert({
      where: { code: permCode },
      update: {},
      create: {
        code: permCode,
        name: permCode.replace(/:/g, ' ').toUpperCase(),
        module: moduleName,
      },
    });
  }

  for (const [roleName, perms] of Object.entries(ROLE_DEFAULT_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
        permissions: JSON.stringify(perms),
        description: `${roleName} Role`,
      },
    });

    for (const permCode of perms) {
      const p = await prisma.permission.findUnique({ where: { code: permCode } });
      if (p) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
          update: {},
          create: { roleId: role.id, permissionId: p.id },
        });
      }
    }
  }

  // Link admin to SUPER_ADMIN role
  const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: superAdminRole.id } },
      update: {},
      create: { userId: admin.id, roleId: superAdminRole.id },
    });
  }

  // 3. Seed Canonical Chart of Accounts (FIN-001)
  const chartAccounts = [
    { code: '1010', name: 'Operating Cash & Bank', category: 'ASSET' },
    { code: '1020', name: 'Customer Wallet Liability', category: 'LIABILITY' },
    { code: '2010', name: 'Platform Customer Escrow', category: 'LIABILITY' },
    { code: '2020', name: 'Supplier Accounts Payable', category: 'LIABILITY' },
    { code: '2030', name: 'Tax & VAT Payable', category: 'LIABILITY' },
    { code: '4010', name: 'Platform Service Revenue', category: 'REVENUE' },
    { code: '5010', name: 'Supplier Travel Expense', category: 'EXPENSE' },
  ];

  for (const acc of chartAccounts) {
    await prisma.chartOfAccounts.upsert({
      where: { code: acc.code },
      update: {},
      create: {
        code: acc.code,
        name: acc.name,
        category: acc.category,
        currency: 'IRR',
        isActive: true,
      },
    });
  }

  // 4. Seed Versioned Tax Jurisdictions & Rules (MONEY-003)
  const irJurisdiction = await prisma.taxJurisdiction.upsert({
    where: { code: 'IR' },
    update: {},
    create: { code: 'IR', name: 'Iran National Tax Authority', countryCode: 'IR' },
  });

  await prisma.taxJurisdiction.upsert({
    where: { code: 'CN' },
    update: {},
    create: { code: 'CN', name: 'China State Taxation Administration', countryCode: 'CN' },
  });

  await prisma.taxJurisdiction.upsert({
    where: { code: 'AE' },
    update: {},
    create: { code: 'AE', name: 'UAE Federal Tax Authority', countryCode: 'AE' },
  });

  const irTaxRules = [
    { category: 'GENERAL', ratePercentage: new Prisma.Decimal('0.09') },
    { category: 'FLIGHT', ratePercentage: new Prisma.Decimal('0.09') },
    { category: 'HOTEL', ratePercentage: new Prisma.Decimal('0.09') },
    { category: 'TOUR', ratePercentage: new Prisma.Decimal('0.09') },
    { category: 'TRANSFER', ratePercentage: new Prisma.Decimal('0.09') },
    { category: 'VISA', ratePercentage: new Prisma.Decimal('0.00') },
    { category: 'ESIM', ratePercentage: new Prisma.Decimal('0.00') },
    { category: 'INSURANCE', ratePercentage: new Prisma.Decimal('0.00') },
  ];

  for (const rule of irTaxRules) {
    const existingRule = await prisma.taxRule.findFirst({
      where: { jurisdictionId: irJurisdiction.id, category: rule.category },
    });
    if (!existingRule) {
      await prisma.taxRule.create({
        data: {
          jurisdictionId: irJurisdiction.id,
          category: rule.category,
          ratePercentage: rule.ratePercentage,
          effectiveFrom: new Date('2020-01-01'),
          isActive: true,
        },
      });
    }
  }

  console.log('Seed completed successfully:', {
    admin: admin.email,
    user: user.email,
    chartAccountsCount: chartAccounts.length,
    taxRulesCount: irTaxRules.length,
    permissionsCount: allPermissions.size,
  });
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
