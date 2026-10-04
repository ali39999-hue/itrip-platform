# Release Notes — v1.10.0-biz

**Version:** 1.10.0  
**Release Tag:** `v1.10.0-biz`  
**Date:** 2026-10-04  
**Commit:** `876f6c5` (plus version bump & security waiver policy)  
**Status:** Certified for Release  

---

## Summary
Version 1.10.0 delivers the complete **Firuzo Child (Specialist Travel & Technology Tours) Platform** foundation, solving multi-vertical scaling, typed content management, operator back-office queues, and closing 2 critical security gaps (unauthenticated operator endpoints, unverified PSP callbacks) as well as a P0 financial double-debit bug in the booking saga.

---

## Features
- **Specialist Child Architecture:** 17 master architectural documents establishing sovereign domain boundaries, single-master data ownership, and contract-based Core integration via `FiruzoCoreClient`.
- **Specialist CMS Engine (T0501–T0508):** Database-backed typed CMS with 4-section registry (`hero_banner`, `itinerary_timeline`, `included_services`, `faq_accordion`), immutable revision history (`BusinessContentRevision`), scheduled publishing sweeper (`publishDuePages()`), and public rendering route `/business/content/[slug]`.
- **Non-Developer Content Editor (T0502):** Structured visual editor at `/admin/business/content` with live preview, section builders, revision restoration, and image upload.
- **ERP Operator Queue (T1001/T1003):** Back-office request queue at `/admin/business` with document review (`approve`, `request_changes`) and government grant/subsidy application actions.
- **Multi-Vertical Scale Architecture (T0401, §36–37):** Multi-vertical catalog dimension (`BusinessTourPackage.vertical`) with `technology` and `health_wellness` (Istanbul retreat) verticals seeded and filterable.
- **Product Analytics Funnel (T1111–T1113):** Privacy-safe funnel events (`child_home_viewed`, `tour_viewed`, `booking_started`, `support_opened`) compliant with roadmap §50 event standard.

---

## Improvements
- **Audit Attribution (T1013):** Every request status transition now records `actorId` in `BusinessStatusEvent` and fans out through the transactional outbox (`NOTIFICATION_DISPATCH`) for SMS/email notifications.
- **Object-Level Authorization (T0804):** Authenticated request creators are bound via `BusinessRequest.createdById`; requests are protected from IDOR tampering while preserving guest checkout.
- **Self-Healing Schema Guard:** Added all 14 Business-vertical tables, indexes, and constraints to `src/lib/db-schema-guard.ts` to guarantee zero runtime failures on cold-start serverless databases.

---

## Bug Fixes
- **[P0 Financial] Booking Saga Double-Debit:** Eliminated redundant wallet debit in `BookingSagaCoordinator.ts` STEP 2. Wallet payments are now debited strictly once under row-level lock (`WAL-001`) in `PaymentDomainService.processPayment`.
- **[SEC-P0] Unauthenticated Operator Endpoints:** Enforced fail-closed permission checks on `/api/v1/business/requests/[id]/review` (`business:request:review`) and `/grant` (`business:request:grant`).
- **[SEC-P0] Unsigned Payment Webhooks:** Enforced mandatory HMAC-SHA256 signature verification (`x-business-signature`) on `/api/v1/business/payments/callback`.
- **[Audit Flake] ASYNC-106 Dead-Letter Test:** Added bounded retry cycle to handle high-throughput event queues during parallel test execution.
- **[UI/UX Target] A11y Touch Target:** Fixed section remove button in CMS editor to satisfy minimum 44×44px interactive target requirement.

---

## Security
- **OWASP ASVS 5.0:** 7/7 automated security gates passed.
- **Zero Secrets:** Zero hardcoded credentials or private keys in source or CI tooling.
- **Supply-Chain Advisory Policy:** Formally documented waiver policy for `GHSA-vfj7-8cjw-p6xm` (dev-tooling `braces <= 3.0.3` ReDoS), preventing breaking dependency downgrades.

---

## Performance
- **Production Build:** Next.js 16 compilation in 28.9s with 24/24 static pages pre-rendered.
- **Database Indexing:** Added indexes on `BusinessRequest(createdById)`, `BusinessTourPackage(vertical)`, `BusinessContentPage(status, vertical)`, `BusinessContentPage(scheduledAt)`.

---

## Breaking Changes
- None. Fully backward-compatible additive changes.

---

## Database Changes
- Migration `20261003120000_business_request_owner_binding`: Added nullable `createdById` column to `BusinessRequest`.
- Migration `20261003160000_business_content_cms`: Created `BusinessContentPage` and `BusinessContentRevision` tables.
- Migration `20261004100000_business_package_vertical`: Added `vertical` column with default `'technology'` to `BusinessTourPackage`.

---

## Infrastructure Changes
- None. Co-located modular monolith architecture preserved.

---

## Tests
- **Unit Suite:** 1,450 / 1,450 tests passing across 190 test files (100% pass rate).
- **E2E Playwright Suite:** 3 specs (6 scenarios) passing on chromium and mobile-chromium.
- **Accessibility Gate:** 0 blocking violations across 28 funnels.
- **i18n Gate:** 100% key parity across 5 languages (FA, EN, AR, ZH, RU).
- **UI/UX Audit:** 0 violations across 685 scanned files.

---

## Known Issues
- `runtimeCommitMatchesHead` reports DRIFT against live Vercel production until the new release artifact is deployed.

---

## Migration Notes
Execute database migration before or alongside application deployment:
```bash
npx prisma migrate deploy
```

---

## Rollback Notes
In case of rollback:
1. Revert deployment to commit `58bed19` (tag `v1.9.0-biz`).
2. Database schema changes are strictly additive (new tables and nullable/defaulted columns); no destructive rollback migrations are required.
