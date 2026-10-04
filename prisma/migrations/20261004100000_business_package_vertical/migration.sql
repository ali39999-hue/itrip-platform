-- T0401: vertical dimension on the specialist catalog (§36 scale layer).
ALTER TABLE "BusinessTourPackage" ADD COLUMN "vertical" TEXT NOT NULL DEFAULT 'technology';

-- CreateIndex
CREATE INDEX "BusinessTourPackage_vertical_idx" ON "BusinessTourPackage"("vertical");
