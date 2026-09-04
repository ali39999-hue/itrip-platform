-- DropIndex
DROP INDEX "OutboxEvent_status_idx";

-- DropIndex
DROP INDEX "OutboxEvent_status_updatedAt_idx";

-- AlterTable
ALTER TABLE "OutboxEvent" ADD COLUMN     "aggregateId" TEXT,
ADD COLUMN     "aggregateType" TEXT,
ADD COLUMN     "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "causationId" TEXT,
ADD COLUMN     "correlationId" TEXT,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "workerId" TEXT;

-- CreateTable
CREATE TABLE "PaymentIntent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRR',
    "status" TEXT NOT NULL DEFAULT 'INITIATED',
    "idempotencyKey" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "paymentIntentId" TEXT NOT NULL,
    "gatewayName" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRR',
    "status" TEXT NOT NULL DEFAULT 'INITIATED',
    "gatewayRef" TEXT,
    "rawPayload" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SagaExecution" (
    "id" TEXT NOT NULL,
    "sagaType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "correlationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "currentStep" TEXT,
    "contextJson" TEXT NOT NULL DEFAULT '{}',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SagaExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SagaStep" (
    "id" TEXT NOT NULL,
    "sagaId" TEXT NOT NULL,
    "stepType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "inputSnapshot" TEXT,
    "resultSnapshot" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "SagaStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_idempotencyKey_key" ON "PaymentIntent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentIntent_bookingId_idx" ON "PaymentIntent"("bookingId");

-- CreateIndex
CREATE INDEX "PaymentIntent_status_idx" ON "PaymentIntent"("status");

-- CreateIndex
CREATE INDEX "PaymentAttempt_paymentIntentId_idx" ON "PaymentAttempt"("paymentIntentId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_gatewayRef_idx" ON "PaymentAttempt"("gatewayRef");

-- CreateIndex
CREATE INDEX "SagaExecution_aggregateId_idx" ON "SagaExecution"("aggregateId");

-- CreateIndex
CREATE INDEX "SagaExecution_status_idx" ON "SagaExecution"("status");

-- CreateIndex
CREATE INDEX "SagaStep_sagaId_idx" ON "SagaStep"("sagaId");

-- CreateIndex
CREATE INDEX "SagaStep_status_idx" ON "SagaStep"("status");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_availableAt_idx" ON "OutboxEvent"("status", "availableAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_aggregateType_aggregateId_idx" ON "OutboxEvent"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "OutboxEvent_correlationId_idx" ON "OutboxEvent"("correlationId");

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SagaStep" ADD CONSTRAINT "SagaStep_sagaId_fkey" FOREIGN KEY ("sagaId") REFERENCES "SagaExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
