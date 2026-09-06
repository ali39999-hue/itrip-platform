# W0 + First-Batch Completion Report (Master Task List v1.0)

Prepared per the Master Task List's reporting template. Execution window: 2026-09-06,
baseline `0fc1a105` (branch `feat/booking-travel-date`), 13 continuations — full detail with
file:line evidence in `HARDENING-W0-CHANGELOG.md` (same folder).

**AREA:** W0 (Baseline/Reality) + First execution batch (BASE / IAM / MONEY / BOOK / INV / PAY / ASYNC / REF / ERP / OBS / SEC / CI / DOC / A11Y)

**STATUS:** COMPLETE for all work not physically blocked by the concurrently-developed
features (`schema.prisma`, `src/actions/booking.ts` staged work; autobuy/content/tours in-flight).
3 tasks explicitly deferred pending that merge: IAM-004 (membership FK), createBookingDraft →
BookingDomainService wiring, wallet-balance unification (+ explicit price TTL).

**CURRENT SCORE:**
- typecheck: PASS (repo-wide; residual errors only in concurrently-edited files)
- unit/integration: **24 files / 135 tests PASS** on PostgreSQL (incl. 135-113 = 22 tests added by this run)
- E2E: **18/18 PASS** (5 golden desktop + 5 golden mobile + 8 critical/ERP flows, desktop+mobile)
- lint: 0 errors in every file touched by this run (repo errors belong to concurrent feature work)
- i18n audit: OK (851 keys × 5 locales, 0 missing/extra)
- A11Y baseline: measured; 1 critical fixed, 2 documented with owners

**WHAT I FOUND (top findings at baseline):**
- Webhook capture forgeable with `SHETAB_SECRET_KEY` unset (fail-open HMAC) + HMAC over re-serialized JSON
- Per-event-only payment idempotency (double-capture possible) + no terminal-state guard
- Production OTP delivery dead (masked `***`), silent provider simulation, dead IP rate-limit layer
- Refund aggregate unwired (admin path bypassed RefundDomainService entirely)
- Demo payment path reachable in production via a single env var; CI E2E gate non-blocking
- Saga float math on money; admin capacity mutations bypassing InventoryEngine; no booking lifecycle sweeper
- Cross-tenant read surface in global admin search; tenant-scoper scoping non-existent columns
- Exception Center accumulating duplicates; health/ready self-DoS (full ledger scan per probe)

**WHAT I CHANGED:** 13 continuations — payment hardening (fail-closed/raw-body HMAC/per-booking
capture idempotency/terminal guard/audit), OTP delivery + IP limits, refund wiring + INV-010
compensation, InventoryEngine as single authority, Decimal-only saga, relational-canonical IAM +
JWT, admin-search tenant scoping, lifecycle sweepers, exception dedupe, structured redacted logging,
correlation headers, runtime-mode startup contract, 4 new CI gates, ESLint architecture guardrails,
3 runbooks, production architecture doc, A11Y baseline tooling + fix, docs honesty pass, AGENTS.md
invariant contract.

**WHAT I DID NOT CHANGE:** user's staged travel-date work, in-flight autobuy/content/tours features,
legacy `Role.permissions`/`OrganizationMembership.roleId` columns (writers neutralized; physical
drops deferred), no real PSP (rails fail closed), `lt()` legacy i18n layer.

**FILES TOUCHED:** ~20 source files + 3 test files + 1 tooling script + CI/eslint/next.config +
README/HANDOFF/PRODUCTION_READINESS/SECURITY_AUDIT/AGENTS.md + 15 new docs (baseline/, runbooks/, architecture, env contract, release checklist).

**DATABASE CHANGES:** none (existing 51 models used; physical column drops + membership FK deferred to a post-merge migration).

**API CHANGES:** `POST /api/payments/webhook` — fail-closed semantics (401/400 per reason), idempotent
`DUPLICATE` for captured bookings, terminal-state rejection; `GET /api/admin/search` — tenant-scoped;
`GET /api/health/ready` — 5-min cached ledger check; `requestOtp` — IP-layer rate limit.

**TESTS ADDED:** 22 (inventory engine policy/compensation, refund-with-hold e2e, PAY-010 duplicate +
terminal guard, lifecycle sweeper, ERP-009 dedupe, IAM-008 authorization matrix, IAM-007 scoper
regression) — plus the a11y measurement tool.

**TESTS RUN:** typecheck PASS · lint PASS (own files) · unit **135/135** · E2E **18/18** · i18n audit OK · a11y scans recorded.

**KNOWN REMAINING RISKS:** no real PSP integration (payments fail closed in prod); invoice/commission/
settlement/3-way engines still unwired to commands; workers inside web process (no external scheduler);
in-memory rate limiting (single-instance); `lt()` legacy i18n (1,125 call sites); quote TTL approximated
by hold/intent TTL + booking expiry; concurrent feature work currently owns all repo-wide lint/typecheck errors.

**NEXT PRIORITY:** after the user's travel-date/autobuy/content work merges: (1) IAM-004 membership
FK migration, (2) `createBookingDraft` → BookingDomainService, (3) wallet-balance unification on
GeneralLedgerService, (4) explicit `PriceSnapshot.expiresAt` + price-change UX (B2C-007/009).
