-- AlterTable Trip
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "branchId" TEXT;

-- AlterTable Invoice
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "branchId" TEXT;

-- AlterTable SettlementBatch
ALTER TABLE "SettlementBatch" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "SettlementBatch" ADD COLUMN IF NOT EXISTS "branchId" TEXT;

-- AlterTable TravelDocument
ALTER TABLE "TravelDocument" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "TravelDocument" ADD COLUMN IF NOT EXISTS "branchId" TEXT;

-- AlterTable Role make permissions nullable with default
ALTER TABLE "Role" ALTER COLUMN "permissions" DROP NOT NULL;
ALTER TABLE "Role" ALTER COLUMN "permissions" SET DEFAULT '[]';

-- Indexes
CREATE INDEX IF NOT EXISTS "Booking_branchId_idx" ON "Booking"("branchId");

CREATE INDEX IF NOT EXISTS "Trip_organizationId_idx" ON "Trip"("organizationId");
CREATE INDEX IF NOT EXISTS "Trip_branchId_idx" ON "Trip"("branchId");

CREATE INDEX IF NOT EXISTS "Invoice_organizationId_idx" ON "Invoice"("organizationId");
CREATE INDEX IF NOT EXISTS "Invoice_branchId_idx" ON "Invoice"("branchId");

CREATE INDEX IF NOT EXISTS "SettlementBatch_organizationId_idx" ON "SettlementBatch"("organizationId");
CREATE INDEX IF NOT EXISTS "SettlementBatch_branchId_idx" ON "SettlementBatch"("branchId");

CREATE INDEX IF NOT EXISTS "TravelDocument_organizationId_idx" ON "TravelDocument"("organizationId");
CREATE INDEX IF NOT EXISTS "TravelDocument_branchId_idx" ON "TravelDocument"("branchId");

-- Foreign Keys
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_organizationId_fkey";
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_branchId_fkey";
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "OrganizationBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Trip" DROP CONSTRAINT IF EXISTS "Trip_organizationId_fkey";
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Trip" DROP CONSTRAINT IF EXISTS "Trip_branchId_fkey";
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "OrganizationBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_organizationId_fkey";
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_branchId_fkey";
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "OrganizationBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SettlementBatch" DROP CONSTRAINT IF EXISTS "SettlementBatch_organizationId_fkey";
ALTER TABLE "SettlementBatch" ADD CONSTRAINT "SettlementBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SettlementBatch" DROP CONSTRAINT IF EXISTS "SettlementBatch_branchId_fkey";
ALTER TABLE "SettlementBatch" ADD CONSTRAINT "SettlementBatch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "OrganizationBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TravelDocument" DROP CONSTRAINT IF EXISTS "TravelDocument_organizationId_fkey";
ALTER TABLE "TravelDocument" ADD CONSTRAINT "TravelDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TravelDocument" DROP CONSTRAINT IF EXISTS "TravelDocument_branchId_fkey";
ALTER TABLE "TravelDocument" ADD CONSTRAINT "TravelDocument_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "OrganizationBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- IAM-104: Tenant Ownership Constraints and Consistency Triggers
CREATE OR REPLACE FUNCTION check_tenant_branch_consistency()
RETURNS TRIGGER AS $$
DECLARE
  v_branch_org TEXT;
BEGIN
  IF NEW."branchId" IS NOT NULL AND NEW."organizationId" IS NOT NULL THEN
    SELECT "organizationId" INTO v_branch_org FROM "OrganizationBranch" WHERE "id" = NEW."branchId";
    IF v_branch_org IS NOT NULL AND v_branch_org <> NEW."organizationId" THEN
      RAISE EXCEPTION 'CROSS_ORG_VIOLATION: branchId (%) belongs to organization (%) but resource is assigned to organization (%)', NEW."branchId", v_branch_org, NEW."organizationId";
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_booking_branch_tenant ON "Booking";
CREATE TRIGGER trg_check_booking_branch_tenant
BEFORE INSERT OR UPDATE ON "Booking"
FOR EACH ROW EXECUTE FUNCTION check_tenant_branch_consistency();

DROP TRIGGER IF EXISTS trg_check_trip_branch_tenant ON "Trip";
CREATE TRIGGER trg_check_trip_branch_tenant
BEFORE INSERT OR UPDATE ON "Trip"
FOR EACH ROW EXECUTE FUNCTION check_tenant_branch_consistency();

DROP TRIGGER IF EXISTS trg_check_invoice_branch_tenant ON "Invoice";
CREATE TRIGGER trg_check_invoice_branch_tenant
BEFORE INSERT OR UPDATE ON "Invoice"
FOR EACH ROW EXECUTE FUNCTION check_tenant_branch_consistency();

DROP TRIGGER IF EXISTS trg_check_document_branch_tenant ON "TravelDocument";
CREATE TRIGGER trg_check_document_branch_tenant
BEFORE INSERT OR UPDATE ON "TravelDocument"
FOR EACH ROW EXECUTE FUNCTION check_tenant_branch_consistency();

DROP TRIGGER IF EXISTS trg_check_settlement_branch_tenant ON "SettlementBatch";
CREATE TRIGGER trg_check_settlement_branch_tenant
BEFORE INSERT OR UPDATE ON "SettlementBatch"
FOR EACH ROW EXECUTE FUNCTION check_tenant_branch_consistency();

-- Booking - Trip cross-org consistency trigger
CREATE OR REPLACE FUNCTION check_booking_trip_tenant_consistency()
RETURNS TRIGGER AS $$
DECLARE
  v_trip_org TEXT;
BEGIN
  IF NEW."tripId" IS NOT NULL AND NEW."organizationId" IS NOT NULL THEN
    SELECT "organizationId" INTO v_trip_org FROM "Trip" WHERE "id" = NEW."tripId";
    IF v_trip_org IS NOT NULL AND v_trip_org <> NEW."organizationId" THEN
      RAISE EXCEPTION 'CROSS_ORG_VIOLATION: Booking organizationId (%) does not match Trip organizationId (%)', NEW."organizationId", v_trip_org;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_booking_trip_tenant ON "Booking";
CREATE TRIGGER trg_check_booking_trip_tenant
BEFORE INSERT OR UPDATE ON "Booking"
FOR EACH ROW EXECUTE FUNCTION check_booking_trip_tenant_consistency();

-- Invoice - Booking cross-org consistency trigger
CREATE OR REPLACE FUNCTION check_invoice_booking_tenant_consistency()
RETURNS TRIGGER AS $$
DECLARE
  v_bkg_org TEXT;
BEGIN
  IF NEW."bookingId" IS NOT NULL AND NEW."organizationId" IS NOT NULL THEN
    SELECT "organizationId" INTO v_bkg_org FROM "Booking" WHERE "id" = NEW."bookingId";
    IF v_bkg_org IS NOT NULL AND v_bkg_org <> NEW."organizationId" THEN
      RAISE EXCEPTION 'CROSS_ORG_VIOLATION: Invoice organizationId (%) does not match Booking organizationId (%)', NEW."organizationId", v_bkg_org;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_invoice_booking_tenant ON "Invoice";
CREATE TRIGGER trg_check_invoice_booking_tenant
BEFORE INSERT OR UPDATE ON "Invoice"
FOR EACH ROW EXECUTE FUNCTION check_invoice_booking_tenant_consistency();
