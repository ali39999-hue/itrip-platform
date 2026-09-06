-- CreateTable
CREATE TABLE "AutoBuyRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "targetId" TEXT,
    "origin" TEXT,
    "destination" TEXT,
    "targetDate" TEXT NOT NULL,
    "maxPrice" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRR',
    "passengerCount" INTEGER NOT NULL DEFAULT 1,
    "passengerDetails" TEXT NOT NULL,
    "executionMode" TEXT NOT NULL DEFAULT 'ON_CONDITIONS_MET',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "scheduledAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "bookingId" TEXT,
    "failureReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoBuyRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutoBuyRule_userId_idx" ON "AutoBuyRule"("userId");

-- CreateIndex
CREATE INDEX "AutoBuyRule_status_idx" ON "AutoBuyRule"("status");

-- CreateIndex
CREATE INDEX "AutoBuyRule_serviceType_idx" ON "AutoBuyRule"("serviceType");

-- CreateIndex
CREATE INDEX "AutoBuyRule_targetDate_idx" ON "AutoBuyRule"("targetDate");

-- AddForeignKey
ALTER TABLE "AutoBuyRule" ADD CONSTRAINT "AutoBuyRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoBuyRule" ADD CONSTRAINT "AutoBuyRule_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
