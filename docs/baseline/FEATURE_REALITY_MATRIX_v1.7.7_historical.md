# iTRIP / Firuzo Platform — Feature Reality Matrix (v1.7.7) [HISTORICAL]

**Version:** v1.7.7  
**Commit:** `fddee5e` / `d525eb1` (`d525eb1` — feat(admin): display travel tours in ERP with automatic catalog sync, sidebar link, and tab preloading)  
**Branch:** main (v1.7.7 release baseline)  
**Audit Date:** 2026-09-14  
**Authoritative Baseline:** v1.7.7 / `fddee5e` (`d525eb1`)  
**Status:** ARCHIVED / HISTORICAL — Superseded by `FEATURE_REALITY_MATRIX.md` (v1.7.9 / `c3e6074`)

---

## 1. System Baseline

- **Stack:** Next.js 16 App Router · React 19 · TypeScript 5 · Tailwind CSS v4 · Prisma 5 / PostgreSQL 16 Canonical · NextAuth v5-beta · next-intl (fa, en, ar, zh, ru)
- **Database & Prisma models:** 67 models · 28 migrations (strictly PostgreSQL, no SQLite drift)
- **Unit/integration tests:** 121 test files / **772 tests** (100% passing across domain, security, and UI suites)
- **i18n:** 100% key parity across 5 languages (`messages/{fa,en,ar,zh,ru}.json`) via `npm run gate:i18n`
- **A11y:** WCAG 2.2 AA compliant across all primary funnels via `npm run gate:a11y`
- **UI/UX Lint:** Zero violations scanned across 543 files via `node scripts/uiux-audit.mjs src`
- **TypeScript:** Zero type errors (`tsc --noEmit` clean)
- **ESLint:** Zero errors (`eslint` clean)
- **Live Deployment:** Production at `https://itrip-platform.vercel.app/` running verified version `1.7.7` on commit `d525eb1ad2aa655d9bc39ed62d48d71a45bcf96d` (probed live via `/api/version`, `/api/health/live`, `/api/health/ready`)

---

## 2. Feature Reality Table

Status legend: **REAL** (verified, no simulation) · **BETA** (real logic, external leg pending) · **SIMULATED** · **MOCK** · **COMING_SOON** · **DISABLED**.

| # | Capability | Registry key | Backend | DB | API | Frontend | Runtime | Tests | Production integration | Live | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Shetab PSP | `payment.shetab` | ✅ fail-closed, HMAC verify | ✅ | ✅ webhook HMAC | ✅ | fail-closed w/o creds | ✅ payment-safety | 🔒 terminal credentials pending | same | **BETA** | `src/domains/payments/adapters/ShetabPspAdapter.ts` |
| 2 | eCardo IPN | `payment.ecardo` | ✅ real HTTP + HMAC capture | ✅ | ✅ webhook + UX callback | ✅ | production / demo switchable | ✅ ecardo-gateway | 🔒 merchant credentials live-ready | same | **REAL/BETA** | `src/domains/payments/adapters/EcardoGatewayAdapter.ts` |
| 3 | Card-to-Card | `payment.cardToCard` | ✅ PENDING_VERIFICATION flow | ✅ | ✅ receipt upload | ✅ | manual review | ✅ card-to-card | 🔒 manual back-office verify | same | **BETA** | `src/domains/payments/adapters/CardToCardPaymentAdapter.ts` |
| 4 | Visa/MC, USDT | `payment.visa/mastercard/usdt` | ✅ via eCardo multi-currency | ✅ | ✅ | ✅ | currency converted | ✅ | 🔒 eCardo merchant rail | same | **BETA (eCardo)** | `src/components/checkout/PaymentGatewaySelector.tsx` |
| 5 | Ledger wallet | `payment.wallet` | ✅ double-entry, row-locked debits, FX under-lock guard | ✅ | ✅ actions | ✅ | ✅ | ✅ fx-exchange-guard | ✅ real (internal ledger) | ✅ | **REAL** | `src/domains/ledger/GeneralLedgerService.ts` |
| 6 | Flight supply | `supplier.flight` | ✅ pipeline/pricing/booking | ✅ catalog | ✅ `/api/flights/search` | ✅ | seeded catalog | ✅ | ⚡ LIVE via Parto cache (stale-while-revalidate) | same | **BETA (live cache)** | `src/services/flight-cache-service.ts` |
| 7 | Hotel supply | `supplier.hotel` | ✅ | ✅ | ✅ | ✅ | seeded catalog | ✅ | ⛔ bedbank contract pending | same | **MOCK** | `src/domains/supplier/hotel-supplier-port.ts` |
| 8 | Tour booking | `supplier.tour` | ✅ inventory-backed, multi-currency | ✅ | ✅ `/api/tours` | ✅ | ✅ | ✅ tours-service | ✅ direct inventory | ✅ | **REAL** | `src/services/tours-service.ts`, `src/domains/inventory/InventoryEngine.ts` |
| 9 | Multi-Currency Tours | `tours.multicurrency` | ✅ source & customer currency | ✅ currency column | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **REAL** | `src/services/tours-service.ts` |
| 10 | Unified Cart UI | `cart.unified` | ✅ server-authoritative pricing | ✅ | ✅ actions | ✅ UnifiedCartDrawer | ✅ client store + drawer | ✅ unified-cart-drawer | ✅ | ✅ | **REAL** | `src/components/cart/UnifiedCartDrawer.tsx`, `src/domains/booking/UnifiedCartService.ts` |
| 11 | KYC Role vs Identity | `kyc.compliance` | ✅ role decoupled from KYC Level 2 | ✅ | ✅ | ✅ KYC status bar | ✅ | ✅ kyc-payment-rules | ✅ staff exemption policy gated | same | **REAL** | `src/lib/kyc-payment-rules.ts`, `src/actions/auth.ts` |
| 12 | KYC Multi-Currency Limits | `kyc.limits` | ✅ multi-currency limit evaluation | — | — | ✅ | ✅ USD/EUR/AED/CNY/TRY | ✅ kyc-payment-rules | ✅ | same | **REAL** | `src/lib/kyc-payment-rules.ts` |
| 13 | Passport OCR Validator | `ocr.validator` | ✅ ICAO Doc 9303 TD3 7-3-1 checks | — | — | ✅ PassportScanModal | ✅ country-specific rules | ✅ ocr-country-validator | ✅ | same | **REAL** | `src/lib/ocr-country-validator.ts` |
| 14 | Hierarchical Cross-Sell | `commerce.crossSell` | ✅ hotel <-> flight smart bundle | — | — | ✅ HierarchicalCrossSell | ✅ | ✅ hierarchical-cross-sell | ✅ | same | **REAL** | `src/components/checkout/HierarchicalCrossSell.tsx` |
| 15 | Route Difficulty & Rules | `travel.advisory` | ✅ rules, baggage, difficulty, refund | — | — | ✅ TravelRulesAdvisoryCard | ✅ | ✅ | ✅ | same | **REAL** | `src/components/travel/TravelRulesAdvisoryCard.tsx` |
| 16 | Multi-Destination Comparator | `destinations.compare` | ✅ 2 to 4 destinations matrix | — | — | ✅ DestinationComparator | ✅ | ✅ trips-components | ✅ | same | **REAL** | `src/components/destinations/DestinationComparator.tsx` |
| 17 | FX Engine | `fx.liveRates` | ✅ Decimal + snapshot, tgju/fxapi chain | ✅ persisted | — | ✅ | static fallback on failure | ✅ live-fx-rate-provider | ✅ live-capable | same | **BETA (live-gated)** | `src/domains/currency/CurrencyService.ts` |
| 18 | Booking lifecycle | — | ✅ state machine + saga; NO fake PNR | ✅ | ✅ | ✅ | ✅ | ✅ full-journey | fail-honest without supplier | same | **REAL** | `src/domains/booking/state-machine.ts`, `saga/BookingSagaCoordinator.ts` |
| 19 | Inventory & holds | — | ✅ atomic, serializable, TTL | ✅ | — | ✅ soft-lock | ✅ | ✅ 100-concurrent | ✅ | ✅ | **REAL** | `src/domains/inventory/InventoryEngine.ts` |
| 20 | Refund engine | `refund.online/manual` | ✅ REF-101..107 invariants, idempotent | ✅ | ✅ | ✅ | bank payout fail-closed | ✅ refund-domain | 🔒 bank rail pending | same | **BETA** | `src/domains/refund/RefundDomainService.ts` |
| 21 | Exception remediation | — | ✅ no fake PNR/ISSUED/CONFIRMED | ✅ | ✅ actions | ✅ Exception Center | ✅ | ✅ exception-remediation-safety | internal only | same | **BETA** | `src/domains/erp/ExceptionRemediationService.ts` |
| 22 | Customer 360 | `customer360` | ✅ tenant-isolated service (self/staff/org) | ✅ | ✅ actions + audit | ✅ workspace | ✅ | ✅ customer-360-tenant-isolation | staff-facing only | same | **BETA** | `src/domains/identity/Customer360Service.ts` |
| 23 | Corporate hub | `corporate` | ✅ org/branch/membership/invoicing | ✅ | ✅ actions | ✅ corporate UI | ✅ | ✅ organization-service | internal | same | **BETA** | `src/domains/identity/OrganizationService.ts` |
| 24 | Traveler profiles | — | ✅ owned CRUD + documents (AES-256 PII) | ✅ | ✅ actions | ✅ | ✅ | ✅ traveler-profile | ✅ | ✅ | **REAL** | `src/domains/identity/TravelerProfileService.ts` |
| 25 | Tax invoice | `taxInvoice` | ✅ Decimal totals, official format | ✅ | ✅ actions | ✅ document UI | ✅ | ✅ invoice-domain | ⛔ no Moadian submission | same | **BETA (OFFICIAL_FORMAT only)** | `src/domains/finance/InvoiceDomainService.ts` |
| 26 | OTP auth | `auth.sms` | ✅ hashed OTP HMAC-SHA256, rate-limited | ✅ | ✅ NextAuth v5 | ✅ | SMSWBS w/ creds, console fallback | ✅ otp-abuse | ✅ w/ provider creds | ✅ | **BETA/LIVE** | `src/auth.ts` |
| 27 | AI router & planner | `ai.planner/router` | ✅ failover + cooldowns, injection guard | — | ✅ `/api/plan/refine` | ✅ سفرساز هوشمند | ✅ keyed providers | ✅ ai-security-guard | ✅ | ✅ | **REAL (suggestions only)** | `src/domains/ai/AiRouterService.ts` |
| 28 | Loyalty streak | `loyalty.streak` | ✅ server-authoritative, idempotent | ✅ | ✅ API | ✅ | ✅ | ✅ | ✅ | ✅ | **REAL** | `src/domains/loyalty/LoyaltyStreakService.ts` |
| 29 | Outbox & workers | — | ✅ DLQ, poison isolation, crash recovery | ✅ | ✅ cron | — | worker runtime in Docker/k8s | ✅ worker-crash-recovery | Docker/k8s ✅ · Vercel ⛔ | ⚠️ | **REAL (runtime-dependent)** | `src/workers/worker-entrypoint.ts` |
| 30 | Observability | — | ✅ correlation ids, structured logs, PII masking | ✅ | ✅ health endpoints | — | ✅ | ✅ business-metrics | ✅ | ✅ | **REAL** | `src/lib/observability/` |
