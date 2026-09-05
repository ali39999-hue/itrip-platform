# CHANGELOG — Canonical Authority Consolidation, Refund Completion & E2E Truthfulness
**Repository:** `itrip-platform`
**Date:** 2026-09-05 (round 2)

Companion to `CHANGELOG_PRODUCTION_HARDENING.md` (round 1). This round closes the
remaining P0/P1 findings from the external architecture audit.

---

## 1. Canonical Authority Consolidation (CORE)

### Accounting — FIN-002 / FIN-005
- `JournalLine.chartOfAccountId` is now **required** (was nullable and, worse, every line was
  mirrored onto account `1010` regardless of its real leg). Migration
  `20260905120000_canonical_authority_consolidation` backfills lines from their parent entry.
- `GeneralLedgerService.postBalancedEntry` maps each operational account (`Account.ownerType`)
  to its canonical ChartOfAccounts code (`USER→1020`, `PLATFORM_ESCROW→2010`, revenue→4010/4020,
  `SUPPLIER_PAYABLE→2020`, `TAX_PAYABLE→2030`, `FX_POOL→1030`, gateway→1010) and posts per-line
  chart accounts. Unmapped owner types fail closed.
- Seed Chart of Accounts extended (`1030 FX Liquidity Pool`, `4020 Fee Revenue`).

### Identity — IAM-001 / IAM-003
- Relational RBAC (`User → UserRole → Role → RolePermission → Permission`) is now the **sole**
  permission authority. `getUserPermissions` no longer falls back to `ROLE_DEFAULT_PERMISSIONS`
  and `isSuperAdmin` / `hasErpRole` resolve from relational assignments only.
- Registration paths (`auth.ts`) create the `UserRole` link for new users; the JWT `permissions`
  claim mirrors the relational records (in-memory defaults only as degraded-mode bootstrap).
- `OrganizationMembership.branchId` added (FK → `OrganizationBranch`, indexed); tenant context
  reads the member's branch from the membership itself.

### Payments — PAY-004
- `Payment.paymentIntentId` added; `processPayment` and `processWebhook` now write the explicit
  `Gateway → Attempt → Intent → Payment → Booking` trace chain.

## 2. Refund Domain Completion (REF-004..006)
- New models + migration `20260905154000_refund_policy_approval_attempt`:
  `RefundPolicySnapshot` (immutable policy inputs), `RefundApproval` (decision trail),
  `RefundAttempt` (execution attempts, unique per attempt number).
- `RefundDomainService.processRefund` persists all three atomically with the ledger reversal;
  the refund unit test asserts every record end-to-end and cleans its ledger rows.

## 3. PII at Rest (Section 34 / audit item 22)
- Passenger `passportNo`/`nationalId` are **encrypted before** entering the
  `BookingItem.details` snapshot; the details payload is an explicit whitelist.
- `persistTravelerDocuments` creates `TravelerProfile` + encrypted `TravelDocument` rows for
  every booking passenger (dossier pages render masked values via `maskDocumentNumber`).
- User profile PII (`nationalId`, `passportNo`) encrypts on write; owner-only reads decrypt via
  the new `getMyKyc` action; legacy plaintext rows decrypt transparently.

## 4. ERP Dashboard — Live Data Only
- `ActionWidgets` ("Action Required") now renders real `OperationalException` rows
  (severity → urgency, relative time, deep link) with an explicit empty state.
- `LiveActivityFeed` streams real `BookingStatusHistory` + `AuditLog` rows.
- Hardcoded `admin-mock.ts` deleted.

## 5. Application Robustness Fixes
- **Checkout auth gate** now works with a valid session cookie alone: `SessionBootstrap`
  (in `providers.tsx`) hydrates the client auth store from the server session via `getSessionUser`.
  Previously a signed-in user on a fresh device (cleared localStorage) was told to sign in again.
- **`/fa/plan` hydration failure** fixed: URL query (`?q=`, `?dest=…`) is applied in a
  post-hydration effect instead of a `window`-reading `useState` initializer (server/client
  mismatch blanked the page on deep links).
- **Hotel detail transient errors** no longer read as "Hotel Not Found": the detail fetch retries
  (3 attempts, backoff) on network errors and 5xx; only a definitive 404 renders not-found.

## 6. Testing & CI
- `npm run test:unit` runs against an **isolated `itrip_test` database**
  (`scripts/run-unit-tests.mjs` + `scripts/ensure-test-db.mjs`) — test fixtures can no longer
  pollute development data. CI behavior unchanged (service DB passthrough).
- INV-001 concurrency proof strengthened to **100 concurrent holds** (oversell = 0).
- `tests/helpers/e2e-auth.ts`: truthful E2E login through the real NextAuth credentials
  provider (seeded bcrypt passwords; CI env + local `.env` candidates). Replaces the vacuous
  fixed-OTP logins that never actually authenticated.
- Strict ERP assertions: every admin page must render its own heading, redirect-to-auth fails,
  anonymous access must be blocked by the middleware.
- `golden-journeys`: fragile locators fixed (`:visible` filters, hotel-detail link excludes
  `/hotels/search`, journey 1 signs in before checkout).
- CI: E2E gate job runs golden journeys on **desktop + mobile Chromium**; credentials moved to
  GitHub Actions secrets with CI-local fallbacks; `db:push` renamed `db:push:dev-only`.
- Local stale test data purged (`scripts/cleanup-stale-test-data.mjs`).

## 7. Verification
- typecheck ✅ · eslint 0 errors / 0 warnings ✅ · unit 106/106 ✅
- E2E **28/28 desktop + 28/28 mobile** ✅
- Production build ✅
- README status matrix updated (LIVE / BETA / SIMULATED / COMING_SOON).
