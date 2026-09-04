-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "correlationId" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "requestId" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_correlationId_idx" ON "AuditLog"("correlationId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");
