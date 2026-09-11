# Firuzo / iTrip — Final End-to-End Integration & Production Audit

> **Audit basis:** local working tree @ HEAD `a6d8270` (v1.6.0) **plus 47 modified + 34 new uncommitted files** (parallel workstream).
> **Live reconciliation:** `https://itrip-platform.vercel.app/api/version` → v1.6.0 @ `a6d8270` — identical to local HEAD; the uncommitted delta exists **only locally**.
> **Gates re-run this audit (all green):** typecheck ✅ · eslint (0 warnings) ✅ · **unit 559/559 in 87 files** ✅ · production build ✅ · gate:i18n (846 keys × 5 locales) ✅ · gate:a11y ✅
> **Evidence docs:** `integration-system-map.md` · `integration-matrix.md` · `cross-system-bug-matrix.md` (18 bugs, each with file:line)

---

## Executive Summary

The platform is a **genuinely architected system, not a façade**: server-authoritative pricing, a 13-state booking machine with a serializable saga, a double-entry ledger with row-locked debits, HMAC-verified fail-closed payment webhooks, a transactional outbox with DLQ, relational RBAC, and a security posture (CSRF, IDOR guards, fail-fast AUTH_SECRET, CI-012 demo gate, gitleaks) that survives adversarial review. 559 unit tests, concurrency stress suites, and crash-recovery suites run in CI.

It is **not yet a unified revenue system**: flights/hotels are served from a seeded catalog (no live supplier), Shetab card payment can never complete in production (no PSP HTTP exists — only eCardo is real, and it lacks credentials), the unified multi-product cart is **backend-only and unreachable from the UI**, and the uncommitted local workstream (CRM/travelers/organizations/invoices/AI-guard) is high quality but undeployed.

**Verdict: PARTIALLY integrated — YELLOW for production readiness.**

---

## Is the Platform Truly Integrated? — **PARTIALLY**

- **YES** for: Discovery → Search → Offer → Checkout → Server reprice → Wallet payment → Saga confirm → Ledger → Invoice → TravelFile → Outbox notifications → My Trips (the single-item funnel is end-to-end real, test-protected, and ownership-checked).
- **PARTIALLY** for: Payment (fail-closed code, no live PSP), Refund (invariants real, payout simulated), B2B (tenant models + scoping landed this sprint, early), Cancellation (half-implemented state chain), Ancillaries (eSIM/visa/transfer vouchers simulated).
- **NO** for: Journey D (unified multi-product cart from the UI), live flight/hotel supply, auto-issued tickets (fake PNR path in AutoBuy).

## Top Integration Problems (ranked)

1. **BUG-001 (P0)** Multi-item cart action trusts client `unitPrice` — price-authority violation on a publicly invokable action.
2. **BUG-002 (P0)** Wallet FX exchange TOCTOU — balance checked outside the posting tx; concurrent exchanges can overdraw.
3. **BUG-017 (P1)** Flight/hotel supply = seeded catalog; `CONFIRMING_SUPPLIER` state unreachable.
4. **BUG-004 (P1)** Shetab adapters fabricate Shaparak tokens locally; no outbound HTTP; card checkout dead-ends in production.
5. **BUG-005 (P1)** `callbackUrl` targets `/api/payments/callback` — route does not exist (404 after gateway return).
6. **BUG-003 (P1)** No idempotency on draft creation (double-submit duplicates drafts).
7. **BUG-006 (P1)** AutoBuy fabricates PNR `FZ-…`/ticket `065-…` via the "simulated supplier confirmation" step.
8. **BUG-007 (P1)** CityPass/SnappRecharge widgets fabricate client-side "confirmed" bookings; dead client wallet-mutation code in `booking-store.ts`.
9. **BUG-008 (P1)** Unified cart has zero UI callers — Journey D impossible for real users.
10. **BUG-009 (P2)** `/payment-status` renders whatever `?status=` says; no server verification.
11. **BUG-010 (P2)** Refunds default to wallet credit even for gateway-paid bookings.
12. **BUG-011 (P2)** Webhook `eventId` fallback `evt_${Date.now()}` defeats per-event dedupe (per-booking capture is the net).
13. **BUG-012 (P2)** FX spread computed but never posted to a revenue account.
14. **BUG-013 (P2)** `UnifiedCartService` uses JS numbers/`Math.round` + duplicated 10% margin (Money kernel bypass).
15. **BUG-014 (P2)** Cancellation chain `CANCEL_REQUESTED→CANCELLING→CANCELLED` never executed; penalties never applied outside admin-default-0.
16. **BUG-015 (P2)** PAYMENT_FLOW.md / BOOKING_LIFECYCLE.md contradict the code (fake "authenticated banking endpoints", wrong state table, wrong webhook behavior).
17. **BUG-016 (P2)** Vercel deployment lacks the worker (outbox/saga/hold sweeps) — notifications and PNR stamping delayed on the live demo.
18. **BUG-018 (P2)** Ancillary carrier webhooks simulated.
19. **(P3)** Two saga coordinators coexist (`saga-orchestrator.ts` inline vs `saga/BookingSagaCoordinator.ts` step-persisted) — consolidation debt.
20. **(P3)** Docs-only capability registry drift: FEATURE_REALITY_MATRIX references `src/app/api/planner/generate/route.ts` which has moved to `/api/plan/refine`.

## Critical Broken Flows

- **Journey B/C in production with `gateway_shetab`**: payment → fake token → PENDING forever → saga rollback (fail-closed, but the flow cannot complete).
- **Journey D (multi-product)**: cannot start from the UI (BUG-008), and if driven by direct action calls, prices are client-authoritative (BUG-001).
- **Gateway browser return**: lands on 404 (BUG-005); `/payment-status` shows unverified state (BUG-009).
- **AutoBuy → ticket**: confirms bookings with fabricated PNR/ticket numbers (BUG-006).

## Hidden Inconsistencies (single-source-of-truth violations)

- **Booking status**: `stateHistory` JSON on Booking vs in-memory chain assertion during refund (jump to REFUNDED) vs docs' transition table — three different stories.
- **Price**: Money kernel (Decimal) canonical, but unified-cart pricing and item `netCost = Math.round(sellPrice*0.9)` duplicate margin logic in floating point.
- **Wallet balance**: ledger is canonical (good), but a dormant client store persists balances/transactions in localStorage and can render fake data (BUG-007).
- **Payment state**: webhook writes `Payment` rows; PAYMENT_FLOW.md claims `PaymentIntent → CAPTURED`; `/payment-status` trusts the URL.
- **PNR**: none issued in the main saga, fabricated in AutoBuy, stamped by OutboxConsumer for confirmed bookings — ticket identity depends on which path confirms.
- **Docs vs code**: PAYMENT_FLOW.md and BOOKING_LIFECYCLE.md (BUG-015).

## Fake / Mocked / Incomplete (explicit)

- **MOCK**: flight & hotel offer data (seeded catalog); AI recommendation grounding labels suggestions (honest).
- **SIMULATED (fail-closed without creds)**: Shetab token minting, CustomerRefundAdapter payout/Paya, eCardo demo degradation, ancillary GDS vouchers, AutoBuy PNR (⚠️ not fail-closed — BUG-006).
- **INCOMPLETE**: unified cart UI, cancellation chain, refund channel routing, cart persistence/expiry.
- **COMING_SOON (intentionally gated)**: Visa/MC, USDT crypto.
- **UNCOMMITTED (local only)**: travelers/organizations/invoices/Customer360, ExceptionRemediationService, AI security guard, SoftLockTimer, CancellationPolicyCard, timing-safe refactor — all tested and green, awaiting commit & deploy.

## Area Summaries

- **Data consistency** — strong invariants where it matters (ledger Debit=Credit, REF-103 refund cap, per-booking single capture, idempotency keys on Payment/Refund/Webhook/Invoice/RefundNumber); weak at the seams listed above (cart pricing, FX spread, status rendering).
- **Booking** — state machine + serializable saga + row locks + 30-min sweeper: real. Missing create-idempotency and supplier confirmation step.
- **Payment** — HMAC IPN (eCardo algorithm `txId+total_amount`), replay window, tamper checks, rate limiting, fail-closed everywhere; no live PSP connected.
- **Wallet** — canonical double-entry with FOR UPDATE debits; FX exchange is the one unguarded mutation path (BUG-002).
- **ERP** — TravelFile, ExceptionCenter **+ new remediation service** (retry ticketing, immediate wallet refund, payment sync, supplier PNR poll), settlement batches, commission tiers: integrated and permission-gated.
- **AI** — provider router with failover + cooldowns, injection/jailbreak guard (EN+FA), output sanitization, MCP tool authorization, observability traces; AI cannot book or price anything — grounding keeps suggestions separate from inventory.
- **User/Profile** — clean separation User/Customer/Traveler/Organization/Agency; new TravelerProfile + Customer360 + Organization services are session-scoped and tested; KYC stays out of localStorage.
- **Mobile** — AGENTS.md compliance verified: 0 physical `left/right/ml/mr/pl/pr` hits in components, sticky bottom CTAs, bottom sheets, 44px+ targets, a11y gate green; RTL logical properties throughout.
- **Security** — fail-closed middleware w/ permission-route map, CSRF on API mutations, rate-limited webhooks/OTP, hashed OTP with TTL/attempts/flood control, timing-safe comparisons, SSRF-allowlisted outbound (safeFetch), gitleaks + CI-012 + schema-drift in CI. No committed secrets found in env files (DEMO_MODE=false everywhere).
- **Performance** — build green; PWA offline; image scanner suites; no N+1 hotspots found in traced flows; Vercel region fra1 (note: Iranian users' latency not addressed — product concern, not bug).
- **Testing gaps** — no test drives `createMultiItemBookingDraftAction` against tampered prices (would catch BUG-001); no concurrent-exchange test (would catch BUG-002); E2E covers golden single-item journeys only; mobile E2E only for golden journeys.
- **Architecture risks** — dual saga coordinators; worker split-runtime unrepresented on Vercel; supplier ports implemented-but-mock keep the "integrated" claim contingent on future wiring.
- **Technical debt** — legacy `Account/LedgerEntry` vs new `ChartOfAccounts/JournalEntry` duality (documented in REALITY_RECONCILIATION, still present); Booking.stateHistory JSON vs relational history.

## Root Cause Summary

One pattern explains most findings: **the platform's hardening waves upgraded the money-and-booking core to production grade, but the "edges" (supplier legs, cart UI, refund rails, docs, deployment topology) were left at their earlier honest-but-incomplete state** — and one small wave (AutoBuy, widgets) still contains pre-hardening "fabricate it client-side" code. The uncommitted workstream shows the correct direction: server-authoritative, permission-gated, tested.

## Recommended Fix Order

**P0:** BUG-001 (server-price the cart), BUG-002 (lock FX exchange).
**P1:** BUG-005 → BUG-003 → BUG-006 → BUG-007 → BUG-008 → BUG-004/BUG-017 (PSP + supplier strategy decision).
**P2:** BUG-009 → BUG-014 → BUG-010 → BUG-011 → BUG-012 → BUG-013 → BUG-016 → BUG-015 → BUG-018.
**P3:** saga consolidation, docs regeneration, registry drift.

## Final Scorecard (0–10)

| Area | Previous (self-report) | **Audited now** | Basis |
|---|---:|---:|---|
| Product Integration | 9.5 | **7.5** | core funnel real; cart UI unreachable; supply mock |
| UI Consistency | 9.5 | 9.0 | design system coherent; payment-status cosmetic |
| UX Consistency | 9.5 | 8.5 | broken callback route; soft-lock timer is a plus |
| Mobile | 9.5 | 9.0 | AGENTS.md compliance + a11y gate verified |
| Frontend | 9.5 | 9.0 | RSC boundaries, stores hardened |
| Backend | 9.5 | 8.5 | saga/outbox/RBAC real; dual coordinators |
| API | 9.5 | 8.0 | missing callback route; dedupe fallback |
| Database | 9.5 | 9.0 | idempotency keys + drift CI; legacy duality |
| Travel Core / Search | 9.5 | 7.0 | mock supply, real pipeline |
| Booking | 9.5 | 8.0 | no create idempotency; supplier step absent |
| Cart | 9.5 | 6.5 | backend-only + client-price hole |
| Payment | 9.5 | 7.0 | fail-closed real, PSP not connected |
| Wallet | 9.5 | 8.0 | FX TOCTOU; ledger otherwise exemplary |
| Refund | 9.5 | 7.5 | invariants real; payout simulated; channel default |
| ERP | 9.2 | 8.5 | remediation service strengthens it |
| CRM / B2B | 9.0 / 9.0 | 8.0 / 8.0 | new services, early-stage |
| AI | 9.5 | 8.5 | guards real and tested |
| Notifications | 9.5 | 7.5 | outbox real; Vercel worker absent |
| Analytics / Observability | 9.5 | 8.5 | correlation ids, health, traces |
| Security | 9.8 | 9.0 | adversarial review passed; webhook dedupe nit |
| Privacy | — | 8.5 | PII masking; KYC out of localStorage |
| Performance | 9.5 | 8.0 | build green; no measured CWV evidence |
| Accessibility | 9.4 | 9.0 | gate green |
| Testing | 9.8 | 9.0 | 559 green + CI gates; two blind spots above |
| CI/CD | — | 9.0 | 4-job pipeline incl. CI-012 + drift |
| Internationalization | 9.8 | 9.5 | 846×5 parity; RTL logical-only |
| **Production Readiness** | — | **7.5 → YELLOW** | |

## Production Readiness Verdict — **YELLOW**

Safe to operate today for **wallet-backed purchases of catalog inventory (tours) with eCardo or wallet rails once credentials exist**, with the security posture genuinely production-grade. **Not safe to claim** live flight/hotel distribution, multi-product cart checkout, card payment via Shetab, or auto-ticketing until the remaining P1/P2 items land.

## Remediation round — 2026-09-11 (immediately after this audit)

Following the audit's fix order, the following were implemented **with regression tests** (details in `cross-system-bug-matrix.md` § Remediation round):

- **BUG-001 (P0)** — unified cart pricing is now server-authoritative (catalog → inventory fallback), fail-closed before any hold; 4 new tests.
- **BUG-002 (P0)** — `postFXConversion` row-locks and re-checks balance under lock; 3 new tests.
- **BUG-019 (P0, newly discovered during fix-testing)** — the wallet exchange action's constant `referenceId` made every exchange after the first one in the database a silent no-op (FIN-102 global dedupe); fixed with per-exchange reference; regression test added.
- **BUG-003 (P1)** — draft creation is now idempotent (project `IdempotencyManager`, checkout sends a per-session key).
- **BUG-005 (P1)** — the missing `/api/payments/callback` route was created (UX-only) and gateway browser-return callbacks were exempted from CSRF.
- **BUG-006 (P1)** — AutoBuy no longer fabricates PNRs/tickets; bookings without a real supplier confirmation stay `ISSUING` with a `TICKET_NOT_ISSUED` OperationalException for ops.
- **BUG-007 (P1)** — client-side booking/wallet fabrication removed (store slimmed + persisted data purged via migration); CityPass/SnappRecharge widgets show honest coming-soon CTAs.
- **BUG-012 (P2)** — FX spread now posted to `PLATFORM_REVENUE` as a balanced third leg.

Gates after remediation: typecheck ✅ · eslint ✅ · unit suite (562 incl. 7 new) ✅ · production build ✅. Remaining open items: BUG-004/008/009/010/011/013/014/015/016/017/018.
