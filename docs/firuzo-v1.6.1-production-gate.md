# Firuzo / iTrip — v1.6.1 Production Gate Report (2026-09-11)

> **Baseline verified:** local HEAD = `e817867` (v1.6.1), clean working tree at audit start; gates re-run on the baseline (typecheck ✅, lint ✅, **566/566 tests** ✅, build ✅).
> **This report covers the mandated P0-first remediation pass executed today on top of `e817867`.** Companion docs: `baseline/FEATURE_REALITY_MATRIX.md` (regenerated for v1.6.1), `cross-system-bug-matrix.md`, `firuzo-final-integration-audit.md`, `integration-system-map.md`.

---

## Executive Summary

v1.6.1 shipped the corporate/customer-360/tax-invoice/exception-remediation feature wave with a clean tree and green gates — but the P0 review found **fabricated external truth** in exactly the places the mission flags as automatic P0: the Exception Remediation service minted PNRs and flipped bookings to `CONFIRMED/ISSUED` with zero provider contact, the outbox stamped random PNRs on confirmed bookings, Customer 360 loaded arbitrary user IDs with no tenant enforcement, the tax invoice claimed Moadian/authority validity it does not have, and a placeholder merchant identity was hard-coded into invoices.

**All of these were fixed today, server-side, with regression tests.** One time-of-day-flaky test was also fixed. Gates after remediation: **typecheck ✅ · lint ✅ · 585/585 tests ✅ · production build ✅** (other gates below).

The platform is NOT yet the 9.5 target: the remaining distance is P1 scope (corporate policy/approval engine, unified-cart UI, live supplier/PSP integration), not hidden fabrication.

## Version / Commit Verification (§4)

- `package.json` 1.6.1 · release commit `e817867` · `/api/version` default updated `1.5.9/b800f5e` → `1.6.1/e817867` (`src/lib/version.ts`)
- README header v1.5.9 → **v1.6.1**, Vitest badge 409 → **585**
- Reality matrix regenerated for v1.6.1 (`docs/baseline/FEATURE_REALITY_MATRIX.md`); v1.5.9 matrix archived as `FEATURE_REALITY_MATRIX_v1.5.9_historical.md`
- Sweep of src/messages/public: no remaining stale release identities

## P0 Findings and Fixes (every item: evidence → fix → test)

| # | Rule violated | Finding (before) | Fix (after) | Test |
|---|---|---|---|---|
| P0-1 | §76-1/7 fake PNR/ISSUED/CONFIRMED | `ExceptionRemediationService.retryTicketing` fabricated `FZ-…` PNR and set `CONFIRMED/ISSUED`; `pollSupplierPnr` fabricated `SUP-…` "confirmed PNR"; both could overwrite even CANCELLED bookings | Ticketing retry only **queues** (`ticketStatus: ISSUING`), exception → `IN_PROGRESS` with audit; poll fails closed (no adapter) and never mutates the booking; lifecycle never advanced; idempotent repeats | `exception-remediation-safety.test.ts` (6), `exception-remediation.test.ts` rewritten (3) |
| P0-1b | §76-1 fake PNR in main funnel | `OutboxConsumer` stamped random `FZ-…` PNRs (`generatePnr()`) on every confirmed booking | Removed; `externalPnr` stays empty until a real provider confirms; honest audit event `BOOKING_CONFIRMED_PROCESSED` | covered by suites above + events suites |
| P0-2 | §76-2 cross-tenant Customer 360 | `getCustomer360(id)` loaded **any** user with no caller enforcement; org operators could read the whole platform; `callerCtx` only toggled PII masking | `assertCustomerAccess()` inside the service: self / platform-staff (`booking:view:all` **without** org scope) / same-org membership; everyone else throws `Customer360AccessDeniedError`; page maps denial → 404 (no existence leak); notes action uses the same guard; every real-operator access audited (`CUSTOMER_360_VIEWED`) | `customer-360-tenant-isolation.test.ts` — the full §11 matrix (8) + existing suite updated (4) |
| P0-3 | §76-3/4 unverified financial state | `immediateWalletRefund` posted refunds directly to the ledger with full `totalAmount`, no eligibility, no REF-103 cap, per-click `Date.now()` idempotency key (double refund possible); `syncPaymentStatus` flipped `paymentStatus: CAPTURED` with zero evidence | Refund routed through `RefundDomainService.processRefund` (REF-101..107, inventory release, deterministic key `remediation_full_refund_<exceptionId>`); requires `paymentStatus === 'CAPTURED'` or a webhook-verified `SUCCESS` Payment; sync now **evidence-gated** (aligns only when a SUCCESS payment exists; never jumps booking lifecycle) | both remediation suites (refusal without evidence, capped full refund, idempotent replay) |
| P0-4 | §76-8 false regulatory claim | Invoice document claimed "صورتحساب رسمی معتبر (ماده ۱۶۹ م.م)", "منطبق با ماده ۱۹ … و ماده ۱۶۹ م.م", and "…وفق مقررات … مؤدیان صادر گردیده" with no authority integration | Copy corrected to **official-FORMAT, not authority-submitted** wording; `fiscalSerial` relabeled "شناسه رهگیری داخلی" and documented as local-only (`TX-…` ≠ Moadian serial); capability `taxInvoice` = BETA with explicit no-submission description | manual UI verification + registry tests |
| P0-5 | §76-5 fake merchant identity | `STATUTORY_SELLER_INFO` hard-coded plausible legal identity (national ID, economic code) rendered on invoices | `getStatutorySellerInfo()`: production requires `INVOICE_SELLER_LEGAL_NAME/NATIONAL_ID/ECONOMIC_CODE` (fail-closed throw); demo defaults only outside production | `invoice-domain.test.ts` seller-identity suite (3) |
| P0-6 | §76-10 UI > capability | Capability registry missed the new v1.6.1 features (UI/self-derived claims) | Registry extended: `customer360`, `corporate`, `taxInvoice`, `travelHandbook`, `dutyOfCare` with honest statuses + evidence paths | `capabilities.test.ts` |
| — | flaky gate | `trip-intelligence.test.ts` mixed UTC date (`toISOString`) with local hours → failed near local midnight | Test builds local date/time components (service parses local) | suite green (was red at 22:20 local) |

**Merchant configuration safety (§76-5/§50) re-verified unchanged on v1.6.1:** ShetabPspAdapter/CardToCard fail-closed in production without credentials; no default card numbers in prod paths; eCardo IPN HMAC = sole capture authority.

## Repository vs Live (§8)

- Live `vercel.app/api/version` reported `a6d8270` (v1.6.0) earlier today; local baseline is `e817867` + today's remediation. **Live is one release + one remediation round behind** — it does NOT yet contain the customer360/corporate/tax-invoice surfaces or today's truth fixes. Deploy required to align (Docker/k8s recommended so the worker runtime runs; Vercel lacks outbox/saga/hold sweeps).

## Remaining Blockers to the 9.5 Target (P1 — not fabrication, scope)

1. **Corporate policy engine + approval workflow** (§26/27/28): org/budget/policy models and server-side evaluation do not exist yet; Corporate hub is BETA by design and honestly labeled.
2. **Unified cart UI** (§32/33): backend is atomic and server-priced; no client surface — Journey D remains impossible for users.
3. **Live supplier integration** (§51): flights/hotels are seeded-catalog MOCK; booking confirmation for those verticals is mock-supply (honestly labeled), tours are REAL.
4. **Live PSP credentials** (§50): Shetab/eCardo code is production-grade but cannot capture real money until merchant credentials exist (fail-closed).
5. **Worker on serverless** (§56): Vercel deployment has no outbox/saga/hold worker — notifications and PNR-stamping-equivalent events lag on the live demo.
6. **Corporate/ERP mobile completion** (§30/31): desktop-first admin surfaces; mobile pass exists for B2C journeys (a11y gate + AGENTS.md compliance verified earlier today), not for Corporate Hub dashboards.

## Production Gate (§75): **FAIL for the 9.5 target — NOT a fabrication failure, a scope failure**

- P0 checklist (§76): **all 10 rules now hold** — no fabricated ticketing/PNR/payment/authority/FX state, no cross-tenant Customer 360 (proven by negative tests), no unverified financial mutation in remediation paths, no fake merchant identity, no UI claim exceeding the registry.
- One unresolved P0? **None found** in the v1.6.1 + remediation tree as of this report.
- Gate verdict rationale: §73 Definition of Done for the 9.5 target requires the P1 scope above (policy/approval, cart UI, live providers) which is product work, not patching. Current honest score: **8.4/10** (was 7.5 pre-remediation).

## Scorecard (§74, audited)

Architecture 8.5 · Database 9 · Identity 9 · **Tenant Isolation 9.5 (matrix-proven)** · **Customer 360 9 (post-fix)** · Corporate 7.5 (no policy/approval) · Traveler Mgmt 8.5 · Cart 7 (backend-only) · Manifest 8.5 · Booking 8.5 · Inventory 9 · Payments 8 (fail-closed, no creds) · Suppliers 6.5 (mock) · FX 7.5 (simulated rates) · Refund 8.5 · Accounting 9 · Settlement 8.5 · **Tax Invoice 9 (truth restored)** · ERP 8.5 · **Exception Remediation 9.5 (post-fix)** · AI 8.5 · Loyalty 9 · Security 9 · Observability 8.5 · Testing 9 (585, incl. negative isolation tests) · DevOps 8.5 · UI/UX 9 · Mobile 8.5 (B2C strong, corporate dashboards pending) · Accessibility 9 · Performance 8 · i18n 9.5 · Product Truth 9 (registry-complete) · Documentation 9

**Weighted: ≈ 8.4/10 — YELLOW-GREEN.** Next lever to 9.5: corporate policy/approval engine + cart UI + live supplier/PSP onboarding.
