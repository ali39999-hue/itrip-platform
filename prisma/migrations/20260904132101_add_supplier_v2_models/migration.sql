-- CreateTable
CREATE TABLE "SupplierConnection" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'PRODUCTION',
    "timeoutMs" INTEGER NOT NULL DEFAULT 5000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierCredential" (
    "id" TEXT NOT NULL,
    "supplierConnectionId" TEXT NOT NULL,
    "credentialRef" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "rotationState" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierHealth" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "timeoutRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "latencyP50" INTEGER NOT NULL DEFAULT 350,
    "latencyP95" INTEGER NOT NULL DEFAULT 900,
    "errorRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "windowEnd" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierStatement" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "statementNumber" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rawJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierStatement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierConnection_supplierId_idx" ON "SupplierConnection"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierCredential_supplierConnectionId_idx" ON "SupplierCredential"("supplierConnectionId");

-- CreateIndex
CREATE INDEX "SupplierHealth_supplierId_idx" ON "SupplierHealth"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierStatement_statementNumber_key" ON "SupplierStatement"("statementNumber");

-- CreateIndex
CREATE INDEX "SupplierStatement_supplierId_idx" ON "SupplierStatement"("supplierId");

-- CreateIndex
CREATE INDEX "Supplier_type_idx" ON "Supplier"("type");

-- AddForeignKey
ALTER TABLE "SupplierConnection" ADD CONSTRAINT "SupplierConnection_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCredential" ADD CONSTRAINT "SupplierCredential_supplierConnectionId_fkey" FOREIGN KEY ("supplierConnectionId") REFERENCES "SupplierConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierHealth" ADD CONSTRAINT "SupplierHealth_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierStatement" ADD CONSTRAINT "SupplierStatement_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
