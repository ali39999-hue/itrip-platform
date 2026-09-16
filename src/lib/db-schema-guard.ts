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
