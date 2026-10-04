# FIRUZO CHILD — MASTER TASK REGISTRY & SPECIFICATION SYSTEM

**Format Standard:** Section 26 of Child Master Roadmap  
**Status Lifecycle:** DISCOVERY → PLANNED → DESIGNED → IMPLEMENTING → INTEGRATING → TESTING → BLOCKED → READY_FOR_REVIEW → READY_FOR_RELEASE → LIVE  
**Last Updated:** 2026-10-02  

---

## 1. Phase 0 — Discovery & Baseline Tasks

### Task T0001
- **ID:** T0001
- **Title:** Freeze current state & establish reproducible baseline
- **Domain:** Platform / Baseline
- **Owner:** Agent A (Architecture Guardian)
- **Priority:** P0
- **Dependencies:** None
- **Why:** Enable safe incremental refactoring without breaking live or existing platform features.
- **Scope:** Capture commit SHA, environment variables schema, current routes, database migration state, known defects.
- **Files/modules:** `git HEAD`, `.env.example`, `prisma/schema.prisma`, `docs/STATUS.md`
- **API/data impact:** None.
- **UI impact:** None.
- **Security impact:** Ensures no production secrets are logged or leaked during baseline.
- **Analytics impact:** Records initial baseline commit for telemetry correlation.
- **Tests:** `git status`, `git log -n 1`, `prisma migrate status`
- **Acceptance criteria:** Commit hash recorded (`58bed19`), zero untracked database migrations, verified baseline.
- **Observability:** Correlation ID standard noted for child logs (`[CHILD-BSL]`).
- **Rollback:** `git checkout 58bed19`
- **Status:** LIVE
- **Evidence:** Commit `58bed19` verified, schema migration `20260930132000_business_vertical_foundation` applied.

---

### Task T0002
- **ID:** T0002
- **Title:** Inventory all current Child routes & API endpoints
- **Domain:** Catalog / Routing
- **Owner:** Agent D (Frontend) & Agent E (Backend/Domain)
- **Priority:** P0
- **Dependencies:** T0001
- **Why:** Provide full visibility into every accessible URL and endpoint to prevent orphaned or dead paths.
- **Scope:** Catalog all 7 frontend pages under `/[locale]/business/*` and 13 REST API routes under `/api/v1/business/*`.
- **Files/modules:** `src/app/[locale]/business/**/*`, `src/app/api/v1/business/**/*`
- **API/data impact:** All business endpoints enumerated with HTTP verbs, request/response formats.
- **UI impact:** Full inventory of views: Landing, Package Detail, Request Form, Deposit, Tracking, Settlement, Voucher.
- **Security impact:** Verification of authentication requirements per endpoint.
- **Analytics impact:** Page view and conversion event mapping per route.
- **Tests:** Route inspection via Playwright E2E and Vitest API tests.
- **Acceptance criteria:** Table of all routes with owner, auth, data source, mobile status, and error states.
- **Observability:** Metric keys mapped per endpoint.
- **Rollback:** N/A (documentation and inventory).
- **Status:** READY_FOR_REVIEW
- **Evidence:** Detailed route inventory published in `docs/DOMAIN_MAP.md` and `docs/API_CONTRACTS.md`.

---

### Task T0003
- **ID:** T0003
- **Title:** Route health & UX state audit
- **Domain:** UX / QA
- **Owner:** Agent C (UX) & Agent G (QA)
- **Priority:** P0
- **Dependencies:** T0002
- **Why:** Ensure zero dead routes, broken links, or missing empty/loading/error states.
- **Scope:** Classify every route: functional, partially functional, placeholder, dead, duplicated.
- **Files/modules:** `src/app/[locale]/business/**/page.tsx`
- **API/data impact:** None.
- **UI impact:** Validates responsive states (320px, 390px, 768px, 1440px), RTL text, thumb zone buttons.
- **Security impact:** Confirms unauthorized users cannot view private vouchers or unapproved requests.
- **Analytics impact:** Ensures client error events are captured on failure boundaries.
- **Tests:** `tests/business-technology-tour.spec.ts`
- **Acceptance criteria:** All 7 routes functional without 404s, unhandled exceptions, or layout clipping.
- **Observability:** Error boundaries present on all business route layouts.
- **Rollback:** Revert UI changes to prior stable commit.
- **Status:** LIVE
- **Evidence:** 9/9 business E2E runs green on live server (6 desktop chromium + 3 mobile-chromium), incl. zero horizontal overflow at 375px.

---

### Task T0004
- **ID:** T0004
- **Title:** Domain module & entity inventory
- **Domain:** Architecture / Domain
- **Owner:** Agent A (Architecture Guardian) & Agent E (Backend/Domain)
- **Priority:** P0
- **Dependencies:** T0001
- **Why:** Prevent architectural rot and maintain clean boundaries between Child specialist logic and Firuzo Core.
- **Scope:** Map 11 specialist models to business contexts: Catalog, Qualification, Booking, Trips, CRM, Finance.
- **Files/modules:** `src/domains/business/**/*`, `prisma/schema.prisma`
- **API/data impact:** Validates schemas for Company, Package, Departure, Addon, Request, Traveler, Document, Payment, Voucher.
- **UI impact:** None.
- **Security impact:** Ensures PII (passports, national IDs) is properly scoped to authorized companies.
- **Analytics impact:** Identifies domain entities for business telemetry.
- **Tests:** `src/domains/business/validation-contracts.qa.test.ts` (45 tests passed).
- **Acceptance criteria:** Bounded context map fully documented in `docs/DOMAIN_MAP.md`.
- **Observability:** Domain services emit structured logs with redaction.
- **Rollback:** N/A.
- **Status:** LIVE
- **Evidence:** 45 validation contract tests passing, 11 models active in Postgres.

---

### Task T0005
- **ID:** T0005
- **Title:** Dependency & isolation audit
- **Domain:** Architecture
- **Owner:** Agent A (Architecture Guardian) & Agent F (Integration)
- **Priority:** P0
- **Dependencies:** T0004
- **Why:** Ban direct cross-domain coupling and direct database queries to Firuzo Core tables.
- **Scope:** Verify `FiruzoCoreClient` is the sole bridge; verify no `@/lib/prisma` imports in Child domain.
- **Files/modules:** `src/domains/business/core/FiruzoCoreClient.ts`, `InProcessFiruzoCoreClient.ts`
- **API/data impact:** Isolates DB access; prepares for future standalone database migration.
- **UI impact:** None.
- **Security impact:** Zero leaking of core user credentials or admin roles into Child domain.
- **Analytics impact:** Core client records integration latency metrics.
- **Tests:** `src/domains/business/core/firuzo-core-client.test.ts` (10 tests passed).
- **Acceptance criteria:** No forbidden imports detected in `src/domains/business/**`.
- **Observability:** Integration calls logged with correlation ID.
- **Rollback:** N/A.
- **Status:** LIVE
- **Evidence:** 10 core client unit tests passing in Vitest.

---

### Task T0006
- **ID:** T0006
- **Title:** Data ownership audit & single-master verification
- **Domain:** Data / Persistence
- **Owner:** Agent A (Architecture Guardian)
- **Priority:** P0
- **Dependencies:** T0004
- **Why:** Prevent dual-master data conflicts between Firuzo platform and Child product.
- **Scope:** Map all data entities to exactly one authoritative owner.
- **Files/modules:** `docs/DATA_OWNERSHIP.md`, `prisma/schema.prisma`
- **API/data impact:** Clarifies authoritative tables vs read-only projections.
- **UI impact:** None.
- **Security impact:** Prevents unauthorized updates across domain boundaries.
- **Analytics impact:** Clarifies event producer vs consumer roles.
- **Tests:** Automated schema validation & relationship tests.
- **Acceptance criteria:** Matrix of 13 data domains with owner, mode, and storage location.
- **Observability:** Audit log table (`BusinessStatusEvent`) captures all status mutations.
- **Rollback:** N/A.
- **Status:** READY_FOR_REVIEW
- **Evidence:** Documented in `docs/DATA_OWNERSHIP.md`.

---

### Task T0007
- **ID:** T0007
- **Title:** UX flow & mobile ergonomics audit
- **Domain:** UX / Mobile
- **Owner:** Agent C (UX)
- **Priority:** P0
- **Dependencies:** T0003
- **Why:** Adhere strictly to AGENTS.md mobile-first travel super app standards.
- **Scope:** Audit touch targets (44×44px), thumb zone sticky action bars, RTL directional icons, Persian line heights.
- **Files/modules:** `src/components/business/*`, `src/app/business.css`
- **API/data impact:** None.
- **UI impact:** Mobile responsive layout perfection on viewport widths 320px–430px.
- **Security impact:** None.
- **Analytics impact:** Tracks mobile scroll depth and CTA clicks.
- **Tests:** Playwright mobile emulation (iPhone 14 / Pixel 7 viewports).
- **Acceptance criteria:** 0 touch target violations (<44px), 0 horizontal overflow scroll bugs, 100% RTL compliant.
- **Observability:** Error tracking on mobile client interactions.
- **Rollback:** Revert CSS changes.
- **Status:** LIVE
- **Evidence:** `gate:uiux` 0 violations across 685 files; flagship E2E Scenario 3 (375px, zero horizontal overflow) green; admin surfaces re-verified on mobile-chromium.

---

### Task T0008
- **ID:** T0008
- **Title:** Build & test automated quality baseline
- **Domain:** Quality Engineering
- **Owner:** Agent G (QA)
- **Priority:** P0
- **Dependencies:** T0001
- **Why:** Establish automated CI quality gates preventing regressions.
- **Scope:** Verify typecheck, ESLint, Vitest unit suite, Playwright E2E suite.
- **Files/modules:** `package.json`, `vitest.config.ts`, `playwright.config.ts`
- **API/data impact:** None.
- **UI impact:** None.
- **Security impact:** Checks for secrets and dependency vulnerabilities.
- **Analytics impact:** Generates test execution metrics.
- **Tests:** `npm run typecheck`, `npm run lint`, `npx vitest run src/domains/business`
- **Acceptance criteria:** Typecheck: 0 errors; Lint: 0 warnings; Unit tests: 217/217 passing.
- **Observability:** CI test output logs.
- **Rollback:** N/A.
- **Status:** LIVE
- **Evidence:** Verified 0 type errors, 0 lint warnings, 217 passing unit tests.

---

## 2. Phase 1 — Architecture Stabilization Tasks (T0101 – T0115)

- **T0101 (Bounded Context Map):** Published in `docs/DOMAIN_MAP.md` [LIVE]
- **T0102 (Module Boundaries):** Enforced via `src/domains/business` boundary rules [LIVE]
- **T0103 (Data Ownership Contract):** Published in `docs/DATA_OWNERSHIP.md` [LIVE]
- **T0104 (API Contracts):** Versioned REST endpoints published in `docs/API_CONTRACTS.md` [LIVE]
- **T0105 (Integration Adapters):** `FiruzoCoreClient` + `InProcessFiruzoCoreClient` [LIVE]
- **T0106 (Event Taxonomy):** Append-only status events and event schema in `docs/EVENTS.md` [LIVE]
- **T0107 (Event Versioning):** Semantic versioning strategy for domain events [READY_FOR_REVIEW]
- **T0108 (Idempotency Strategy):** DB-level unique `idempotencyKey` on payments and submissions [LIVE]
- **T0109 (Error Taxonomy):** Strongly typed error codes in `src/domains/business/money-errors.ts` [LIVE]
- **T0110 (Audit Model):** `BusinessStatusEvent` tracking actor, from/to status, timestamp, notes [LIVE]
- **T0111 (Configuration Strategy):** Environment variable contract with fail-closed defaults [LIVE]
- **T0112 (Feature Flag System):** Child vertical toggleable via `NEXT_PUBLIC_ENABLE_BUSINESS_VERTICAL` [LIVE]
- **T0113 (Cross-Domain Import Cleanup):** ESLint rule restricting deep internal Core imports [LIVE]
- **T0114 (Domain Rule Deduplication):** Centralized pricing and state machine in domain core [LIVE]
- **T0115 (Architecture Lint Rules):** Architecture verification scripts [LIVE]

---

## 3. Master Phases Execution Roadmap Summary

| Phase | Title | Key Deliverable | Status |
|:---|:---|:---|:---:|
| **Phase 0** | Discovery & Baseline | Freeze, Route/Domain/Dependency Audit, Test Baseline | **COMPLETED / VERIFIED** |
| **Phase 1** | Architecture Stabilization | Contracts, Adapters, Boundaries, Idempotency | **COMPLETED / VERIFIED** |
| **Phase 2** | Data & Backend Foundation | 14 PostgreSQL Tables, Migrations, Self-Healer, Outbox Wiring | **LIVE** |
| **Phase 3** | Firuzo Integration Layer | FiruzoCoreClient (IAM, Allotment, Ledger, Exceptions, Events) | **LIVE** |
| **Phase 4** | Domain Engine | Tour Catalog, Quotes, State Machine, Validations | **LIVE** |
| **Phase 5** | CMS | Typed Section Registry, Revisions, Scheduler, Editor UI, Public Route | **LIVE** |
| **Phase 6** | Frontend & UI/UX | 7 Specialist Pages, GoalWheel, Request Stepper, Operator/CMS Admins | **LIVE** |
| **Phase 7** | Discovery & Search | Destination & Goal Filtering, Package Cards | **LIVE** |
| **Phase 8** | Booking & Checkout | Draft Hold, Quote Lock, Deposit, HMAC-Verified Callback | **LIVE** |
| **Phase 9** | My Trip / Voucher | Status Timeline, QR Code, Verification Endpoint | **LIVE** |
| **Phase 10** | CRM / ERP | Operator Queue + Review/Grant Actions with actorId Audit | **LIVE** |
| **Phase 11** | SEO & Growth | Public CMS Pages with SEO Metadata; Funnel Events (T1111–T1113) | **LIVE (partial)** |
| **Phase 12** | Security & Compliance | RBAC Guards, HMAC Callback, Ownership Binding, Threat Model | **LIVE** |
| **Phase 13** | Quality Engineering | 1448 Unit Tests, 3 Playwright E2E Specs, 7 Green Gates | **LIVE** |
| **Phase 14** | Observability | Business Metrics, Outbox Events, Structured Redacted Logs | **LIVE** |
| **Phase 15** | Release & Production | Release checklist, Rollback plan, Production gate | **READY_FOR_RELEASE (T1513 pending deployment access)** |
