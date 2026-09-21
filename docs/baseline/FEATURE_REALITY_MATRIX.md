# iTRIP / Firuzo Platform — Feature Reality Matrix (v1.8.6)

**Latest Release Tag:** `v1.8.6` (`2e139520d8ce`)  
**Current Main Branch HEAD:** `2e139520d8ce` (`feat(release): v1.8.6 - UX ergonomics, date clamping, unified EmptyState & CSP improvements`)  
**Current Live Deployment:** `1.8.6` on commit `2e139520d8cecb9af3baad39798342cd3f2fef5a` (deployed from `2e13952` on Vercel — ALIGNED)  
**Audit Date:** 2026-09-21  
**Authoritative Baseline:** v1.8.6 / `2e13952` (Release) / `2e13952` (Main) / `2e13952` (Live)  
**Supersedes:** `FEATURE_REALITY_MATRIX.md` (v1.8.4 / `de150f5`)  

> **Notice:** This document is the single authoritative source of truth for platform capabilities, feature reality, and deployment verification. Every status is evidence-backed by source code, Prisma schema models, automated unit/integration test suites, and live HTTP probes. Optimistic claims, unverified states, and outdated matrix baselines are strictly reconciled herein.

---

## 1. System Baseline Metrics

- **Runtime & Framework:** Node.js 22.x · Next.js 16.3.4 (App Router) · React 19.2.8 · TypeScript 5 · Tailwind CSS v4
- **Database & Persistence:** Prisma 5.22.0 · **78 Relational Models** · **34 Migrations** (PostgreSQL 16 canonical, zero SQLite drift)
- **Unit & Domain Tests:** 166 test files / **1,140 verified tests** (100% passing across domain, observability, portability and UI suites — source: `docs/baseline/quality-report.json`)
- **E2E Test Specifications:** 33 Playwright test suites in `tests/*.spec.ts` (golden journeys, mobile journeys, security, a11y)
- **Internationalization:** 5 supported languages (`fa`, `en`, `ar`, `zh`, `ru`) with 100% key parity enforced via `scripts/i18n-completeness-gate.mjs`
- **Design System & Primitives:** Semantic tokens (`text-ink`, `text-sub`, `bg-surface`, `bg-brand`, `bg-action`), Shadcn primitives, glassmorphism, responsive 320px–1440px
- **Capability Registry:** `src/lib/capabilities/index.ts` (45 tracked capabilities) controlling customer-facing claim states
- **Live Deployment State:** `https://itrip-platform.vercel.app/` running verified version `1.8.6` on commit `2e139520d8ce` (ALIGNED), probed live via `/api/version`, `/api/health/live`, `/api/capabilities` — measured by scripts/verify-release-consistency.mjs at 2026-09-20T10:42:58.684Z

---

## 2. Release, Main & Deployment Provenance Audit

| Scope | Entity | Target / Expected | Observed Reality | Status | Evidence / Notes |
|---|---|---|---|---|---|
| **LATEST RELEASE** | **Git Release Tag** | `v1.8.6` | `refs/tags/v1.8.6` -> `2e13952` | **ALIGNED** | Tag points to commit `2e139520d8cecb9af3baad39798342cd3f2fef5a` |
| **LATEST RELEASE** | **Release Commit** | `2e13952` | `2e139520d8cecb9af3baad39798342cd3f2fef5a` | **ALIGNED** | Primary v1.8.6 release train commit |
| **CURRENT MAIN** | **Local / Origin HEAD** | `2e139520d8ce` | `2e139520d8ce` | **ALIGNED** | Measured via `git rev-parse HEAD` |
| **CURRENT MAIN** | **package.json Version** | `1.8.6` | `1.8.6` | **ALIGNED** | Line 3 of `package.json` |
| **CURRENT MAIN** | **src/lib/version.ts** | `1.8.6` | `1.8.6` | **ALIGNED** | `NEXT_PUBLIC_APP_VERSION` default in `src/lib/version.ts` |
| **CURRENT LIVE** | **Live Deployment Artifact** | `2e139520d8ce` | `2e139520d8ce` | **ALIGNED** | Vercel deployed from commit `2e139520d8ce` |
| **CURRENT LIVE** | **Live /api/version** | `1.8.6` | `1.8.6` (commit `2e139520d8ce...`) | **ALIGNED** | Production runtime reported version `1.8.6` |
| **CURRENT LIVE** | **Live /api/health/live** | 200 OK | 200 OK (`status: live`) | **HEALTHY** | Node.js v22.23.2 alive, memory: ~80MB |
| **CURRENT LIVE** | **Live /api/health/ready** | 200 OK | 200 OK (`status: ready`) | **HEALTHY** | Database healthy, eCardo gateway production mode |
| **CURRENT LIVE** | **Live /api/capabilities**| 200 OK | 200 OK (v1.8.6 registry) | **HEALTHY** | Capability registry served by the same runtime |

---

## 3. Comprehensive Feature Reality Matrix (v1.8.6)

Status legend:
- **REAL:** Verified end-to-end (Database, Backend, API, Frontend, Automated Tests) without simulation.
- **BETA:** Core architecture and domain logic functional; external dependency or human clearance workflow gated.
- **SIMULATED:** Simulated in dev/demo environments with in-memory or fallback engines.
- **MOCK:** Data provided via seeded catalogs or static mock ports without live upstream provider.
- **COMING_SOON:** Architectural port and UI placeholder exist, but underlying external integration is pending contract.
- **DISABLED:** Implemented but intentionally locked closed in production for security or compliance policy.
- **PARTIAL:** Some layers functional while critical components require hardening.
- **MISSING:** Not implemented in the current release.

| # | Subsystem / Feature | Capability Key | Doc | DB | Back | API | Front | Run | Tests | External Provider | Production State | Live State | Status | Evidence Path |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **System Observability & Error Hub** | `observability.hub` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Structured JSON + DB SystemErrorLog | Fingerprinted, PII-redacted error tracking | LIVE (`/admin/logs`) | **REAL** | `src/domains/observability/ErrorTrackerService.ts` |
| 2 | **Tour Reservation Engine** | `supplier.tour` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Direct Supplier CMS & Allotment | Inventory-backed, multi-currency | LIVE | **REAL** | `src/services/tours-service.ts`, `src/domains/inventory/InventoryEngine.ts` |
| 3 | **Unpaid Booking & Cart Resume** | `cart.unified` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Server-authoritative Cart & Resume Engine | Unpaid cart lines, phase resume, reprice check | LIVE | **REAL** | `src/domains/booking/UnifiedCartService.ts`, `src/components/cart/UnifiedCartDrawer.tsx` |
| 4 | **Jalali Date Wheel Picker** | `ui.jalali` | ✅ | — | ✅ | — | ✅ | ✅ | ✅ | React Wheel Picker + Shamsi date utils | 44px touch targets, mobile-optimized | LIVE | **REAL** | `src/components/ui/JalaliWheelDatePicker.tsx` |
| 5 | **Verifiable E-Voucher** | `voucher.verification` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | HMAC-SHA256 signed verification token | 30-day token, status check, QR verification | LIVE | **REAL** | `src/domains/booking/VoucherService.ts` |
| 6 | **Offline Voucher PWA** | `voucher.offline` | ✅ | — | ✅ | — | ✅ | ✅ | ✅ | User-scoped browser LocalStorage | User-isolated, PII-masked offline cards | LIVE | **REAL** | `src/lib/offline-voucher.ts` |
| 7 | **CRM & Support Tickets** | `crm.tickets` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Relational PostgreSQL SupportTicket & Message | SLA policy, priority routing, outbox events | LIVE | **REAL** | `src/domains/tickets/TicketDomainService.ts` |
| 8 | **Customer 360 Workspace** | `customer360` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Tenant-isolated 360 synthesizer | PII masking, tickets tab, behavior summary | BETA | **BETA** | `src/domains/identity/Customer360Service.ts` |
| 9 | **Behavior Analytics & Heatmaps** | `analytics.behavior` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | First-party PostgreSQL event store | Non-blocking, DNT-respecting, rate-limited | LIVE | **REAL** | `src/lib/behavior.ts`, `src/app/api/behavior/track/` |
| 10 | **Analytics Privacy & Pruning** | `analytics.privacy` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 90-day retention prune in async cron | DNT/Sec-GPC check, zero form PII | LIVE | **REAL** | `src/lib/behavior.ts`, `src/app/api/cron/async-engine/` |
| 11 | **Double-Entry General Ledger** | `payment.wallet` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Internal PostgreSQL Ledger Engine | Balanced debits/credits invariant | LIVE | **REAL** | `src/domains/ledger/GeneralLedgerService.ts` |
| 12 | **Multi-Currency Wallet** | `wallet.multicurrency` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Authoritative FX snapshot | Multi-asset wallet balances | LIVE | **REAL** | `src/domains/ledger/GeneralLedgerService.ts` |
| 13 | **eCardo Payment Gateway** | `payment.ecardo` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | eCardo merchant IPN (HTTPS/HMAC) | Live-ready production adapter | LIVE (active) | **REAL** | `src/domains/payments/adapters/EcardoGatewayAdapter.ts` |
| 14 | **Card-to-Card Payment** | `payment.cardToCard` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Manual Iranian banking clearing | PENDING_VERIFICATION + back-office | LIVE (review) | **BETA** | `src/domains/payments/adapters/CardToCardPaymentAdapter.ts` |
| 15 | **Shetab PSP Gateway** | `payment.shetab` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Saman/Pasargad Shaparak IPN | Fail-closed w/o live merchant creds | DISABLED | **DISABLED** | `src/domains/payments/adapters/ShetabPspAdapter.ts` |
| 16 | **Visa / Mastercard Rail** | `payment.visa/mastercard` | ✅ | ✅ | ✅ | ✅ | ✅ | ⛔ | ✅ | International acquiring rail | Gated via eCardo multi-currency rail | COMING_SOON | **COMING_SOON** | `src/components/checkout/PaymentGatewaySelector.tsx` |
| 17 | **USDT (TRC20) Payment** | `payment.usdt` | ✅ | ✅ | ✅ | ✅ | ✅ | ⛔ | ✅ | Crypto hot-wallet / TRC20 probe | Gated via eCardo multi-currency rail | COMING_SOON | **COMING_SOON** | `src/components/checkout/PaymentGatewaySelector.tsx` |
| 18 | **Flight Inventory** | `supplier.flight` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Parto CRS Cache / Seeded Catalog | Seeded catalog + Parto cache probe | MOCK/BETA | **MOCK** | `src/services/flight-cache-service.ts` |
| 19 | **Hotel Inventory** | `supplier.hotel` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Seeded Luxury Catalog / BedBank | Seeded catalog with rich facets | MOCK | **MOCK** | `src/domains/supplier/hotel-supplier-port.ts` |
| 20 | **Multi-Currency Tours** | `tours.multicurrency` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Currency-specific pricing column | DB persisted source & customer | LIVE | **REAL** | `src/services/tours-service.ts` |
| 21 | **Passenger Manifest** | `manifest.export` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | CSV/JSON agency export engine | RBAC-gated export with audit log | LIVE (admin) | **REAL** | `src/domains/booking/PassengerManifestService.ts` |
| 22 | **Corporate Travel Hub** | `corporate` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Organizations & Memberships DB | B2B tenancy & invoice grouping | BETA | **BETA** | `src/domains/identity/OrganizationService.ts` |
| 23 | **Referral & Commissions** | `marketing.referral` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Tiered Commission Engine | Rules-based snapshot accrual | LIVE | **REAL** | `src/domains/finance/CommissionService.ts` |
| 24 | **Inventory Hold & Lock** | `inventory.engine` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | PostgreSQL row-lock & atomic hold | 100 concurrent race -> 1 winner | LIVE | **REAL** | `src/domains/inventory/InventoryEngine.ts` |
| 25 | **Booking State Machine** | `booking.lifecycle` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Strictly legal state transitions | Never creates synthetic PNR | LIVE | **REAL** | `src/domains/booking/state-machine.ts` |
| 26 | **Refund Domain Service** | `refund.domain` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Idempotent REF-101..107 invariants | Double-refund prevention | BETA | **BETA** | `src/domains/refund/RefundDomainService.ts` |
| 27 | **Official Tax Invoice** | `taxInvoice` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Official-format PDF/HTML renderer | Format compliant; no Moadian sub | BETA | **BETA** | `src/domains/finance/InvoiceDomainService.ts` |
| 28 | **KYC Identity vs Role** | `kyc.compliance` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Decoupled identity from admin role | Strict multi-currency limits | LIVE | **REAL** | `src/lib/kyc-payment-rules.ts` |
| 29 | **Passport OCR Validator** | `ocr.validator` | ✅ | — | ✅ | — | ✅ | ✅ | ✅ | ICAO Doc 9303 TD3 checksums | Country-specific passport check | LIVE | **REAL** | `src/lib/ocr-country-validator.ts` |
| 30 | **Country Reactivity** | `country.reactivity` | ✅ | — | ✅ | — | ✅ | ✅ | ✅ | CountryStore (7 regional countries) | Localized currency, gates, phone | LIVE | **REAL** | `src/stores/country-store.ts` |
| 31 | **FX Engine** | `fx.liveRates` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Central bank / tgju / static chain | Reference FX snapshot with TTL | SIMULATED | **SIMULATED** | `src/domains/currency/CurrencyService.ts` |
| 32 | **AI Travel Planner** | `ai.planner` | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | Multi-provider fallback router | Grounded suggestion-only | LIVE | **REAL** | `src/domains/ai/AiRouterService.ts` |
| 33 | **Loyalty Daily Streak** | `loyalty.streak` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | PostgreSQL atomic claim lock | Idempotent claim & rewards | LIVE | **REAL** | `src/domains/loyalty/LoyaltyStreakService.ts` |
| 34 | **Outbox & Crash Recovery**| `events.outbox` | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | Outbox pattern + DLQ second chance | Docker/k8s worker runtime | REAL (env) | **REAL** | `src/workers/worker-entrypoint.ts` |
| 35 | **SMS OTP Authentication** | `auth.sms` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | SMSWBS live provider / HMAC-SHA256 | Real SMS OTP delivery | LIVE/BETA | **BETA/LIVE** | `src/auth.ts`, `src/actions/auth.ts` |
| 36 | **Email Authentication** | `auth.email` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | NextAuth credentials & email | Email validation & login | BETA | **BETA** | `src/auth.ts` |
| 37 | **Telegram Auth Gateway** | `auth.telegram` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Telegram login widget callback | Hash & auth_date verification | BETA | **BETA** | `src/app/api/auth/telegram/callback/` |
| 38 | **PWA Mobile Journey** | `mobile.pwa` | ✅ | — | ✅ | — | ✅ | ✅ | ✅ | Service worker, manifest, touch UX | 320px–768px touch-optimized | LIVE | **REAL** | `public/manifest.json`, `src/components/mobile/` |
| 39 | **Universal Portability** | `runtime.portability` | ✅ | — | ✅ | — | ✅ | ✅ | ✅ | Dynamic host & proxy resolution | Zero hardcoded URLs, standalone ready | LIVE | **REAL** | `src/lib/runtime-url.ts` |
| 40 | **Maker-Checker High-Value Gate** | `erp.makerChecker` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Two-step approval for refunds >= 50M IRR | Separation of duties (Maker != Checker) | LIVE | **REAL** | `src/domains/refund/RefundDomainService.ts` |
| 41 | **4-Axis Status Contracts** | `security.contracts` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Branded types & DB boundary validation | Eliminates typo & invalid state transitions | LIVE | **REAL** | `src/domains/booking/status-contracts.ts` |
| 42 | **Disaster Recovery Simulation** | `dr.simulation` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Automated DR integrity check & 5 Runbooks | RTO < 30m, RPO < 5m, zombie task unclaim | LIVE | **REAL** | `docs/runbooks/RUNBOOK_05_DISASTER_RECOVERY_DRILL.md` |
| 43 | **Internal Monorepo Packages** | `monorepo.packages` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | @packages/{contracts,domain-types,money,test-fixtures} | Zero-conflict type-safe contracts | LIVE | **REAL** | `packages/` |
| 44 | **Airport Executive CIP Lounge** | `services.cip` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Official Airport Authority & Varan CIP | Fast-track immigration, apron escort, day suites | LIVE (`/cip`) | **REAL** | `src/services/cip-service.ts`, `src/app/[locale]/cip/page.tsx` |
| 45 | **Travel Insurance Comparator** | `services.insurance` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Multi-Insurer (Saman, Iran, Kowsar, Razi) & Swiss Assist / Remed | Actuarial age-rating, instant issuance, Schengen compliant | LIVE (`/insurance`) | **REAL** | `src/services/insurance-service.ts`, `src/app/[locale]/insurance/page.tsx` |

---

## 4. Test Metrics (Authoritative Single Source of Truth)

- **Test Files Count:** **166 test files** (measured from `results/unit.json` `testResults.length` — `numTotalTestSuites` counts describe() blocks, not files)
- **Total Unit Test Specs:** **1,140 verified passing tests** (100% pass rate — source: `docs/baseline/quality-report.json`)
- **Failure Count:** **0 failed**
- **Skipped / Flaky Count:** **0 skipped, 0 flaky**
- **Breakdown by Domain** (measured from test file paths in `results/unit.json`, buckets overlap by keyword priority):
  - Payments & Gateways (eCardo, Shetab, Card-to-Card, Safety): 92 tests
  - Ledger & Finance (Accounting invariants, Invoices, Refunds, FX): 30 tests
  - Identity & Core (Auth/KYC/Identity paths plus core domain suites): 990 tests
