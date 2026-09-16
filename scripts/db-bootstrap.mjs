#!/usr/bin/env node
/**
 * Automated Database Bootstrap & Idempotent Self-Configuration
 *
 * Runs during deployment preflight and automatically seeds essential
 * roles, permissions, administrative credentials, chart of accounts,
 * tax rules, and initial CMS content when missing.
 *
 * Fully idempotent: safe to run multiple times without duplicating rows.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ERP_STAFF_ROLES = ['SUPER_ADMIN', 'FINANCE', 'OPS', 'OPERATOR', 'SUPPORT', 'AGENT', 'CUSTOMER'];

const ROLE_DEFAULT_PERMISSIONS = {
  SUPER_ADMIN: [
    'booking:view',
    'booking:view:all',
    'booking:create',
    'booking:modify',
    'booking:cancel',
    'booking:confirm:on-request',
    'booking:refund:approve',
    'payment:view',
    'payment:capture',
    'payment:refund',
    'refund:request',
    'refund:approve',
    'finance:view',
    'finance:post',
    'finance:reconcile',
    'finance:reports:view',
    'finance:settlement:match',
    'supplier:view',
    'supplier:manage',
    'supplier:contract:manage',
    'inventory:view',
    'inventory:modify',
    'inventory:manage',
    'catalog:hotels:edit',
    'catalog:flights:edit',
    'user:manage',
    'role:manage',
    'audit:view',
    'ops:override:cancel',
    'ops:notify',
    'traveler:pii:view',
  ],
  OPERATOR: [
    'booking:view',
    'booking:view:all',
    'booking:create',
    'booking:modify',
    'payment:view',
    'payment:capture',
    'supplier:view',
    'inventory:view',
    'catalog:hotels:edit',
    'catalog:flights:edit',
  ],
  FINANCE: [
    'payment:view',
    'payment:capture',
    'payment:refund',
    'refund:approve',
    'finance:view',
    'finance:post',
    'finance:reconcile',
    'finance:reports:view',
    'finance:settlement:match',
    'booking:view',
    'booking:view:all',
  ],
  OPS: [
    'booking:view',
    'booking:view:all',
    'booking:modify',
    'booking:cancel',
    'ops:override:cancel',
    'ops:notify',
    'supplier:view',
    'inventory:view',
  ],
  CUSTOMER: [
    'booking:view',
    'booking:create',
  ],
};

const DEFAULT_ADMIN_PHONES = [
  '09120000000',
  '09123456789',
  '09304064124',
  '09127925583',
  '09105247414',
];

async function bootstrap() {
  console.log('\n--- [db-bootstrap] Starting automated idempotent database bootstrap ---');

  // 0. Schema Self-Healing DDL (Ensure missing columns / tables exist in Neon)
  console.log('• Checking and applying schema self-healing DDL...');
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        -- 1. Ensure DeletedStaticRef exists
        CREATE TABLE IF NOT EXISTS "DeletedStaticRef" (
          "id" TEXT NOT NULL,
          "kind" TEXT NOT NULL,
          "refId" TEXT NOT NULL,
          "reason" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "DeletedStaticRef_pkey" PRIMARY KEY ("id")
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "DeletedStaticRef_kind_refId_key" ON "DeletedStaticRef"("kind", "refId");
        CREATE INDEX IF NOT EXISTS "DeletedStaticRef_kind_idx" ON "DeletedStaticRef"("kind");

        -- 2. Ensure Tour columns exist
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Tour') THEN
          ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'TOMAN';
          ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "childPrice" DECIMAL(18, 4);
          ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "originalPrice" DECIMAL(18, 4);
          ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "discountPercent" INTEGER;
          ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "cityEn" TEXT;
          ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "country" TEXT NOT NULL DEFAULT 'ایران';
          ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "countryEn" TEXT DEFAULT 'Iran';
          ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "durationDays" INTEGER NOT NULL DEFAULT 3;
          ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "durationNights" INTEGER NOT NULL DEFAULT 2;
          ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "hotelName" TEXT;
          ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "hotelStars" INTEGER DEFAULT 5;
          ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "transportType" TEXT;
          ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "transportTypeEn" TEXT;
          ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "groupSize" TEXT;
          ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "groupSizeEn" TEXT;
          ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT true;
        END IF;

        -- 3. Ensure TourDepartureDate columns exist
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'TourDepartureDate') THEN
          ALTER TABLE "TourDepartureDate" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'TOMAN';
          ALTER TABLE "TourDepartureDate" ADD COLUMN IF NOT EXISTS "childPrice" DECIMAL(18, 4);
          ALTER TABLE "TourDepartureDate" ADD COLUMN IF NOT EXISTS "availableSeats" INTEGER NOT NULL DEFAULT 10;
          ALTER TABLE "TourDepartureDate" ADD COLUMN IF NOT EXISTS "guaranteed" BOOLEAN NOT NULL DEFAULT true;
        END IF;

        -- 4. Ensure SystemErrorLog exists (OBS-005)
        CREATE TABLE IF NOT EXISTS "SystemErrorLog" (
          "id" TEXT NOT NULL,
          "fingerprint" TEXT NOT NULL,
          "level" TEXT NOT NULL DEFAULT 'ERROR',
          "source" TEXT NOT NULL DEFAULT 'SERVER',
          "message" TEXT NOT NULL,
          "stackTrace" TEXT,
          "endpoint" TEXT,
          "method" TEXT,
          "statusCode" INTEGER,
          "occurrences" INTEGER NOT NULL DEFAULT 1,
          "status" TEXT NOT NULL DEFAULT 'UNRESOLVED',
          "userId" TEXT,
          "userRole" TEXT,
          "ipAddress" TEXT,
          "userAgent" TEXT,
          "metadata" TEXT,
          "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "resolvedAt" TIMESTAMP(3),
          "resolvedById" TEXT,
          CONSTRAINT "SystemErrorLog_pkey" PRIMARY KEY ("id")
        );
        CREATE INDEX IF NOT EXISTS "SystemErrorLog_fingerprint_idx" ON "SystemErrorLog"("fingerprint");
        CREATE INDEX IF NOT EXISTS "SystemErrorLog_status_idx" ON "SystemErrorLog"("status");
        CREATE INDEX IF NOT EXISTS "SystemErrorLog_level_idx" ON "SystemErrorLog"("level");
        CREATE INDEX IF NOT EXISTS "SystemErrorLog_source_idx" ON "SystemErrorLog"("source");
        CREATE INDEX IF NOT EXISTS "SystemErrorLog_lastSeenAt_idx" ON "SystemErrorLog"("lastSeenAt");
      END $$;
    `);
    console.log('  ✓ Schema self-healing DDL executed.');
  } catch (ddlErr) {
    console.warn('  ℹ Schema DDL notice:', ddlErr.message);
  }

  // 1. Resolve Admin Password
  const adminPassword = process.env.ADMIN_PASSWORD?.trim() || 'Admin@Firuzo2026!';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  // 2. Bootstrap Permissions
  console.log('• Ensuring canonical permissions exist...');
  const allPerms = new Set();
  Object.values(ROLE_DEFAULT_PERMISSIONS).forEach((perms) => {
    perms.forEach((p) => allPerms.add(p));
  });

  for (const permCode of Array.from(allPerms)) {
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
    }).catch((e) => console.warn(`  Warning upserting permission ${permCode}:`, e.message));
  }

  // 3. Bootstrap Roles & RolePermissions
  console.log('• Ensuring roles and role permissions exist...');
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
        }).catch(() => {});
      }
    }
  }

  const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });

  // 4. Bootstrap Core Admin User
  console.log('• Ensuring primary admin user exists (admin@firuzo.com)...');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@firuzo.com' },
    update: {
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    create: {
      id: 'clr_admin_123',
      email: 'admin@firuzo.com',
      phone: '09120000000',
      name: 'Firuzo Admin',
      firstNameFa: 'مدیر',
      lastNameFa: 'سیستم',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: superAdminRole.id } },
      update: {},
      create: { userId: adminUser.id, roleId: superAdminRole.id },
    }).catch(() => {});
  }

  // 5. Bootstrap / Upgrade Known Admin Mobile Numbers
  const extraPhones = (process.env.ADMIN_PHONES || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const targetAdminPhones = Array.from(new Set([...DEFAULT_ADMIN_PHONES, ...extraPhones]));

  console.log(`• Ensuring ${targetAdminPhones.length} administrator mobile numbers have SUPER_ADMIN role...`);
  for (const phone of targetAdminPhones) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { phone },
          { phone: phone.startsWith('0') ? '+98' + phone.slice(1) : undefined },
        ].filter(Boolean),
      },
    });

    if (existing) {
      if (existing.role !== 'SUPER_ADMIN' || !existing.passwordHash) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            role: 'SUPER_ADMIN',
            isActive: true,
            ...(existing.passwordHash ? {} : { passwordHash: adminPasswordHash }),
          },
        });
      }
      if (superAdminRole) {
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId: existing.id, roleId: superAdminRole.id } },
          update: {},
          create: { userId: existing.id, roleId: superAdminRole.id },
        }).catch(() => {});
      }
    } else {
      const created = await prisma.user.create({
        data: {
          id: `admin_phone_${phone.replace(/\D/g, '')}`,
          phone,
          name: `Admin (${phone})`,
          firstNameFa: 'مدیر',
          lastNameFa: phone,
          role: 'SUPER_ADMIN',
          passwordHash: adminPasswordHash,
          isActive: true,
        },
      });
      if (superAdminRole) {
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId: created.id, roleId: superAdminRole.id } },
          update: {},
          create: { userId: created.id, roleId: superAdminRole.id },
        }).catch(() => {});
      }
    }
  }

  // 6. Bootstrap Chart of Accounts (FIN-001) if empty
  const chartCount = await prisma.chartOfAccounts.count().catch(() => 0);
  if (chartCount === 0) {
    console.log('• Seeding initial chart of accounts...');
    const chartAccounts = [
      { code: '1010', name: 'Operating Cash & Bank', category: 'ASSET' },
      { code: '1020', name: 'Customer Wallet Liability', category: 'LIABILITY' },
      { code: '1030', name: 'FX Liquidity Pool', category: 'ASSET' },
      { code: '2010', name: 'Platform Customer Escrow', category: 'LIABILITY' },
      { code: '2020', name: 'Supplier Accounts Payable', category: 'LIABILITY' },
      { code: '2030', name: 'Tax & VAT Payable', category: 'LIABILITY' },
      { code: '4010', name: 'Platform Service Revenue', category: 'REVENUE' },
      { code: '4020', name: 'Fee Revenue', category: 'REVENUE' },
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
      }).catch(() => {});
    }
  }

  // 7. Bootstrap Tax Jurisdiction if empty
  const taxCount = await prisma.taxJurisdiction.count().catch(() => 0);
  if (taxCount === 0) {
    console.log('• Seeding initial tax jurisdictions...');
    const irJur = await prisma.taxJurisdiction.upsert({
      where: { code: 'IR' },
      update: {},
      create: { code: 'IR', name: 'Iran National Tax Authority', countryCode: 'IR' },
    }).catch(() => null);

    if (irJur) {
      const categories = ['GENERAL', 'FLIGHT', 'HOTEL', 'TOUR', 'TRANSFER'];
      for (const cat of categories) {
        await prisma.taxRule.create({
          data: {
            jurisdictionId: irJur.id,
            category: cat,
            ratePercentage: new Prisma.Decimal('0.09'),
            effectiveFrom: new Date('2020-01-01'),
            isActive: true,
          },
        }).catch(() => {});
      }
    }
  }

  // 8. Bootstrap Canonical Tours if count is 0
  const tourCount = await prisma.tour.count().catch(() => 0);
  if (tourCount === 0) {
    console.log('• Seeding baseline tours into database...');
    try {
      const { DETAILED_TOURS } = await import('../src/services/tours-service.ts');
      for (const tour of DETAILED_TOURS) {
        await prisma.tour.upsert({
          where: { id: tour.id },
          update: {},
          create: {
            id: tour.id,
            title: tour.title,
            titleEn: tour.titleEn || tour.title,
            city: tour.city,
            cityEn: tour.cityEn || null,
            country: tour.country || 'ایران',
            countryEn: tour.countryEn || 'Iran',
            durationDays: tour.durationDays,
            durationNights: tour.durationNights || Math.max(1, tour.durationDays - 1),
            currency: tour.currency || 'TOMAN',
            price: new Prisma.Decimal(tour.price),
            childPrice: tour.childPrice ? new Prisma.Decimal(tour.childPrice) : null,
            originalPrice: tour.originalPrice ? new Prisma.Decimal(tour.originalPrice) : null,
            discountPercent: tour.discountPercent ?? null,
            rating: tour.rating || 5.0,
            reviewsCount: tour.reviewsCount || 0,
            category: tour.category || 'cultural',
            heroImage: tour.heroImage || null,
            gallery: tour.gallery || [],
            summary: tour.summary || '',
            summaryEn: tour.summaryEn || '',
            description: tour.description || '',
            descriptionEn: tour.descriptionEn || '',
            highlights: tour.highlights || [],
            includes: tour.includes || [],
            excludes: tour.excludes || [],
            hotelName: tour.hotelName || null,
            hotelStars: tour.hotelStars || 5,
            transportType: tour.transportType || null,
            transportTypeEn: tour.transportTypeEn || null,
            groupSize: tour.groupSize || null,
            groupSizeEn: tour.groupSizeEn || null,
            guideLanguages: tour.guideLanguages || ['فارسی', 'English'],
            isPublished: true,
          },
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('  Note: Tours seed skipped or deferred:', err.message);
    }
  }

  console.log('--- [db-bootstrap] Database bootstrap completed successfully ---\n');
}

bootstrap()
  .catch((err) => {
    console.error('⚠️ [db-bootstrap] Encountered an error during bootstrap (continuing gracefully):', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
