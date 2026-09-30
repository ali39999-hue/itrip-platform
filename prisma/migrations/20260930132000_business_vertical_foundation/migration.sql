-- CreateTable
CREATE TABLE "BusinessCompany" (
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

-- CreateTable
CREATE TABLE "BusinessTourPackage" (
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

-- CreateTable
CREATE TABLE "BusinessDeparture" (
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

-- CreateTable
CREATE TABLE "BusinessAddon" (
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

-- CreateTable
CREATE TABLE "BusinessRequest" (
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

-- CreateTable
CREATE TABLE "BusinessRequestAddon" (
    "requestId" TEXT NOT NULL,
    "addonId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessRequestAddon_pkey" PRIMARY KEY ("requestId","addonId")
);

-- CreateTable
CREATE TABLE "BusinessTraveler" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fullNameLatin" TEXT NOT NULL,
    "passportNo" TEXT NOT NULL,
    "passportExpiry" TIMESTAMP(3) NOT NULL,
    "birthDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessTraveler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessDocument" (
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

-- CreateTable
CREATE TABLE "BusinessPayment" (
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

-- CreateTable
CREATE TABLE "BusinessInvoice" (
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

-- CreateTable
CREATE TABLE "BusinessVoucher" (
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

-- CreateTable
CREATE TABLE "BusinessStatusEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "actorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessCompany_nationalId_key" ON "BusinessCompany"("nationalId");

-- CreateIndex
CREATE INDEX "BusinessCompany_organizationId_idx" ON "BusinessCompany"("organizationId");

-- CreateIndex
CREATE INDEX "BusinessCompany_verifiedAt_idx" ON "BusinessCompany"("verifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessTourPackage_slug_key" ON "BusinessTourPackage"("slug");

-- CreateIndex
CREATE INDEX "BusinessTourPackage_status_idx" ON "BusinessTourPackage"("status");

-- CreateIndex
CREATE INDEX "BusinessTourPackage_destination_idx" ON "BusinessTourPackage"("destination");

-- CreateIndex
CREATE INDEX "BusinessDeparture_packageId_departDate_idx" ON "BusinessDeparture"("packageId", "departDate");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessAddon_code_key" ON "BusinessAddon"("code");

-- CreateIndex
CREATE INDEX "BusinessAddon_packageId_idx" ON "BusinessAddon"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessRequest_code_key" ON "BusinessRequest"("code");

-- CreateIndex
CREATE INDEX "BusinessRequest_status_idx" ON "BusinessRequest"("status");

-- CreateIndex
CREATE INDEX "BusinessRequest_companyId_idx" ON "BusinessRequest"("companyId");

-- CreateIndex
CREATE INDEX "BusinessRequest_expiresAt_idx" ON "BusinessRequest"("expiresAt");

-- CreateIndex
CREATE INDEX "BusinessRequestAddon_addonId_idx" ON "BusinessRequestAddon"("addonId");

-- CreateIndex
CREATE INDEX "BusinessTraveler_requestId_idx" ON "BusinessTraveler"("requestId");

-- CreateIndex
CREATE INDEX "BusinessDocument_requestId_state_idx" ON "BusinessDocument"("requestId", "state");

-- CreateIndex
CREATE INDEX "BusinessDocument_travelerId_idx" ON "BusinessDocument"("travelerId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessPayment_idempotencyKey_key" ON "BusinessPayment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "BusinessPayment_requestId_kind_idx" ON "BusinessPayment"("requestId", "kind");

-- CreateIndex
CREATE INDEX "BusinessPayment_status_idx" ON "BusinessPayment"("status");

-- CreateIndex
CREATE INDEX "BusinessInvoice_requestId_type_idx" ON "BusinessInvoice"("requestId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessVoucher_code_key" ON "BusinessVoucher"("code");

-- CreateIndex
CREATE INDEX "BusinessVoucher_requestId_idx" ON "BusinessVoucher"("requestId");

-- CreateIndex
CREATE INDEX "BusinessVoucher_travelerId_idx" ON "BusinessVoucher"("travelerId");

-- CreateIndex
CREATE INDEX "BusinessStatusEvent_requestId_createdAt_idx" ON "BusinessStatusEvent"("requestId", "createdAt");

-- AddForeignKey
ALTER TABLE "BusinessDeparture" ADD CONSTRAINT "BusinessDeparture_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "BusinessTourPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessAddon" ADD CONSTRAINT "BusinessAddon_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "BusinessTourPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessRequest" ADD CONSTRAINT "BusinessRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "BusinessCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessRequest" ADD CONSTRAINT "BusinessRequest_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "BusinessDeparture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessRequestAddon" ADD CONSTRAINT "BusinessRequestAddon_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BusinessRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessRequestAddon" ADD CONSTRAINT "BusinessRequestAddon_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "BusinessAddon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessTraveler" ADD CONSTRAINT "BusinessTraveler_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BusinessRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessDocument" ADD CONSTRAINT "BusinessDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BusinessRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessDocument" ADD CONSTRAINT "BusinessDocument_travelerId_fkey" FOREIGN KEY ("travelerId") REFERENCES "BusinessTraveler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessPayment" ADD CONSTRAINT "BusinessPayment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BusinessRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessInvoice" ADD CONSTRAINT "BusinessInvoice_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BusinessRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessVoucher" ADD CONSTRAINT "BusinessVoucher_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BusinessRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessVoucher" ADD CONSTRAINT "BusinessVoucher_travelerId_fkey" FOREIGN KEY ("travelerId") REFERENCES "BusinessTraveler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessStatusEvent" ADD CONSTRAINT "BusinessStatusEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BusinessRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

