# iTRIP / Firuzo Platform — Feature Reality Matrix (v1.6.1)

**Version:** v1.6.1
**Commit:** e817867 (`e817867` — feat(release): v1.6.1 enterprise corporate hub, customer 360, official invoices, traveler profiles, exception remediation and 566 verified tests)
**Branch:** local release baseline (do not read `main` as primary)
**Audit Date:** 2026-09-11
**Authoritative Baseline:** v1.6.1 / `e817867`
**Supersedes:** `FEATURE_REALITY_MATRIX_v1.5.9_historical.md` (kept for history only)

> This document is the single source of truth for feature reality. Every status is evidence-backed
> (code path + test) as of the v1.6.1 tree **plus the 2026-09-11 production-truth remediation round**
> (uncommitted at matrix time): Exception Remediation hardening, Customer 360 tenant isolation,
> Tax-Invoice truth, and the capability-registry expansion. Historical v1.5.9/v1.6.0 matrices are
> obsolete and must not be quoted as current.

---

## 1. System Baseline

- **Stack:** Next.js 16 App Router · React 19 · TypeScript 5 · Tailwind v4 · Prisma 5 / PostgreSQL 16 · NextAuth v5-beta · next-intl (fa/en/ar/zh/ru)
- **Prisma models:** 67 · **Migrations:** 23+ (schema-drift checked in CI)
- **Unit/integration tests:** 91 files / **585 tests** (566 at release commit + 19 added by the 2026-09-11 P0 remediation), all green locally
- **i18n:** 846 keys × 5 locales, 100% parity (`npm run gate:i18n`)
- **A11y:** WCAG 2.2 AA baseline harness green (`npm run gate:a11y`)
- **CI:** gitleaks · lint · typecheck · migrate deploy+seed · schema drift · unit · production build · **CI-012** (build must fail with DEMO_MODE=true) · E2E golden journeys (desktop+mobile) · inventory concurrency · worker/saga crash recovery
- **Capability Registry:** `src/lib/capabilities/index.ts` — now covers payment.*, supplier.*, fx.*, auth.*, ai.*, refund.*, wallet.*, loyalty.streak, **customer360, corporate, taxInvoice, travelHandbook, dutyOfCare**

---

## 2. Feature Reality Table

Status legend: **REAL** (verified, no simulation) · **BETA** (real logic, external leg pending) · **SIMULATED** · **MOCK** · **COMING_SOON** · **DISABLED**.

| # | Capability | Registry key | Backend | DB | API | Frontend | Runtime | Tests | Production integration | Live | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Shetab PSP | `payment.shetab` | ✅ fail-closed | ✅ | ✅ webhook HMAC | ✅ | fail-closed w/o creds | ✅ payment-safety | 🔒 terminal credentials pending | same | **BETA** | `src/domains/payments/adapters/ShetabPspAdapter.ts` |
| 2 | eCardo IPN | (payment.shetab adapter set) | ✅ real HTTP + HMAC capture | ✅ | ✅ webhook + UX callback | ✅ | fail-closed w/o creds | ✅ ecardo-gateway | 🔒 merchant credentials pending | same | **BETA** | `src/domains/payments/adapters/EcardoGatewayAdapter.ts` |
| 3 | Card-to-Card | `payment.cardToCard` | ✅ PENDING_VERIFICATION flow | ✅ | ✅ receipt upload | ✅ | fail-closed w/o merchant config | ✅ card-to-card | 🔒 manual back-office verify | same | **BETA** | `src/domains/payments/adapters/CardToCardPaymentAdapter.ts` |
| 4 | Visa/MC, USDT | `payment.visa/mastercard/usdt` | schema-ready | ✅ | — | 🔒 badge | — | — | ⛔ not integrated | same | **COMING_SOON** | `src/domains/payments/payment-methods.ts` |
| 5 | Ledger wallet | `payment.wallet` | ✅ double-entry, row-locked debits, **FX under-lock guard + spread revenue (2026-09-11)** | ✅ | ✅ actions | ✅ | ✅ | ✅ fx-exchange-guard | ✅ real (internal) | ✅ | **REAL** | `src/domains/ledger/GeneralLedgerService.ts` |
| 6 | Flight supply | `supplier.flight` | ✅ pipeline/pricing/booking | ✅ catalog | ✅ `/api/flights/search` | ✅ | seeded catalog | ✅ | ⛔ no live GDS | same | **MOCK** | `src/domains/supplier/flight-supplier-port.ts` |
| 7 | Hotel supply | `supplier.hotel` | ✅ | ✅ | ✅ | ✅ | seeded catalog | ✅ | ⛔ no bedbank | same | **MOCK** | `src/domains/supplier/hotel-supplier-port.ts` |
| 8 | Tour booking | `supplier.tour` | ✅ inventory-backed | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **REAL** | `src/domains/inventory/InventoryEngine.ts` |
| 9 | FX | `fx.simulated` | ✅ Decimal + snapshot; static rate table | ✅ persisted rates | — | ✅ | static rates | ✅ | ⛔ no live feed | same | **SIMULATED** | `src/domains/ledger/currency-service.ts` |
| 10 | Booking lifecycle | — | ✅ state machine + saga; **NO fabricated PNR anywhere (2026-09-11: AutoBuy + outbox stamping removed)** | ✅ | ✅ | ✅ | ✅ | ✅ full-journey | supplier leg absent (fail-honest) | same | **REAL** | `src/domains/booking/state-machine.ts`, `saga/BookingSagaCoordinator.ts` |
| 11 | Inventory & holds | — | ✅ atomic, serializable, TTL | ✅ | — | ✅ soft-lock | ✅ | ✅ 100-concurrent | ✅ | ✅ | **REAL** | `src/domains/inventory/InventoryEngine.ts` |
| 12 | Refund | `refund.online/manual` | ✅ REF-101..107 invariants; **exception remediation now routed through it (2026-09-11)** | ✅ | ✅ | ✅ | bank payout fail-closed | ✅ | 🔒 bank rail pending | same | **BETA** | `src/domains/refund/RefundDomainService.ts` |
| 13 | Exception remediation | — | ✅ **HARDENED 2026-09-11: no fabricated PNR/ISSUED/CONFIRMED; refund via domain service; payment sync evidence-gated; deterministic idempotency; refund permission = `booking:refund:approve`** | ✅ | ✅ actions | ✅ Exception Center | ✅ | ✅ **exception-remediation-safety (6 new)** | internal only | same | **BETA** | `src/domains/erp/ExceptionRemediationService.ts` |
| 14 | Customer 360 | `customer360` | ✅ **TENANT-ISOLATED 2026-09-11: service-level enforcement (self / platform-staff / same-org), denial tested** | ✅ | ✅ actions + audit log | ✅ workspace | ✅ | ✅ **isolation matrix (8 new)** | staff-facing only | same | **BETA** | `src/domains/identity/Customer360Service.ts` |
| 15 | Corporate hub | `corporate` | ✅ org/branch/membership + invoicing; ⛔ policy engine & approval workflow not built | ✅ | ✅ actions | ✅ | ✅ | ✅ organization-service | internal | same | **BETA** | `src/domains/identity/OrganizationService.ts` |
| 16 | Traveler profiles | — | ✅ owned CRUD + documents (PII encrypted) | ✅ | ✅ actions | ✅ | ✅ | ✅ traveler-profile | ✅ | ✅ | **REAL** | `src/domains/identity/TravelerProfileService.ts` |
| 17 | Tax invoice | `taxInvoice` | ✅ Decimal totals; **TRUTH 2026-09-11: no Moadian/authority claims; seller identity env-configured, fail-closed in production; fiscalSerial documented as internal reference** | ✅ | ✅ actions | ✅ document UI | ✅ | ✅ invoice-domain (+3 seller) | ⛔ no authority integration | same | **BETA (OFFICIAL_FORMAT only)** | `src/domains/finance/InvoiceDomainService.ts` |
| 18 | Traveler manifest / handbook / duty of care | `travelHandbook`, `dutyOfCare` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **BETA** | `src/components/plan/DigitalTravelHandbook.tsx`, `src/lib/duty-of-care.ts` |
| 19 | OTP auth | `auth.sms` | ✅ hashed OTP, TTL/attempts/flood | ✅ | ✅ NextAuth v5 | ✅ | SMSWBS live w/ creds, dev console fallback | ✅ | ✅ w/ provider creds | ✅ | **BETA/LIVE** | `src/auth.ts` |
| 20 | AI router/planner | `ai.planner/router` | ✅ failover + cooldowns; injection guard; tool authorization; no hallucinated inventory | — | ✅ `/api/plan/refine` | ✅ | ✅ keyed providers | ✅ ai-security-guard | ✅ | ✅ | **REAL (suggestions only)** | `src/domains/ai/AiRouterService.ts` |
| 21 | Loyalty streak | `loyalty.streak` | ✅ server-authoritative, idempotent, ledger-backed | ✅ | ✅ API | ✅ | ✅ | ✅ | ✅ | ✅ | **REAL** | `src/domains/loyalty/LoyaltyStreakService.ts` |
| 22 | Outbox / workers | — | ✅ DLQ, poison isolation, crash recovery; worker runtime in Docker/k8s | ✅ | ✅ cron (auto-buy) | — | ⚠️ no worker on Vercel | ✅ worker-crash-recovery | Docker/k8s ✅ · Vercel ⛔ | ⚠️ | **REAL (runtime-dependent)** | `src/workers/worker-entrypoint.ts` |
| 23 | Unified cart | — | ✅ atomic multi-item holds; **server-side pricing enforced (BUG-001 fix)**; ⛔ no client UI yet | ✅ | ✅ actions | ⛔ | backend only | ✅ phase3 + pricing tests | n/a | same | **BETA (backend-complete)** | `src/domains/booking/UnifiedCartService.ts` |
| 24 | Observability | — | ✅ correlation ids, structured logs, PII masking, **Customer 360 access audit (2026-09-11)** | ✅ | ✅ health endpoints | — | ✅ | ✅ | ✅ | ✅ | **REAL** | `src/lib/observability/` |

---

## 3. Production Claim Audit (§71)

| Feature | UI claim | Backend state | External dependency | Live state | Reality | Action |
|---|---|---|---|---|---|---|
| Payments (Shetab/eCardo) | "پرداخت آنلاین" | fail-closed adapters, HMAC IPN | merchant credentials | no live capture | **BETA** — code real, creds pending | obtain PSP contract |
| Card-to-card | "کارت به کارت" | PENDING_VERIFICATION, back-office approve | manual finance | manual | **BETA** | none (honest) |
| Flights/Hotels | search & booking UI | seeded catalog | GDS/bedbank | mock data | **MOCK** supply, REAL pipeline | wire supplier or label COMING_SOON |
| Tours | bookable | inventory-backed | own supply | live | **REAL** | — |
| Wallet/FX | multi-currency | ledger real; static FX rates | central-bank feed | simulated rates | **REAL wallet / SIMULATED FX** | live FX feed later |
| Refunds | "استرداد" | domain invariants real; payout simulated | bank rail | wallet-credit only | **BETA** | bank payout integration |
| Tax invoice | "فاکتور رسمی" | official-FORMAT document | Moadian | NOT authority-submitted (labeled) | **BETA** | none until integration (claims fixed 2026-09-11) |
| Customer 360 | staff workspace | tenant-isolated service | — | staff-only | **BETA** | customer-facing surface later |
| Corporate | "سفر سازمانی" | org/membership/invoicing | — | live core | **BETA — no policy/approval engine** | build policy+approval (P1) |
| AI | "دستیار هوشمند" | grounded suggestions only | provider APIs | live | **REAL (suggestion-only)** | — |

## 4. Repository vs Live (§8)

| Item | Local baseline (v1.6.1) | Live (`vercel.app`) |
|---|---|---|
| Commit | `e817867` + 2026-09-11 remediation (uncommitted) | `a6d8270` (v1.6.0) at audit time |
| Consequence | — | Live runs **two releases behind** and lacks: customer360/corporate/tax-invoice surfaces, exception remediation hardening, tenant isolation, FX/booking fixes |
| Deployment | Vercel + Docker/k8s manifests | Vercel (no worker; single auto-buy cron) |

**Required action:** deploy v1.6.1 (+ remediation) to align live with the release baseline; keep Docker/k8s as the production path where the worker runtime exists.

## 5. Test Metrics (§5/§72 — from actual runs, 2026-09-11)

- **Unit/integration (`npm run test:unit`):** 91 files / **585 tests** — 566 at `e817867` plus 19 added by the remediation round; **0 failed, 0 skipped, 0 known-flaky** (one time-of-day-flaky test fixed: `trip-intelligence` mixed UTC date with local time).
- Distribution by concern (approx.): finance/ledger ~60 · booking/cart ~70 · payments ~70 · identity/tenant isolation ~45 · ERP/ops ~50 · AI ~20 · events/recovery ~35 · inventory/concurrency ~25 · security primitives ~30 · i18n/a11y/content/UI utilities rest.
- E2E: golden-journeys + crawler/i18n/responsive specs run in CI (chromium + mobile-chromium).
- Concurrency & crash-recovery suites run as dedicated CI jobs against real PostgreSQL.
