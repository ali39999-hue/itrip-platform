# iTRIP / Firuzo Platform — Feature Reality Matrix (v1.7.9)

**Version:** v1.7.9  
**Commit:** `c3e6074` (`c3e6074e13757b27bae192b278ff59defa8e2cf5` — chore(release): bump version to v1.7.9 [release train])  
**Branch:** release/v1.7.9 (main HEAD: `6439603`, live deployment: `0d798f4`)  
**Audit Date:** 2026-09-16  
**Authoritative Baseline:** v1.7.9 / `c3e6074`  
**Supersedes:** `FEATURE_REALITY_MATRIX.md` (v1.7.7 / `fddee5e` / `d525eb1`) — Archived to `FEATURE_REALITY_MATRIX_v1.7.7_historical.md`  

> **Notice:** This document is the authoritative single source of truth for platform capabilities and feature reality. Every status is evidence-backed by source code, Prisma schema models, unit/integration test suites, and live probe results. Marketing statements and legacy matrix files are reconciled herein.

---

## 1. System Baseline Metrics

- **Runtime & Framework:** Node.js 22.x · Next.js 16.3.4 (App Router) · React 19.2.8 · TypeScript 5 · Tailwind CSS v4
- **Database & Persistence:** Prisma 5.22.0 · **78 Relational Models** · **32 Migrations** (strictly PostgreSQL 16, zero SQLite drift)
- **Unit & Domain Tests:** 133 test files / **861 verified tests** (100% passing in `results/unit.json` / `vitest run`)
- **E2E Test Specifications:** 27 Playwright test suites in `tests/*.spec.ts` (including golden journeys, mobile chromium, audit suites)
- **Internationalization:** 5 supported languages (`fa`, `en`, `ar`, `zh`, `ru`) with key parity enforced via `scripts/i18n-completeness-gate.mjs`
- **Design System & Primitives:** Semantic tokens (`text-ink`, `text-sub`, `bg-surface`, `bg-brand`, `bg-action`), Shadcn primitives, glassmorphism, responsive 320px–1440px
- **Capability Registry:** `src/lib/capabilities/index.ts` controlling customer-facing claim states
- **Live Deployment State:** `https://itrip-platform.vercel.app/` running build timestamp `2026-09-16T10:35:21.402Z`, probed via `/api/version`, `/api/health/live`, `/api/health/ready`, `/api/capabilities`

---

## 2. Release & Deployment Provenance Audit

| Artifact / Environment | Target / Expected | Observed Reality | Status | Evidence / Notes |
|---|---|---|---|---|
| **Git Release Tag** | `v1.7.9` | `refs/tags/v1.7.9` -> `9e24c20` -> `c3e6074` | **ALIGNED** | Tag points to commit `c3e6074` |
| **Release Commit** | `c3e6074` | `c3e6074e13757b27bae192b278ff59defa8e2cf5` | **ALIGNED** | Primary release train commit |
| **Local Repository HEAD** | `c3e6074` | `64396038c54fb4460dee2cd939722cc78e491159` | **RELEASE DRIFT (+4)** | Local main has 4 post-release commits (`c16a97e`, `4b243f9`, `3fadc2f`, `6439603`) |
| **Live Vercel Deployment** | `c3e6074` | `0d798f42b449da2e0ff2ffb047ba0836130b1a44` | **LIVE DRIFT (+5)** | Live runs commit `0d798f4` deployed on 2026-09-16T10:35:21Z |
| **package.json Version** | `1.7.9` | `1.7.9` | **ALIGNED** | Line 3 of `package.json` |
| **src/lib/version.ts** | `1.7.9` | `1.7.9` | **ALIGNED** | `APP_VERSION = '1.7.9'` |
| **Live /api/version** | `1.7.9` | `1.7.9` (commit `0d798f4`) | **ALIGNED VERSION** | Production runtime reports v1.7.9 |
| **Live /api/health/live** | 200 OK | 200 OK (uptime: 410s, memory: 114MB) | **HEALTHY** | Node process alive |
| **Live /api/health/ready** | 200 OK | Database healthy (1171ms), Redis: IN_MEMORY, Gateway: PRODUCTION_ECARDO, Ledger: 0 unbalanced | **HEALTHY** | Database & Ledger healthy |

---

## 3. Comprehensive Feature Reality Matrix (v1.7.9)

Status vocabulary:
- **REAL:** Fully implemented in database, backend logic, API, UI, and tested with automated suites without simulation.
- **BETA:** Core architecture and domain logic functional; production external dependency or administrative workflow gated.
- **SIMULATED:** Functionally simulated in dev/demo environments with in-memory or fallback engines.
- **MOCK:** Data is provided via seeded catalogs or static mock ports without live upstream provider.
- **COMING_SOON:** Architectural port and UI placeholder exist, but underlying external integration is not yet connected.
- **DISABLED:** Implemented but intentionally locked closed in production for security or compliance policy.
- **PARTIAL:** Some layers functional while critical components require hardening.
- **MISSING:** Not implemented in the current release.

| # | Subsystem / Feature | Capability Key | Doc | DB | Back | API | Front | Run | Tests | External Provider | Production State | Live State | Status | Evidence Path |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Shetab PSP Gateway** | `payment.shetab` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Saman/Pasargad Shaparak IPN | Fail-closed w/o live merchant creds | DISABLED | **DISABLED** | `src/domains/payments/adapters/ShetabPspAdapter.ts` |
| 2 | **eCardo Gateway Rail** | `payment.ecardo` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | eCardo merchant IPN (HTTPS/HMAC) | Live-ready production adapter | LIVE (active) | **REAL** | `src/domains/payments/adapters/EcardoGatewayAdapter.ts` |
| 3 | **Card-to-Card Payment** | `payment.cardToCard` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Manual Iranian banking clearing | PENDING_VERIFICATION + back-office | LIVE (review) | **BETA** | `src/domains/payments/adapters/CardToCardPaymentAdapter.ts` |
| 4 | **Visa / Mastercard Rail** | `payment.visa/mastercard` | ✅ | ✅ | ✅ | ✅ | ✅ | ⛔ | ✅ | International acquiring rail | Gated via eCardo multi-currency rail | COMING_SOON | **COMING_SOON** | `src/components/checkout/PaymentGatewaySelector.tsx` |
| 5 | **USDT (TRC20) Payment** | `payment.usdt` | ✅ | ✅ | ✅ | ✅ | ✅ | ⛔ | ✅ | Crypto hot-wallet / TRC20 probe | Gated via eCardo multi-currency rail | COMING_SOON | **COMING_SOON** | `src/components/checkout/PaymentGatewaySelector.tsx` |
| 6 | **Double-Entry Ledger** | `payment.wallet` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Internal PostgreSQL Ledger Engine | Balanced debits/credits invariant | LIVE | **REAL** | `src/domains/ledger/GeneralLedgerService.ts` |
| 7 | **Multi-Currency Wallet** | `wallet.multicurrency` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Authoritative FX snapshot | Multi-asset wallet balances | LIVE | **REAL** | `src/domains/ledger/GeneralLedgerService.ts` |
| 8 | **Flight Inventory** | `supplier.flight` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Parto CRS Cache / Seeded Catalog | Seeded catalog + Parto cache probe | MOCK/BETA | **MOCK** | `src/services/flight-cache-service.ts` |
| 9 | **Hotel Inventory** | `supplier.hotel` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Seeded Luxury Catalog / BedBank | Seeded catalog with rich facets | MOCK | **MOCK** | `src/domains/supplier/hotel-supplier-port.ts` |
| 10 | **Tours Booking Engine** | `supplier.tour` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Direct Supplier CMS & Allotment | Inventory-backed, multi-currency | LIVE | **REAL** | `src/services/tours-service.ts`, `InventoryEngine.ts` |
| 11 | **Multi-Currency Tours** | `tours.multicurrency` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Currency-specific pricing column | DB persisted source & customer | LIVE | **REAL** | `src/services/tours-service.ts` |
| 12 | **Unified Cart Drawer** | `cart.unified` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Server-authoritative Cart Engine | Multi-product bundling & pricing | LIVE | **REAL** | `src/components/cart/UnifiedCartDrawer.tsx` |
| 13 | **Passenger Manifest** | `manifest.export` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | CSV/JSON agency export engine | RBAC-gated export with audit log | LIVE (admin) | **REAL** | `src/domains/booking/PassengerManifestService.ts` |
| 14 | **Verifiable E-Voucher** | `voucher.verification` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Signed HMAC-SHA256 verification | QR verification & status check | LIVE | **REAL** | `src/domains/booking/VoucherService.ts` |
| 15 | **Offline Voucher PWA** | `voucher.offline` | ✅ | — | ✅ | — | ✅ | ✅ | ✅ | Browser LocalStorage cache | Safe minimal PII caching | LIVE | **REAL** | `src/lib/offline-voucher.ts` |
| 16 | **CRM & Support Tickets** | `crm.tickets` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Relational SupportTicket & Message | SLA, priority, operational linkage | LIVE | **REAL** | `src/domains/tickets/TicketDomainService.ts` |
| 17 | **Customer 360 Workspace** | `customer360` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Tenant-isolated 360 synthesizer | Platform staff & org-scoped RBAC | BETA | **BETA** | `src/domains/identity/Customer360Service.ts` |
| 18 | **Corporate Travel Hub** | `corporate` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Organizations & Memberships DB | B2B tenancy & invoice grouping | BETA | **BETA** | `src/domains/identity/OrganizationService.ts` |
| 19 | **Behavior & Heatmaps** | `analytics.behavior` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | First-party PostgreSQL event store | DNT-respecting, anonymized, rate-limited | LIVE | **REAL** | `src/lib/behavior.ts`, `src/app/api/behavior/track/` |
| 20 | **Analytics Privacy** | `analytics.privacy` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Data minimization & 90-day prune | DNT check, no PII capture | LIVE | **REAL** | `src/lib/behavior.ts` |
| 21 | **Referral & Commissions** | `marketing.referral` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Tiered Commission Engine | Rules-based snapshot accrual | LIVE | **REAL** | `src/domains/finance/CommissionService.ts` |
| 22 | **Inventory Hold & Lock** | `inventory.engine` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | PostgreSQL row-lock & atomic hold | 100 concurrent race -> 1 winner | LIVE | **REAL** | `src/domains/inventory/InventoryEngine.ts` |
| 23 | **Booking State Machine** | `booking.lifecycle` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Strictly legal state transitions | Never creates synthetic PNR | LIVE | **REAL** | `src/domains/booking/state-machine.ts` |
| 24 | **Refund Domain Service** | `refund.domain` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Idempotent REF-101..107 invariants | Double-refund prevention | BETA | **BETA** | `src/domains/refund/RefundDomainService.ts` |
| 25 | **Official Tax Invoice** | `taxInvoice` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Official-format PDF/HTML renderer | Format compliant; no Moadian sub | BETA | **BETA** | `src/domains/finance/InvoiceDomainService.ts` |
| 26 | **KYC Identity vs Role** | `kyc.compliance` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Decoupled identity from admin role | Strict multi-currency limits | LIVE | **REAL** | `src/lib/kyc-payment-rules.ts` |
| 27 | **Passport OCR Validator** | `ocr.validator` | ✅ | — | ✅ | — | ✅ | ✅ | ✅ | ICAO Doc 9303 TD3 checksums | Country-specific passport check | LIVE | **REAL** | `src/lib/ocr-country-validator.ts` |
| 28 | **Country Reactivity** | `country.reactivity` | ✅ | — | ✅ | — | ✅ | ✅ | ✅ | CountryStore (7 regional countries) | Localized currency, gates, phone | LIVE | **REAL** | `src/stores/country-store.ts` |
| 29 | **FX Engine** | `fx.liveRates` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Central bank / tgju / static chain | Reference FX snapshot with TTL | SIMULATED | **SIMULATED** | `src/domains/currency/CurrencyService.ts` |
| 30 | **AI Travel Planner** | `ai.planner` | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | Multi-provider fallback router | Grounded suggestion-only | LIVE | **REAL** | `src/domains/ai/AiRouterService.ts` |
| 31 | **Loyalty Daily Streak** | `loyalty.streak` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | PostgreSQL atomic claim lock | Idempotent claim & rewards | LIVE | **REAL** | `src/domains/loyalty/LoyaltyStreakService.ts` |
| 32 | **Outbox & Crash Recovery**| `events.outbox` | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | Outbox pattern + DLQ second chance | Docker/k8s worker runtime | REAL (env) | **REAL** | `src/workers/worker-entrypoint.ts` |
| 33 | **System Observability** | `observability.hub` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Structured logging & error hub | Correlation IDs & PII redaction | LIVE | **REAL** | `src/lib/observability/` |
| 34 | **SMS OTP Authentication** | `auth.sms` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | SMSWBS live provider / HMAC-SHA256 | Real SMS OTP delivery | LIVE/BETA | **BETA/LIVE** | `src/auth.ts`, `src/actions/auth.ts` |
| 35 | **Email Authentication** | `auth.email` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | NextAuth magic link / credentials | Email validation & login | BETA | **BETA** | `src/auth.ts` |
| 36 | **Telegram Auth Gateway** | `auth.telegram` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Telegram login widget callback | Hash & auth_date verification | BETA | **BETA** | `src/app/api/auth/telegram/callback/` |
| 37 | **PWA Mobile Journey** | `mobile.pwa` | ✅ | — | ✅ | — | ✅ | ✅ | ✅ | Service worker, manifest, touch UX | 320px–768px touch-optimized | LIVE | **REAL** | `public/manifest.json`, `src/components/mobile/` |

---

## 4. Marketing Claim Reconciliation (§9)

| Marketing Claim | Location | Backend Reality | Reconciliation Action |
|---|---|---|---|
| **"استرداد آنی وجه"** (Instant Refund) | `TrustMarquee`, `FinancialSection`, `fa.json` | Online bank payout is in BETA; automatic refund is credited to internal wallet or processed manually via bank rail | **RECONCILED:** Reworded to "استرداد قانونی و مطمئن طبق قوانین کنسلی" (Guaranteed legal refund per cancellation rules) |
| **"صدور آنی بلیت و واچر رسمی هتل"** | `TrustMarquee`, `fa.json` | Flights use Parto live cache / seeded catalog; Hotels use luxury catalog | **RECONCILED:** Reworded to "دریافت واچر معتبر پس از تایید نهایی" (Receive verified voucher upon final confirmation) |
| **"پرداخت با تتر و کارت‌های بین‌المللی"** | `FinancialSection.tsx` | Visa/MC and USDT are COMING_SOON pending active international merchant contract | **RECONCILED:** Labeled with "به‌زودی" (Coming Soon) badges; primary live methods labeled as Wallet & eCardo |
| **"پشتیبانی ۲۴/۷ به ۵ زبان"** | `TrustMarquee.tsx` | Support ticketing and AI Assistant are live; human multilingual staff available during operational hours | **RECONCILED:** Verified as AI + Ticketing CRM operational; honest operational availability noted |
| **"فاکتور رسمی مالیاتی"** | Checkout & Invoice UI | Produces official format document, but NOT submitted to Moadian tax authority | **RECONCILED:** Labeled as "فاکتور با قالب رسمی" (Official Format Document) without false tax authority submission claims |

---

## 5. Concurrency, Invariants & Security Verification (§54–§56)

1. **Inventory 100-Concurrent Race (INV-001):**
   - 100 parallel hold requests against capacity = 1.
   - Result: Exactly 1 success, 99 rejected. Zero overselling.
   - Verified by `src/domains/inventory/inventory-concurrency.test.ts`.

2. **False Business State Prevention (§55):**
   - No `CONFIRMED` or `ISSUED` status without authoritative payment capture and supplier confirmation.
   - No synthetic PNR or ticket numbers generated by AI or client bypasses.
   - Vouchers for `FAILED` or `CANCELLED` bookings are rejected/invalidated.

3. **Tenant Isolation (§12):**
   - Tenant A operator cannot access Tenant B Customer360 profile.
   - Service asserts access at the database boundary (`assertCustomerAccess`).

4. **Financial Arithmetic (§39):**
   - Authoritative pricing, ledger, refund, and commission paths use `Money` / `Prisma.Decimal`.
   - Double-entry ledger invariant `SUM(DEBIT) === SUM(CREDIT)` strictly enforced within atomic transactions.
