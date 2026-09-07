# iTrip / Firuzo Platform Release Notes — v1.3.0

**Release Tag:** `v1.3.0`
**Release Date:** 2026-09-07
**Target Environment:** Node.js 20+ / PostgreSQL 16 / Next.js 16 (App Router)
**Previous Release:** `v1.2.0` (`cf45237`)

---

## 🚀 Key Highlights & What's New

### 1. ERP & Operations Center (new)
- `TravelFileService` (ERP-001..007): consolidated Trip dossiers grouping flights/hotels/tours.
- `ExceptionCenterService` (ERP-009): deduped operational exceptions with `raiseException` as single entry point.
- `DocumentManagementService`: back-office document lifecycle for travel files.
- New UI: `TravelFileWorkspaceClient`, `ExceptionCenterClient`, `ERPDataGrid`, admin travel-files + exceptions pages.

### 2. Booking Consolidation & Saga Hardening (Wave 3)
- `BookingApplicationService`: application-layer orchestration over `BookingDomainService`.
- `policy-snapshot.ts` + `timeline-taxonomy.ts`: deterministic policy capture and unified timeline events.
- `saga/` directory: split saga orchestrator into modular steps with idempotency guards.
- New tests: `wave3-booking-consolidation.test.ts`, `saga-idempotency.test.ts`, `worker-crash-recovery.test.ts`.

### 3. Finance, Settlement & Reconciliation
- `ReconciliationDomainService`, `SettlementBatchService`, `SupplierStatementService`: supplier statements + batch settlement.
- `JournalService` + `accounting-invariants.test.ts`: double-entry ledger invariants enforced at service level.
- `PaymentReconciliationReportService`: payment-to-ledger reconciliation reporting.
- `wave10-refund-settlement-reconciliation.test.ts`: refund ↔ settlement ↔ reconciliation coverage.

### 4. Inventory & Refund State Machines
- `hold-state-machine.ts` + `HoldExpirationWorker`: explicit hold lifecycle (create/capture/release/expire) — all mutations via `InventoryEngine`.
- `capture-release-race.test.ts`: concurrency race coverage for capture vs release.
- `RefundStateMachine.ts`: explicit refund transitions; refunds release inventory via engine compensation.

### 5. Supplier & Payments Adapters (real-gateway ready)
- `SupplierTransport` + `SupplierNormalizer` + `adapters/`: normalized supplier contract with `supplier-contract.test.ts`.
- `payments/adapters/` + `wave5-real-payments.test.ts`: real-gateway adapter surface (HMAC raw-body verify, fail-closed, single-capture).
- Webhook route hardened; terminal-state bookings never resurrected.

### 6. Content, Pricing & AI Domains
- `CmsPublishingService`, `ContentTranslation`, `SeoMetadataService` + `cms-publishing.test.ts`: publishing workflow with i18n + SEO metadata.
- `domains/pricing/` (new): centralized pricing engine surface.
- `domains/ai/` (new): AI planner service surface for trip planning.

### 7. Security Hardening
- New guards: `content-sanitizer`, `csrf-protection`, `file-upload-validator`, `pii-masking`, `redis-rate-limiter`, `ssrf-protection`, `url-validator`.
- `TenantRepository` as canonical B2B scoping authority + migration `20260907120000_b2b_tenant_scoping_and_ownership_constraints`.
- OTP abuse + i18n-RTL + IDOR suites extended (`otp-abuse.test.ts`, `i18n-rtl.test.ts`).

### 8. Observability
- `correlation-context.ts`, `redacted-logger.ts`, `AlertingService`, `BusinessMetricsDashboardService`, `QueueMetricsService`, `WorkerLeaseService`.
- `worker-entrypoint.ts`: single entrypoint for hold-expiration + outbox workers.

### 9. Homepage & UX Expansion
- New sections: `AppDownloadSection`, `FaqSection`, `PopularFlightsSection`, `PromotionalBanners`, `QuickServicesBar`, `WhyFiruzoSection`.
- Flights: `FlightPriceCalendar`, `FlightPriceAlertModal`, `FlightRefundRulesModal`.
- Global: `CommandPalette` (⌘K), hardened `AppChrome`/`Header`/`BottomNav`, Vazirmatn `public/fonts` bundle.
- New audit tooling: `scripts/*audit*.js`, `verify_*`, `check_*`, `security-scan.mjs`, `i18n-completeness-gate.mjs`, `generate-reality-matrix.mjs`.

---

## 🧪 Verification & Health
- GitHub Actions on `main`: last run before this release is `success` (e2e-gate `continue-on-error` after `cf45237` fix).
- No open PRs; `main` is not branch-protected — team pulls directly from `origin/main`.
- Follow-up after push: confirm new `v1.3.0` workflow run is green and `gh release view v1.3.0` resolves.

## 📦 Upgrade Notes
- Run `prisma migrate deploy` (new B2B scoping migration included).
- Run `npm ci && npm run build` to verify fonts + new sections bundle.
- No breaking env changes; `assertProductionConfig()` (BASE-008) still fails closed on invalid prod config.
