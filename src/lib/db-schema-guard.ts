import { prisma } from '@/lib/prisma';

let isSchemaHealed = false;
let healingPromise: Promise<void> | null = null;

export function resetSchemaHealed(): void {
  isSchemaHealed = false;
  healingPromise = null;
}

/**
 * Idempotent runtime schema self-healer.
 *
 * Ensures newly-introduced columns and tables exist in production databases
 * (such as Neon serverless branches on Vercel) even if migration deploy was
 * skipped or delayed during the static build phase.
 *
 * Runs once per node/serverless worker process, cached in memory.
 */
export async function ensureDatabaseSchemaHealed(): Promise<void> {
  if (isSchemaHealed) return;

  if (healingPromise) {
    return healingPromise;
  }

  healingPromise = (async () => {
    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          -- 1. Ensure User.username exists and has a unique index
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User' OR table_name = 'user') THEN
            ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;
            CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
          END IF;

          -- 2. Ensure DeletedStaticRef exists
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

          -- 3. Ensure Tour columns exist
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Tour' OR table_name = 'tour') THEN
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

          -- 4. Ensure TourDepartureDate columns exist
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'TourDepartureDate' OR table_name = 'tourdeparturedate') THEN
            ALTER TABLE "TourDepartureDate" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'TOMAN';
            ALTER TABLE "TourDepartureDate" ADD COLUMN IF NOT EXISTS "childPrice" DECIMAL(18, 4);
            ALTER TABLE "TourDepartureDate" ADD COLUMN IF NOT EXISTS "availableSeats" INTEGER NOT NULL DEFAULT 10;
            ALTER TABLE "TourDepartureDate" ADD COLUMN IF NOT EXISTS "guaranteed" BOOLEAN NOT NULL DEFAULT true;
          END IF;

          -- 5. Ensure SystemErrorLog exists
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

          -- 6. Ensure BehaviorEvent exists
          CREATE TABLE IF NOT EXISTS "BehaviorEvent" (
            "id" TEXT NOT NULL,
            "userId" TEXT,
            "anonymousId" TEXT NOT NULL,
            "sessionId" TEXT NOT NULL,
            "type" TEXT NOT NULL,
            "route" TEXT NOT NULL,
            "locale" TEXT,
            "xPct" DOUBLE PRECISION,
            "yPct" DOUBLE PRECISION,
            "scrollPct" INTEGER,
            "selector" TEXT,
            "viewportW" INTEGER,
            "viewportH" INTEGER,
            "device" TEXT,
            "props" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "BehaviorEvent_pkey" PRIMARY KEY ("id")
          );
          CREATE INDEX IF NOT EXISTS "BehaviorEvent_userId_createdAt_idx" ON "BehaviorEvent"("userId", "createdAt");
          CREATE INDEX IF NOT EXISTS "BehaviorEvent_route_createdAt_idx" ON "BehaviorEvent"("route", "createdAt");

          -- 7. Ensure SupportTicket and TicketMessage exist
          CREATE TABLE IF NOT EXISTS "SupportTicket" (
            "id" TEXT NOT NULL,
            "ticketNumber" TEXT NOT NULL,
            "userId" TEXT,
            "name" TEXT NOT NULL,
            "email" TEXT,
            "phone" TEXT,
            "subject" TEXT NOT NULL,
            "category" TEXT NOT NULL,
            "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
            "status" TEXT NOT NULL DEFAULT 'OPEN',
            "bookingRef" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
          );
          CREATE UNIQUE INDEX IF NOT EXISTS "SupportTicket_ticketNumber_key" ON "SupportTicket"("ticketNumber");

          CREATE TABLE IF NOT EXISTS "TicketMessage" (
            "id" TEXT NOT NULL,
            "ticketId" TEXT NOT NULL,
            "authorId" TEXT,
            "authorName" TEXT NOT NULL,
            "senderType" TEXT NOT NULL,
            "message" TEXT NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
          );
          CREATE INDEX IF NOT EXISTS "TicketMessage_ticketId_createdAt_idx" ON "TicketMessage"("ticketId", "createdAt");

          -- 8. Firuzo Child (Business vertical) tables — mirrors migration
          -- 20260930132000_business_vertical_foundation so cold-start production
          -- databases never boot without the specialist domain schema.
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'BusinessRequest') THEN
            ALTER TABLE "BusinessRequest" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
            CREATE INDEX IF NOT EXISTS "BusinessRequest_createdById_idx" ON "BusinessRequest"("createdById");
          END IF;

          CREATE TABLE IF NOT EXISTS "BusinessCompany" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "nationalId" TEXT NOT NULL,
            "economicCode" TEXT,
            "field" TEXT NOT NULL,
            "repName" TEXT NOT NULL,
            "repPhone" TEXT NOT NULL,
            "organizationId" TEXT,
            "verifiedAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "BusinessCompany_pkey" PRIMARY KEY ("id")
          );

          CREATE TABLE IF NOT EXISTS "BusinessTourPackage" (
            "id" TEXT NOT NULL,
            "slug" TEXT NOT NULL,
            "title" TEXT NOT NULL,
            "titleEn" TEXT,
            "destination" TEXT NOT NULL,
            "destinationEn" TEXT,
            "durationDays" INTEGER NOT NULL DEFAULT 1,
            "basePrice" INTEGER NOT NULL,
            "includes" TEXT[] DEFAULT ARRAY[]::TEXT[],
            "requiredDocs" TEXT[] DEFAULT ARRAY[]::TEXT[],
            "status" TEXT NOT NULL DEFAULT 'DRAFT',
            "inventoryItemId" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "BusinessTourPackage_pkey" PRIMARY KEY ("id")
          );

          CREATE TABLE IF NOT EXISTS "BusinessDeparture" (
            "id" TEXT NOT NULL,
            "packageId" TEXT NOT NULL,
            "departDate" TIMESTAMP(3) NOT NULL,
            "returnDate" TIMESTAMP(3) NOT NULL,
            "capacity" INTEGER NOT NULL,
            "bookedCount" INTEGER NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "BusinessDeparture_pkey" PRIMARY KEY ("id")
          );

          CREATE TABLE IF NOT EXISTS "BusinessAddon" (
            "id" TEXT NOT NULL,
            "packageId" TEXT,
            "code" TEXT NOT NULL,
            "title" TEXT NOT NULL,
            "price" INTEGER NOT NULL,
            "unit" TEXT NOT NULL DEFAULT 'per_person',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "BusinessAddon_pkey" PRIMARY KEY ("id")
          );

          CREATE TABLE IF NOT EXISTS "BusinessRequest" (
            "id" TEXT NOT NULL,
            "code" TEXT NOT NULL,
            "companyId" TEXT NOT NULL,
            "departureId" TEXT NOT NULL,
            "paxCount" INTEGER NOT NULL,
            "status" TEXT NOT NULL DEFAULT 'draft',
            "totalAmount" INTEGER NOT NULL DEFAULT 0,
            "depositAmount" INTEGER NOT NULL DEFAULT 0,
            "grantAmount" INTEGER NOT NULL DEFAULT 0,
            "paidAmount" INTEGER NOT NULL DEFAULT 0,
            "currency" TEXT NOT NULL DEFAULT 'IRR',
            "expiresAt" TIMESTAMP(3),
            "assigneeId" TEXT,
            "note" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "BusinessRequest_pkey" PRIMARY KEY ("id")
          );

          CREATE TABLE IF NOT EXISTS "BusinessRequestAddon" (
            "requestId" TEXT NOT NULL,
            "addonId" TEXT NOT NULL,
            "quantity" INTEGER NOT NULL DEFAULT 1,
            "price" INTEGER NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "BusinessRequestAddon_pkey" PRIMARY KEY ("requestId", "addonId")
          );

          CREATE TABLE IF NOT EXISTS "BusinessTraveler" (
            "id" TEXT NOT NULL,
            "requestId" TEXT NOT NULL,
            "fullNameLatin" TEXT NOT NULL,
            "passportNo" TEXT NOT NULL,
            "passportExpiry" TIMESTAMP(3) NOT NULL,
            "birthDate" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "BusinessTraveler_pkey" PRIMARY KEY ("id")
          );

          CREATE TABLE IF NOT EXISTS "BusinessDocument" (
            "id" TEXT NOT NULL,
            "requestId" TEXT NOT NULL,
            "travelerId" TEXT,
            "type" TEXT NOT NULL,
            "fileUrl" TEXT NOT NULL,
            "originalName" TEXT,
            "mimeType" TEXT,
            "sizeBytes" INTEGER,
            "state" TEXT NOT NULL DEFAULT 'pending',
            "rejectReason" TEXT,
            "reviewedBy" TEXT,
            "reviewedAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "BusinessDocument_pkey" PRIMARY KEY ("id")
          );

          CREATE TABLE IF NOT EXISTS "BusinessPayment" (
            "id" TEXT NOT NULL,
            "requestId" TEXT NOT NULL,
            "kind" TEXT NOT NULL,
            "method" TEXT NOT NULL,
            "amount" INTEGER NOT NULL,
            "status" TEXT NOT NULL DEFAULT 'pending',
            "currency" TEXT NOT NULL DEFAULT 'IRR',
            "idempotencyKey" TEXT,
            "gatewayRef" TEXT,
            "receiptUrl" TEXT,
            "paidAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "BusinessPayment_pkey" PRIMARY KEY ("id")
          );

          CREATE TABLE IF NOT EXISTS "BusinessInvoice" (
            "id" TEXT NOT NULL,
            "requestId" TEXT NOT NULL,
            "type" TEXT NOT NULL,
            "lines" JSONB NOT NULL,
            "total" INTEGER NOT NULL,
            "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "pdfUrl" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "BusinessInvoice_pkey" PRIMARY KEY ("id")
          );

          CREATE TABLE IF NOT EXISTS "BusinessVoucher" (
            "id" TEXT NOT NULL,
            "requestId" TEXT NOT NULL,
            "travelerId" TEXT,
            "code" TEXT NOT NULL,
            "qrPayload" TEXT NOT NULL,
            "pdfUrl" TEXT,
            "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "revokedAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "BusinessVoucher_pkey" PRIMARY KEY ("id")
          );

          CREATE TABLE IF NOT EXISTS "BusinessContentPage" (
            "id" TEXT NOT NULL,
            "slug" TEXT NOT NULL,
            "locale" TEXT NOT NULL DEFAULT 'fa',
            "vertical" TEXT NOT NULL DEFAULT 'technology',
            "title" TEXT NOT NULL,
            "status" TEXT NOT NULL DEFAULT 'draft',
            "sections" JSONB NOT NULL,
            "seo" JSONB,
            "scheduledAt" TIMESTAMP(3),
            "publishedAt" TIMESTAMP(3),
            "createdById" TEXT,
            "updatedById" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "BusinessContentPage_pkey" PRIMARY KEY ("id")
          );

          CREATE TABLE IF NOT EXISTS "BusinessContentRevision" (
            "id" TEXT NOT NULL,
            "pageId" TEXT NOT NULL,
            "snapshot" JSONB NOT NULL,
            "authorId" TEXT,
            "note" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "BusinessContentRevision_pkey" PRIMARY KEY ("id")
          );

          CREATE UNIQUE INDEX IF NOT EXISTS "BusinessContentPage_slug_locale_key" ON "BusinessContentPage"("slug", "locale");
          CREATE INDEX IF NOT EXISTS "BusinessContentPage_status_vertical_idx" ON "BusinessContentPage"("status", "vertical");
          CREATE INDEX IF NOT EXISTS "BusinessContentPage_scheduledAt_idx" ON "BusinessContentPage"("scheduledAt");
          CREATE INDEX IF NOT EXISTS "BusinessContentRevision_pageId_createdAt_idx" ON "BusinessContentRevision"("pageId", "createdAt");
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessContentRevision_pageId_fkey') THEN
            ALTER TABLE "BusinessContentRevision" ADD CONSTRAINT "BusinessContentRevision_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "BusinessContentPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;

          CREATE TABLE IF NOT EXISTS "BusinessStatusEvent" (
            "id" TEXT NOT NULL,
            "requestId" TEXT NOT NULL,
            "fromStatus" TEXT,
            "toStatus" TEXT NOT NULL,
            "actorId" TEXT,
            "note" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "BusinessStatusEvent_pkey" PRIMARY KEY ("id")
          );

          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'BusinessTourPackage') THEN
            ALTER TABLE "BusinessTourPackage" ADD COLUMN IF NOT EXISTS "vertical" TEXT NOT NULL DEFAULT 'technology';
            CREATE INDEX IF NOT EXISTS "BusinessTourPackage_vertical_idx" ON "BusinessTourPackage"("vertical");
          END IF;

          CREATE UNIQUE INDEX IF NOT EXISTS "BusinessCompany_nationalId_key" ON "BusinessCompany"("nationalId");
          CREATE INDEX IF NOT EXISTS "BusinessCompany_organizationId_idx" ON "BusinessCompany"("organizationId");
          CREATE INDEX IF NOT EXISTS "BusinessCompany_verifiedAt_idx" ON "BusinessCompany"("verifiedAt");
          CREATE UNIQUE INDEX IF NOT EXISTS "BusinessTourPackage_slug_key" ON "BusinessTourPackage"("slug");
          CREATE INDEX IF NOT EXISTS "BusinessTourPackage_status_idx" ON "BusinessTourPackage"("status");
          CREATE INDEX IF NOT EXISTS "BusinessTourPackage_destination_idx" ON "BusinessTourPackage"("destination");
          CREATE INDEX IF NOT EXISTS "BusinessDeparture_packageId_departDate_idx" ON "BusinessDeparture"("packageId", "departDate");
          CREATE UNIQUE INDEX IF NOT EXISTS "BusinessAddon_code_key" ON "BusinessAddon"("code");
          CREATE INDEX IF NOT EXISTS "BusinessAddon_packageId_idx" ON "BusinessAddon"("packageId");
          CREATE UNIQUE INDEX IF NOT EXISTS "BusinessRequest_code_key" ON "BusinessRequest"("code");
          CREATE INDEX IF NOT EXISTS "BusinessRequest_status_idx" ON "BusinessRequest"("status");
          CREATE INDEX IF NOT EXISTS "BusinessRequest_companyId_idx" ON "BusinessRequest"("companyId");
          CREATE INDEX IF NOT EXISTS "BusinessRequest_expiresAt_idx" ON "BusinessRequest"("expiresAt");
          CREATE INDEX IF NOT EXISTS "BusinessRequestAddon_addonId_idx" ON "BusinessRequestAddon"("addonId");
          CREATE INDEX IF NOT EXISTS "BusinessTraveler_requestId_idx" ON "BusinessTraveler"("requestId");
          CREATE INDEX IF NOT EXISTS "BusinessDocument_requestId_state_idx" ON "BusinessDocument"("requestId", "state");
          CREATE INDEX IF NOT EXISTS "BusinessDocument_travelerId_idx" ON "BusinessDocument"("travelerId");
          CREATE UNIQUE INDEX IF NOT EXISTS "BusinessPayment_idempotencyKey_key" ON "BusinessPayment"("idempotencyKey");
          CREATE INDEX IF NOT EXISTS "BusinessPayment_requestId_kind_idx" ON "BusinessPayment"("requestId", "kind");
          CREATE INDEX IF NOT EXISTS "BusinessPayment_status_idx" ON "BusinessPayment"("status");
          CREATE INDEX IF NOT EXISTS "BusinessInvoice_requestId_type_idx" ON "BusinessInvoice"("requestId", "type");
          CREATE UNIQUE INDEX IF NOT EXISTS "BusinessVoucher_code_key" ON "BusinessVoucher"("code");
          CREATE INDEX IF NOT EXISTS "BusinessVoucher_requestId_idx" ON "BusinessVoucher"("requestId");
          CREATE INDEX IF NOT EXISTS "BusinessVoucher_travelerId_idx" ON "BusinessVoucher"("travelerId");
          CREATE INDEX IF NOT EXISTS "BusinessStatusEvent_requestId_createdAt_idx" ON "BusinessStatusEvent"("requestId", "createdAt");

          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessDeparture_packageId_fkey') THEN
            ALTER TABLE "BusinessDeparture" ADD CONSTRAINT "BusinessDeparture_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "BusinessTourPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessAddon_packageId_fkey') THEN
            ALTER TABLE "BusinessAddon" ADD CONSTRAINT "BusinessAddon_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "BusinessTourPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessRequest_companyId_fkey') THEN
            ALTER TABLE "BusinessRequest" ADD CONSTRAINT "BusinessRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "BusinessCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessRequest_departureId_fkey') THEN
            ALTER TABLE "BusinessRequest" ADD CONSTRAINT "BusinessRequest_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "BusinessDeparture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessRequestAddon_requestId_fkey') THEN
            ALTER TABLE "BusinessRequestAddon" ADD CONSTRAINT "BusinessRequestAddon_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BusinessRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessRequestAddon_addonId_fkey') THEN
            ALTER TABLE "BusinessRequestAddon" ADD CONSTRAINT "BusinessRequestAddon_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "BusinessAddon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessTraveler_requestId_fkey') THEN
            ALTER TABLE "BusinessTraveler" ADD CONSTRAINT "BusinessTraveler_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BusinessRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessDocument_requestId_fkey') THEN
            ALTER TABLE "BusinessDocument" ADD CONSTRAINT "BusinessDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BusinessRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessDocument_travelerId_fkey') THEN
            ALTER TABLE "BusinessDocument" ADD CONSTRAINT "BusinessDocument_travelerId_fkey" FOREIGN KEY ("travelerId") REFERENCES "BusinessTraveler"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessPayment_requestId_fkey') THEN
            ALTER TABLE "BusinessPayment" ADD CONSTRAINT "BusinessPayment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BusinessRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessInvoice_requestId_fkey') THEN
            ALTER TABLE "BusinessInvoice" ADD CONSTRAINT "BusinessInvoice_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BusinessRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessVoucher_requestId_fkey') THEN
            ALTER TABLE "BusinessVoucher" ADD CONSTRAINT "BusinessVoucher_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BusinessRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessVoucher_travelerId_fkey') THEN
            ALTER TABLE "BusinessVoucher" ADD CONSTRAINT "BusinessVoucher_travelerId_fkey" FOREIGN KEY ("travelerId") REFERENCES "BusinessTraveler"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessStatusEvent_requestId_fkey') THEN
            ALTER TABLE "BusinessStatusEvent" ADD CONSTRAINT "BusinessStatusEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BusinessRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;
      `);
      isSchemaHealed = true;
    } catch {
      // Fallback direct execution for environments where anonymous DO blocks have strict constraints
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE IF EXISTS "User" ADD COLUMN IF NOT EXISTS "username" TEXT;`);
        await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");`);
        await prisma.$executeRawUnsafe(`ALTER TABLE IF EXISTS "Tour" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'TOMAN';`);
        await prisma.$executeRawUnsafe(`ALTER TABLE IF EXISTS "TourDepartureDate" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'TOMAN';`);
        isSchemaHealed = true;
      } catch (fallbackErr) {
        console.warn('[db-schema-guard] Schema self-healing notice:', fallbackErr);
      }
    } finally {
      healingPromise = null;
    }
  })();

  return healingPromise;
}
