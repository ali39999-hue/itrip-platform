# BASE-003 / BASE-101 — Feature Reality Matrix

Generated 2026-09-07 against HEAD `714f532` (`714f532905e3819bee85418a5f848954e71cab43`) on branch `main`.
Labels: **PRODUCTION-READY / COMPLETE / PARTIAL / LEGACY / MOCK / SIMULATED / BROKEN / MISSING**.
Every claim below is evidence-backed (file:line) and regenerated automatically via `scripts/generate-reality-matrix.mjs`.
This matrix supersedes the optimistic claims in README/PRODUCTION_READINESS/SECURITY_AUDIT where they conflict.

## Repository Metrics at Current HEAD

- **Version:** 1.4.1 (reconciled BASE-105)
- **Commit SHA:** `714f532` (`714f532905e3819bee85418a5f848954e71cab43`)
- **Prisma Models:** 58 models
- **Database Migrations:** 19 migrations (reproducible via `prisma migrate deploy`)
- **Unit & Integration Test Suites:** 47 test suites (148+ unit tests passing on isolated PostgreSQL 16)
- **Runtime:** Node.js 20+ / Next.js 16.3 (App Router) / React 19.2

---

## Area verdicts

| Area | Status | Evidence & gaps |
|---|---|---|
| DB / migrations | PRODUCTION-READY (canonical PostgreSQL) | 58 models, 19 migrations, `migrate deploy` reproducible in CI; `prisma/dev.db` SQLite is dead weight |
| Relational RBAC | **CANONICAL (runtime)** | `requirePermission` / `getUserPermissions` / `hasErpRole` resolve solely via relational chain (`src/domains/identity/permission-service.ts:21-71`); JWT `role` claim relational (`src/auth.ts:278`); legacy `Role.permissions` JSON bypassed and neutralized to `'[]'` (`src/auth.ts:107`); `OrganizationMembership.roleId` FK referential integrity enforced (`prisma/schema.prisma:97`, `20260906120000_add_org_membership_role_fk`) |
| Tenant isolation | **PRODUCTION-READY** | Multi-layer defense: middleware JWT permissions check (`src/middleware.ts`), `assertTenantAccess` guard (`permission-service.ts:134`), `createTenantScoper` Prisma extension for `Booking`, `Invoice`, `Trip`, `SettlementBatch`, `TravelDocument` (`src/domains/identity/tenant-scoper.ts`), and centralized `TenantRepository` (`src/domains/identity/TenantRepository.ts`) with DB foreign key constraints |
| Money/pricing kernel | COMPLETE | `Money` over `Prisma.Decimal` (`src/lib/finance/index.ts`), 12-stage Decimal pricing pipeline (`src/lib/pricing/engine.ts`), no float Math.round on money in pricing/finance |
| Tax engine | COMPLETE (engine) / orphan DB | versioned date-effective `TaxEngine` (`src/lib/finance/tax-engine.ts:106`); `TaxJurisdiction` model available |
| FX | SIMULATED | `CurrencyService` uses `StaticRateProvider` (hardcoded rates); no FX snapshot persistence; wallet FX exchange posts spread to ledger |
| Booking lifecycle | COMPLETE (engine) | 4 decoupled lifecycles + transition tables (`src/domains/booking/state-machine.ts`), `BookingStatusHistory` on every transition, `PriceSnapshot` persisted, `BookingDomainService` timeline and soft lock verification |
| Inventory | COMPLETE (engine) / hardened | Row-locked atomic holds, 100-thread oversell concurrency test passes (`src/domains/inventory/inventory-concurrency.test.ts`); `InventoryEngine` authoritative on holds/releases |
| Payments core | PARTIAL | PaymentIntent/Attempt/GatewayTransaction/WebhookEvent models wired; webhook has replay window + idempotency + amount/currency validation (`PaymentDomainService.ts:281-480`); signature verification fail-closed; raw body HMAC support |
| PSP integration | MISSING | Zero HTTP calls to external bank PSP; Shetab adapter simulates local redirect; payments fail closed without credentials |
| Refund | **WIRED (admin & domain path)** | `refundBookingAdmin` delegates to `RefundDomainService.processRefund`: full `Refund` + `RefundItem` + policy snapshot + approval + attempt rows, ledger reversal + hold release atomic, deterministic idempotency key + P2002 collapse (`src/domains/refund/RefundDomainService.ts`) |
| Ledger/accounting | COMPLETE | Double-entry invariant enforced (`src/domains/ledger/GeneralLedgerService.ts`), unbalanced-journal rejection tested; templates for wallet/gateway/revenue/FX/refund; unified balance computation (`MONEY-012`) |
| Invoice/Commission/Settlement | **WIRED** | `InvoiceDomainService` (FIN-006/011) generates commercial invoices on confirmed bookings; `CommissionService` (COMM-001/FIN-013..015) calculates tiered agency cuts; `SettlementService` (SET-001) batches supplier payables; all scoped by `organizationId` |
| Outbox/Saga/workers | COMPLETE (in-process) | Transactional outbox + `FOR UPDATE SKIP LOCKED` + backoff + DLQ; saga persistence + compensation + stale-lease recovery (`saga-orchestrator.ts`); workers execute in web process via `instrumentation.ts` |
| Suppliers | MOCK | Ports + canonical models + circuit breaker + health aggregation exist and are tested (`src/domains/supplier/`), adapters return catalog data; live GDS/bedbank credentials not configured |
| ERP Travel File | **WIRED** | `TravelFileDomainService` (ERP-001..007) automatically aggregates confirmed bookings into `Trip` dossiers; Exception Center read/write works with ERP-009 deduplication |
| Documents | COMPLETE | `TravelDocument` model + AES-GCM encryption + `auditDocumentAccess`; tenant-scoped via `TenantRepository` and `tenant-scoper.ts` |
| Auto-Buy Engine | COMPLETE | `AutoBuyService` evaluates rules, holds inventory, debits internal wallet, and triggers booking confirmation with concurrency lock |
| CMS & Content | COMPLETE | `Tour`, `TourDepartureDate`, `TourItineraryDay`, `SignatureExperience`, `Travelogue`, `GuideArticle` models and `ContentService` |
| B2C search UX | COMPLETE | Loading/empty/error/retry + abort-stale-fetch on flights/hotels search; server-side reprice in booking draft; flight comparison & refund modal |
| Quote expiry | COMPLETE | `PriceSnapshot` persistence + soft-lock expiration validation on checkout (`B2C-007/008`) |
| i18n | PARTIAL | `next-intl` canonical, 5 locales × 851 keys in sync, RTL via `dir` on `<html>`; legacy `lt()` inline texts remain in non-critical components |
| OTP/auth | PARTIAL | Hashed OTP (HMAC w/ AUTH_SECRET), 5-min TTL, max 5 attempts, rate limits; sealed AES-256-GCM outbox payload for workers; multi-channel credentials provider |
| Observability | PARTIAL → improving | `health/live` + `health/ready` (cached ledger check); structured JSON logger with PII redaction (`OBS-003/004`); correlation id in responses (`OBS-001`); business telemetry & conversion metrics (`OBS-005`) |
| CI | PARTIAL | PostgreSQL 16 + lint + strict typecheck + unit + build enforced; CI-012 demo build gate; E2E runner; continuous testing |
| Docs | COMPLETE | Version 1.4.1 reconciled across package.json, README, BASELINE, and release notes; reality matrix auto-regenerated |

---

## Top P0 gaps (ranked — these gate the "Critical production gate")

1. **No real PSP integration** — zero live banking network HTTP calls; payments fail closed in production without credentials (`gateway-port.ts:89-111`). → PAY-004/005
2. **Production OTP delivery provider keys** — requires live SMS/WhatsApp gateway credentials (`NotificationProvider.ts`) for physical SMS dispatch. → SEC-003, ASYNC-002
3. **Demo payment path build-time guard** — production build guards in place (`next.config.ts`, `CI-012`), but runtime must strictly ensure `DEMO_MODE=false`.
4. **Live GDS / BedBank supplier credentials** — supplier adapters return seeded catalog flights and hotels; live credentials needed for direct distribution. → SUP-001..004
5. **Worker process isolation** — workers run in-process via `instrumentation.ts`; production scaling requires dedicated worker pod or external scheduler.

## Second-tier gaps (P1)

- In-memory rate limiter (`rate-limiter.ts`) should be backed by Redis cluster for multi-instance deployments.
- `lt()` legacy inline translation calls in auxiliary UI components should be migrated to canonical next-intl keys.
- Currency FX provider currently hardcoded; needs integration with live central bank / financial FX feed.
