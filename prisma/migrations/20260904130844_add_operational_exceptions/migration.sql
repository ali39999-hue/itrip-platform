-- CreateTable
CREATE TABLE "OperationalException" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "ownerId" TEXT,
    "slaDueAt" TIMESTAMP(3),
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolution" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationalException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OperationalException_status_severity_idx" ON "OperationalException"("status", "severity");

-- CreateIndex
CREATE INDEX "OperationalException_entityType_entityId_idx" ON "OperationalException"("entityType", "entityId");
