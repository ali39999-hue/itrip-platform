-- CreateTable
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

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SystemErrorLog_fingerprint_idx" ON "SystemErrorLog"("fingerprint");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SystemErrorLog_status_idx" ON "SystemErrorLog"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SystemErrorLog_level_idx" ON "SystemErrorLog"("level");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SystemErrorLog_source_idx" ON "SystemErrorLog"("source");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SystemErrorLog_lastSeenAt_idx" ON "SystemErrorLog"("lastSeenAt");
