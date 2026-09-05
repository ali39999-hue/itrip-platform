-- Canonical Authority Consolidation (CORE AUTHORITY CONSOLIDATION)
-- FIN-002/005: JournalLine.chartOfAccountId becomes required and correctly mapped.
-- IAM-003: OrganizationMembership.branchId for organization → branch scoping.
-- PAY-004: explicit Payment → PaymentIntent trace chain.
-- IAM-001: relational RBAC becomes the sole permission authority (bootstrap from legacy columns).

-- ============ FIN-002: JournalLine.chartOfAccountId required ============
-- Backfill journal lines from their parent entry where the per-line account was never set.
UPDATE "JournalLine" jl
SET "chartOfAccountId" = je."chartOfAccountId"
FROM "JournalEntry" je
WHERE jl."journalEntryId" = je."id" AND jl."chartOfAccountId" IS NULL;

-- Orphaned lines without any resolvable account cannot satisfy the double-entry
-- invariant; they are removed before enforcing NOT NULL.
DELETE FROM "JournalLine" WHERE "chartOfAccountId" IS NULL;

ALTER TABLE "JournalLine" ALTER COLUMN "chartOfAccountId" SET NOT NULL;

-- A required relation must RESTRICT on delete (SET NULL would violate NOT NULL).
ALTER TABLE "JournalLine" DROP CONSTRAINT "JournalLine_chartOfAccountId_fkey";
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_chartOfAccountId_fkey" FOREIGN KEY ("chartOfAccountId") REFERENCES "ChartOfAccounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============ IAM-003: OrganizationMembership.branchId ============
ALTER TABLE "OrganizationMembership" ADD COLUMN "branchId" TEXT;
CREATE INDEX "OrganizationMembership_branchId_idx" ON "OrganizationMembership"("branchId");
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "OrganizationBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============ PAY-004: Payment → PaymentIntent trace chain ============
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paymentIntentId" TEXT;
CREATE INDEX IF NOT EXISTS "Payment_paymentIntentId_idx" ON "Payment"("paymentIntentId");
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Payment_paymentIntentId_fkey'
    ) THEN
        ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- ============ IAM-001: bootstrap relational RBAC from legacy columns ============
-- 1. Ensure a Role row exists for every legacy User.role value.
INSERT INTO "Role" ("id", "name", "permissions")
SELECT gen_random_uuid()::text, roles.rname, '[]'
FROM (SELECT DISTINCT "role" AS rname FROM "User" WHERE "role" IS NOT NULL) AS roles
WHERE NOT EXISTS (SELECT 1 FROM "Role" r WHERE r."name" = roles.rname);

-- 2. Ensure Permission rows exist for codes referenced by Role.permissions JSON.
INSERT INTO "Permission" ("id", "code", "name", "module")
SELECT gen_random_uuid()::text, codes.code, upper(replace(codes.code, ':', ' ')), upper(split_part(codes.code, ':', 1))
FROM (SELECT DISTINCT jsonb_array_elements_text("permissions"::jsonb) AS code FROM "Role" WHERE "permissions" IS NOT NULL) AS codes
WHERE NOT EXISTS (SELECT 1 FROM "Permission" p WHERE p."code" = codes.code);

-- 3. Materialize Role.permissions JSON into relational RolePermission rows.
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN LATERAL jsonb_array_elements_text(r."permissions"::jsonb) AS code
JOIN "Permission" p ON p."code" = code
ON CONFLICT DO NOTHING;

-- 4. Assign every user's legacy role relationally: User → UserRole → Role.
INSERT INTO "UserRole" ("userId", "roleId")
SELECT u."id", r."id"
FROM "User" u
JOIN "Role" r ON r."name" = u."role"
ON CONFLICT DO NOTHING;
