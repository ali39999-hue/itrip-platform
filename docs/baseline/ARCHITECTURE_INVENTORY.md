# BASE-002 — Repository Architecture Inventory

Generated 2026-09-06 at baseline commit `0fc1a105` (branch `feat/booking-travel-date`).
Code size: ~37,900 lines under `src/` (of which ~2,900 are the unit-test files).

## Stack

Next.js 16.3.2 App Router · React 19.2.8 · Prisma 5.22 (PostgreSQL) · next-auth v5 beta ·
next-intl 4 (en/fa/ar/zh/ru, default fa) · Zustand 5 · Tailwind 4 · Vitest 4 · Playwright 1.62.

## Layers

| Layer | Location | Contents |
|---|---|---|
| Presentation | `src/app/[locale]/**` (41 pages) | B2C (home, flights/hotels search+checkout, my-trips, wallet, plan), account/auth, admin ERP (dashboard, bookings, finance, inventory, suppliers, ops, exceptions, content, travel-files), ancillary services pages |
| API routes | `src/app/api/**` (8 handlers) | `auth/[...nextauth]`, `flights/search`, `hotels/search`, `hotels/[id]`, `admin/search`, `health/live`, `health/ready`, `payments/webhook` |
| Application | `src/actions/**` | `booking.ts` (671 lines: draft/pay/wallet), `admin.ts` (ERP admin commands/queries), `auth.ts` (login/OTP/profile) |
| Domain | `src/domains/**` | booking (state machine, domain service, saga orchestrator), payments (PaymentDomainService, gateway-port), inventory (InventoryEngine), ledger (GeneralLedgerService, ReconciliationService), identity (permission-service, tenant-scoper), refund (RefundDomainService), finance (Invoice/Commission/Settlement/three-way reconciliation), supplier (ports + orchestration + circuit breaker), currency (CurrencyService), events (OutboxConsumer, NotificationProvider) |
| Infrastructure/lib | `src/lib/**` | `finance/` (Money kernel over Prisma.Decimal, tax-engine), `pricing/engine.ts` (12-stage Decimal pipeline), `security/` (AES-256-GCM crypto-vault, rate-limiter), `money.ts` (display formatting), `prisma.ts` (client + tenant-scoped extension), data catalogs (`data.ts`, `hotel-mock.ts`, `data/server/*.json`), `services/flights-service.ts`, `services/hotels-service.ts` |
| Workers | `src/workers/**` + `src/instrumentation.ts` | hold-expiration (60s), outbox consumer (10s), saga worker (15s), ledger reconciliation (30min) — started by `instrumentation.register()` inside the web process |
| Stores | `src/stores/**` | auth-store, booking-store, country-store (Zustand + persist) |

## Prisma schema

51 models, 0 enums (all statuses are `String`; legality enforced in `src/domains/booking/state-machine.ts`).
15 migrations (`20260904121737_init_postgresql_baseline` … `20260905233000_add_booking_travel_date`).
Groups: identity/org/RBAC (11), booking (5), inventory (3), payments (5), ledger/accounting/tax (7),
refund/settlement/invoicing (9), supplier (6), ERP/platform ops (5). Full ownership map → `DB_MODEL_OWNERSHIP.md`.

## Tests

- **Unit/domain (Vitest): 19 files, ~106 cases** under `src/**` — booking lifecycle & state machine,
  tenant isolation/RBAC, inventory hold races + 100-thread oversell, payment safety (webhook/idempotency),
  ledger double-entry, refund/settlement/reconciliation, money/pricing/tax Decimal kernel, saga/outbox crash
  recovery, i18n completeness (5 locales), crypto-vault, rate-limiter, supplier ports/circuit breaker.
- **E2E (Playwright): 15 spec files** — 5 golden journeys, critical flows, ERP portal, kernel invariants,
  crawler audit (all routes × fa/en/ar), i18n, search, home/navigation/planner, image scan.
- Playwright config: workers=1, chromium + mobile-chromium (Pixel 5).

## CI (`.github/workflows/ci.yml`)

Job `audit-and-verify`: Postgres 16 service → lint → typecheck → `migrate deploy` + seed → unit tests →
production build. Job `e2e-gate`: golden journeys desktop+mobile (**`continue-on-error: true` — non-blocking**).
Gaps: no DEMO_MODE build guard, no schema-drift check, no secrets scan, `NEXT_PUBLIC_DEMO_MODE=true` leaks
into the CI build env (job-level, not overridden at build step).

## Security-relevant config

- `next.config.ts`: HSTS, nosniff, X-Frame-Options, CSP (`script-src` includes `'unsafe-eval' 'unsafe-inline'`),
  dev-only local-IP allowances, 6 image remote patterns.
- `src/middleware.ts`: locale routing, `/login` redirect, **admin JWT gate** with coarse `ROUTE_PERMISSIONS`
  map (fails closed without AUTH_SECRET), then next-intl middleware.
- Rate limiting: in-memory token bucket (`src/lib/security/rate-limiter.ts`) — per-instance only.
- PII: AES-256-GCM field encryption (`crypto-vault.ts`) used by booking/auth actions + `auditDocumentAccess`.

## Docs present at baseline

README, HANDOFF, ARCHITECTURE, ACCOUNTING_MODEL, BOOKING_LIFECYCLE, PAYMENT_FLOW, INVENTORY_CONCURRENCY,
ERP_OPERATIONS, PRODUCTION_READINESS (claims 9.2/10), SECURITY_AUDIT (claims PASS 9/10),
REALITY_RECONCILIATION, TEST_STRATEGY, 2 hardening changelogs, `docs/` (master spec v2, backlog, ERP plan,
PRD v2.1, production checklist, ledger-and-saga architecture). Version claims disagree (see BASE-010).
