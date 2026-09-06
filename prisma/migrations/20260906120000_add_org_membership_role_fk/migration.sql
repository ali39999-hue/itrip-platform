-- CreateIndex
CREATE INDEX "OrganizationMembership_roleId_idx" ON "OrganizationMembership"("roleId");

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
