-- T0804: bind guest-or-authenticated request creation to the core user.
ALTER TABLE "BusinessRequest" ADD COLUMN "createdById" TEXT;

-- CreateIndex
CREATE INDEX "BusinessRequest_createdById_idx" ON "BusinessRequest"("createdById");
