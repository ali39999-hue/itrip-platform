-- CreateTable ReferralCode
CREATE TABLE "ReferralCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "customTierConfig" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable BookingReferral
CREATE TABLE "BookingReferral" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "referralCodeId" TEXT,
    "rawCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'VALID',
    "paxCount" INTEGER NOT NULL DEFAULT 1,
    "discountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "discountPercent" DECIMAL(65,30) NOT NULL DEFAULT 0.05,
    "applied" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'WEB',
    "registeredByUserId" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable LeaderSettlement
CREATE TABLE "LeaderSettlement" (
    "id" TEXT NOT NULL,
    "referralCodeId" TEXT NOT NULL,
    "qualifiedPax" INTEGER NOT NULL,
    "rewardPercent" DECIMAL(65,30) NOT NULL,
    "rewardAmount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "settledAt" TIMESTAMP(3),
    "settledBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaderSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");
CREATE INDEX "ReferralCode_code_idx" ON "ReferralCode"("code");
CREATE INDEX "ReferralCode_leaderId_idx" ON "ReferralCode"("leaderId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingReferral_bookingId_key" ON "BookingReferral"("bookingId");
CREATE INDEX "BookingReferral_referralCodeId_idx" ON "BookingReferral"("referralCodeId");
CREATE INDEX "BookingReferral_status_idx" ON "BookingReferral"("status");
CREATE INDEX "BookingReferral_rawCode_idx" ON "BookingReferral"("rawCode");

-- CreateIndex
CREATE INDEX "LeaderSettlement_referralCodeId_idx" ON "LeaderSettlement"("referralCodeId");
CREATE INDEX "LeaderSettlement_status_idx" ON "LeaderSettlement"("status");

-- AddForeignKey
ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReferral" ADD CONSTRAINT "BookingReferral_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReferral" ADD CONSTRAINT "BookingReferral_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "ReferralCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderSettlement" ADD CONSTRAINT "LeaderSettlement_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "ReferralCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable WorkerLease
CREATE TABLE IF NOT EXISTS "WorkerLease" (
    "resourceName" TEXT NOT NULL,
    "holderId" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "heartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "WorkerLease_pkey" PRIMARY KEY ("resourceName")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WorkerLease_expiresAt_idx" ON "WorkerLease"("expiresAt");
