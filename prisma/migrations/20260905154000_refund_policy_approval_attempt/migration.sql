-- Refund domain completion (REF-004, REF-005, REF-006):
-- immutable policy snapshot, approval trail, and execution attempts.

CREATE TABLE "RefundPolicySnapshot" (
    "id" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "bookingStatusAtRequest" TEXT NOT NULL,
    "penaltyPercentage" DECIMAL(65,30) NOT NULL,
    "policyVersion" TEXT NOT NULL DEFAULT 'v1',
    "rulesJson" TEXT NOT NULL DEFAULT '{}',
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefundPolicySnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RefundApproval" (
    "id" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "note" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefundApproval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RefundAttempt" (
    "id" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "channel" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "gatewayRef" TEXT,
    "errorMessage" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefundAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RefundPolicySnapshot_refundId_key" ON "RefundPolicySnapshot"("refundId");
CREATE INDEX "RefundPolicySnapshot_bookingId_idx" ON "RefundPolicySnapshot"("bookingId");
CREATE INDEX "RefundApproval_refundId_idx" ON "RefundApproval"("refundId");
CREATE UNIQUE INDEX "RefundAttempt_refundId_attemptNumber_key" ON "RefundAttempt"("refundId", "attemptNumber");
CREATE INDEX "RefundAttempt_refundId_idx" ON "RefundAttempt"("refundId");

ALTER TABLE "RefundPolicySnapshot" ADD CONSTRAINT "RefundPolicySnapshot_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefundApproval" ADD CONSTRAINT "RefundApproval_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefundAttempt" ADD CONSTRAINT "RefundAttempt_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE CASCADE ON UPDATE CASCADE;
