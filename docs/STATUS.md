# FIRUZO CHILD — EXECUTION & RELEASE STATUS

## Current Release
Version: 1.8.7 (Specialist Child / Technology Tour Vertical)

## Current Phase
PHASE: Phase 0 (Discovery & Baseline) & Phase 1 (Architecture Stabilization)

## Completed
- **T0401 (Vertical Taxonomy — §36 scale layer):** The catalog is now multi-vertical — `BusinessTourPackage.vertical` (default `technology`, indexed, migration `20261004100000_business_package_vertical`, mirrored in the self-healer), filterable via `GET /packages?vertical=…` and `listPackages` (omitting returns all verticals), seeded with a second live vertical (`health_wellness` — Istanbul wellness/checkup retreat). Verified live: the vertical-filtered API returns only the wellness package. The technology landing (`/business`) fetches `vertical=technology` so the vertical experience stays coherent while the API remains the multi-vertical surface — proving the Child-of-Child template (§37) with an actual second vertical on the proven foundation.
- **T0502/T0504 E2E (§18 Acceptance, automated):** `tests/business-cms-editor.spec.ts` — editor creates a fresh page (title/slug/SEO/hero section), saves the draft (revision recorded), publishes, and the public route renders the page end-to-end; 3/3 business E2E tests passing on chromium. ogImage field with upload button wired into the editor SEO panel.
- **T1111–T1113 (Analytics Funnel):** Child funnel events wired into the privacy-safe allowlisted client (`lib/analytics.ts`): `child_home_viewed` (vertical landing), `tour_viewed` (package detail with slug), `booking_started` (request form) — all deduped per mount, PII-scrubbed, PostHog-gated (`NEXT_PUBLIC_POSTHOG_KEY`), zero-op without it. Checkout/payment funnel events (`checkout_started`, `payment_started/succeeded/failed`) reuse the existing allowlist entries, giving the full §50 event standard for the vertical.
- **T0504 (CMS Media):** Image upload shipped — `POST /api/v1/business/cms/upload` guarded with `content:manage` (image-only jpg/png/webp, 5MB cap, randomized names, SEC-004-style path containment under `public/uploads/cms`), wired into the editor's hero banner via an upload button next to the URL field.
- **T0502 + T0513 (CMS Editor & Access):** Non-developer publishing surface shipped —
  `content:manage` permission (T0513) + seeded `CONTENT_EDITOR` ERP role (admitted via `hasErpRole`); guarded server actions (`business-content-ops.ts`: list, get, save-draft, publish, schedule, restore); structured editor UI at `/admin/business/content` with per-section forms, live preview, schedule picker, and revision restore; shared `BusinessContentRenderer` powers both admin preview and the new public route `/business/content/[slug]` (published pages only, SEO metadata per T0510). §18 acceptance verified live: a page created and published purely through the service renders at the public URL with HTTP 200 and full content — zero code changes.
- **T0501–T0508 (Child CMS Foundation):** Specialist content model shipped DB-backed and typed:
  `BusinessContentPage` (slug+locale unique per T0509, vertical, typed `sections` JSON validated against a 4-section registry — hero_banner, itinerary_timeline, included_services, faq_accordion — never raw HTML blobs per §18, SEO fields per T0510) + immutable `BusinessContentRevision` (T0507). `BusinessContentService` covers draft upsert with pre-save snapshots, publish gating (empty pages refused, archived pages locked), scheduled publishing with an idempotent `publishDuePages()` sweeper (T0508), append-only restore (T0507), and a published-only public read path. Migration `20261003160000_business_content_cms` applied; self-healer extended; 8 QA tests green (1445/1445 total). Editor UI for non-developer authors is the Phase-5 follow-up (T0502 builder surface).
- **T1201 (Threat Model):** Formal STRIDE threat model for the specialist vertical published at `docs/THREAT_MODEL_BUSINESS_VERTICAL.md` — 4 trust boundaries (guest funnel, ERP operators, Shetab PSP callback, public voucher verification), per-boundary threat/defense tables with implemented controls (T0804, SEC-P0, T1013) and registered residuals.
- **T1304 (Critical E2E):** `tests/business-operator-queue.spec.ts` (2 tests, chromium) covers the full operator journey: guest request created via the public API surfaces in `/admin/business`, the detail panel exposes approve/request-changes/grant affordances, and anonymous visitors are redirected to the ERP organizational sign-in by the admin layout. 2/2 passing against the live dev server.
- **T1013 (Audit Attribution):** `BusinessStatusEvent.actorId` is now populated — `recordStatusTransition` accepts an acting principal, `reviewRequest`/`applyGrant` stamp the operator's core user id (passed from the guarded routes), and the outbox payload carries `actorId` for downstream audit consumers. Regression tests assert actor attribution on review and grant events.
- **T1001/T1003 (ERP Operator Queue):** Specialist operator surface shipped at `/[locale]/admin/business` — server page fail-closed behind `business:request:review`, request queue table (code, company, program, pax, amounts, status pill), and per-request actions (approve documents, request changes, apply grant) via permission-guarded server actions (`src/actions/business-ops.ts`) that stamp `actorId` on every transition. Resolves the "Specialist Operator Interface" product risk for Phase 10.
- **T0804 (Object-Level Authorization):** Ownership binding shipped incrementally without breaking the Phase-1 guest funnel:
  `BusinessRequest.createdById` (nullable, indexed, migration `20261003120000_business_request_owner_binding`, mirrored in the schema self-healer). Authenticated creators are bound on `POST /requests`; `GET/PATCH /requests/[id]`, document upload, and voucher retrieval enforce object-level access — owner or `business:request:review` staff only; guest-created requests (null owner) remain id-addressable until login binding becomes mandatory. Regression tests cover owner/stranger/guest paths (route-security suite: 9 tests).
- **SEC-P0 (Route Authorization):** Two unauthenticated P0 holes closed in the business API:
  (1) `POST /requests/[id]/review` and `POST /requests/[id]/grant` now require the new granular permissions `business:request:review` (SUPER_ADMIN, OPERATOR) / `business:request:grant` (SUPER_ADMIN, FINANCE) via a fail-closed route guard (`_lib/guard.ts`, 401/403); permission rows synced to DB by seed.
  (2) `POST /payments/callback` now requires an HMAC-SHA256 signature header (`x-business-signature`, timing-safe verify via core `callback-security.ts`) and is idempotent for already-settled payments — an unsigned callback can never confirm a payment.
  Regression suite `route-security.test.ts` (5 tests) locks both behaviors.
- **T0213 (Event Outbox Wiring):** `BusinessStatusEvent` writes now flow through a single `recordStatusTransition` helper that also fans each transition out to the core Outbox (`NOTIFICATION_DISPATCH`, rep-phone targeted) via a new `emitDomainEvent` method on the `FiruzoCoreClient` contract (T0311 producer). Deposit/settlement batch transactions converted to interactive transactions so audit row + outbox event commit atomically. All 8 former direct call sites migrated; 217 business tests + full suite green.
- **T0201+ (Data Foundation Hardening):** Business vertical tables added to the runtime schema self-healer (`db-schema-guard.ts`) — cold-start production risk eliminated; verified on live DB (12 tables).
- **P0 Fix (Wallet Double-Debit):** Redundant wallet debit removed from `BookingSagaCoordinator` STEP 2; single WAL-001-locked debit now owned by `PaymentDomainService.processPayment`.
- **T0001 (State Freeze):** Reproducible baseline established (Commit `58bed19`, PostgreSQL schema snapshot, `.env.example` contract).
- **T0002 (Child Routes Inventory):** 7 frontend routes under `/[locale]/business/*` and 13 REST API endpoints under `/api/v1/business/*` fully inventoried.
- **T0004 (Domain Inventory):** 11 core specialist entities mapped and implemented (`BusinessCompany`, `BusinessTourPackage`, `BusinessDeparture`, `BusinessAddon`, `BusinessRequest`, `BusinessRequestAddon`, `BusinessTraveler`, `BusinessDocument`, `BusinessPayment`, `BusinessVoucher`, `BusinessStatusEvent`).
- **T0105 (Integration Boundary):** `FiruzoCoreClient` abstraction created with `InProcessFiruzoCoreClient` providing isolation from Core tables.
- **T0411 (Server-Authoritative Pricing):** 100% integer Rial pricing kernel via `computeQuote` with 48-hour quote expiration.
- **T0413 (State Machine):** 6-stage lifecycle (`draft → submitted → deposit_paid → under_review → approved → issued`) with server-side transition guards.
- **T0801 / T0808 (Booking & Payment Intent):** Soft capacity hold on draft creation, atomic booked count increment on Shetab callback, unique idempotency-key enforcement.
- **T1301 / T1304 (Test Coverage):** 217 business unit/QA tests passing in Vitest; comprehensive 7-step Playwright E2E spec created.

## In Progress
- **T0003 (Route Health Audit):** Systematic audit of mobile/desktop states across all business routes.
- **T0005 (Dependency Inventory):** Verifying ESLint boundaries preventing direct `@/lib/prisma` imports in Child domain.
- **T0006 (Data Ownership Audit):** Verifying single-master ownership for all entities.
- **T0007 (UX Flow Audit):** Validating thumb-zone touch targets and RTL typography across all specialist screens.

## Blocked
- None.

## Architecture Risks
- ~~**Risk 1 (Ledger Owner Mapping)**~~ **RESOLVED (2026-10-03):** The mapping failure is no longer silent — `postBalancedEntry` throws an explicit `no ChartOfAccounts mapping for Account.ownerType '...'` error (FIN-101), now locked by a regression test in `ledger-accounting.test.ts` that also proves zero partial ledger rows survive a failed posting. Decision recorded: the Child posts through the canonical core ownerTypes (escrow/revenue/supplier/tax/fee) with `referenceId` = FZB request code; no speculative `BUSINESS_*` ownerType entry was added (roadmap §59 — no dead code).
- ~~**Risk 2 (Production Table Guard)**~~ **RESOLVED (2026-10-03):** All 12 Business-vertical tables, their unique/regular indexes, and FK constraints are now included in `src/lib/db-schema-guard.ts` (mirroring migration `20260930132000_business_vertical_foundation`). Verified against the live database: heal executes cleanly and `information_schema` reports 12 `Business%` tables.

## Product Risks
- **Guest Request Ownership (residual):** T0804 is live — authenticated users get ownership binding and object-level access enforcement; requests created by anonymous visitors remain id-addressable (unguessable cuid). Making login mandatory for the request funnel is a product decision (UI sign-in flow), tracked for Phase 6.
- **Notification Delivery:** SMS notification triggers during status events currently rely on mock core notifier when SMS provider API keys are unset.

## Test Health
- **Unit (full suite):** 1450/1450 passing — 100% green (2026-10-04), including vertical-taxonomy QA.
- **Unit (Child business suite):** 228+ passing across 11 business test files (100% pass rate), including 8 CMS QA tests.
- **Integration:** Contract tests passing for `FiruzoCoreClient`, payment callbacks, and voucher verification.
- **E2E:** `tests/business-technology-tour.spec.ts` (3/3 — happy path to voucher migrated to the authenticated operator model incl. CSRF Origin header, invalid-transition guard, mobile no-overflow); `tests/business-operator-queue.spec.ts` + `tests/business-cms-editor.spec.ts` covering the admin operator journey and the §18 CMS acceptance — 9/9 business E2E tests passing on chromium.
- **A11y:** `gate:a11y` PASSED — 0 blocking violations across 28 scanned funnels (fa/en), zero regressions vs baseline (2026-10-04).
- **UI/UX:** `gate:uiux` PASSED — 0 violations across 685 files (one 44px target-pattern fix applied to the CMS editor during gating).
- **I18n:** `gate:i18n` PASSED — 100% key parity across fa/en/ar/zh/ru, no new inline-localization debt.
- **Release consistency:** `verify:release` ALIGNED — single expected warning (dirty working tree from the uncommitted session changes).
- **Build:** Clean compilation (`tsc --noEmit`), ESLint `--max-warnings=0`.

## Phase 0 Audit Findings (2026-10-03)
- **T0005 Finding (Boundary):** `BusinessDomainService.ts:1` imports `@/lib/prisma` directly, but accesses **only Child-owned `business*` tables** — consistent with `DATA_OWNERSHIP.md` (Child tables = Direct Read/Write). No Child file touches Core tables (`User`, `Booking`) except through the sanctioned `InProcessFiruzoCoreClient` adapter. Follow-up: align the stricter enforcement wording in the `FiruzoCoreClient.ts` header comment with actual Phase-1 practice (T0113b).
- **P0 FIX — Wallet Double-Debit (BookingSagaCoordinator):** STEP 2 of the booking saga debited the wallet a second time after `PaymentDomainService.processPayment` had already debited it under WAL-001 row lock. Before the WAL-001 balance check this silently double-charged every wallet booking; with the check it hard-failed. The redundant saga-side debit was removed — wallet debit is owned exclusively by `processPayment`. Verified by the full green suite.
- **T0008 Fix — Test alignment with WAL-001:** `security-fixes.test.ts` now funds the wallet before a wallet payment (production semantics); `tour-engine.test.ts` mock extended with `bookingStatusHistory` to match the new audit-trail write in `TourDomainService`.

## Deployment
- **Preview:** Local Next.js 16 App Router on Node 22.
- **Production:** Docker containerized, multi-stage build, Postgres 16 with row locks (`FOR UPDATE SKIP LOCKED`).

## Next Tasks
- **T1513:** Production verification (blocked on deployment access)
