# Firuzo / iTrip — Integration System Map

> Audit scope: **local working tree @ HEAD `a6d8270` (v1.6.0) + 47 modified / 34 untracked files (uncommitted parallel workstream)**
> Audit date: 2026-09-11 · Companion docs: `integration-matrix.md`, `cross-system-bug-matrix.md`, `firuzo-final-integration-audit.md`

---

## 1. Real System Topology (as traced in code)

```text
User (fa/en/ar/zh/ru, RTL-first, PWA)
 ↓
UI (Next.js 16 App Router, React 19, RSC + client islands, Tailwind v4)
 ↓
Client State (Zustand stores: firuzo-auth / firuzo-bookings / firuzo-country,
              versioned + partialize + migration; react-query for server cache)
 ↓
Server Actions ('use server' in src/actions/*)  +  REST API (/api/*)
   ├── CSRF validation (src/lib/security/csrf-protection.ts via middleware)
   ├── Rate limiting (src/lib/security/rate-limiter.ts)
   ├── Correlation id (x-correlation-id minted in middleware)
 ↓
Business Logic — src/domains/* (booking, payments, inventory, ledger, refund,
   identity, finance, erp, events, ai, supplier, settlement, commission, autobuy)
 ↓
Persistence — Prisma 5 / PostgreSQL 16 (67 models, 23+ migrations)
   ├── Money kernel: src/lib/finance (Prisma.Decimal)
   ├── PriceSnapshot / TaxEngine (TaxJurisdiction in DB)
 ↓
External gateways: eCardo (IPN HMAC-SHA256 = capture authority),
   ShetabPsp, Card-to-Card (manual back-office verify), Wallet ledger (internal)
 ↓
Suppliers: FlightSupplierPort / HotelSupplierPort → SEEDED CATALOG (mock data), not live GDS
 ↓
Events: Transactional Outbox (OutboxService) → OutboxConsumer → notifications,
   PNR stamping, audit log; SagaWorker; DLQ + poison isolation
 ↓
ERP/CRM: TravelFile, ExceptionCenter + ExceptionRemediationService, Invoice,
   Settlement, Commission, Customer360, TravelerProfile, Organization
 ↓
Observability: structured-logger (PII masking), /api/health/live, /api/health/ready,
   QueueMetrics, ai-observability traces
```

**Worker runtime (separate process, `npm run worker` / `docker-compose.yml:worker` / `k8s/worker-deployment.yaml`):**
Outbox cycle → Saga cycle → Hold-expiration sweep → Auto-Buy sweep → Queue metrics.
⚠️ The **Vercel deployment has no worker and only one cron** (`/api/cron/auto-buy`) — outbox/saga/hold sweeps do not run there (Vercel = demo posture; real prod path = Docker/k8s where the worker exists).

---

## 2. Domain-by-domain source-of-truth map

| Domain | Source of truth | Persistence | API boundary | Validation | Error handling | AuthN/AuthZ | Tests |
|---|---|---|---|---|---|---|---|
| Identity/Auth | `User` + `OtpVerification` (hashed OTP, TTL 5min, max 5 attempts) | Prisma | NextAuth v5 (`src/auth.ts`), server actions | zod (`profileUpdateSchema`, OTP schemas) | fail-closed middleware, generic action errors | JWT session; relational RBAC | security-primitives, security-fixes suites |
| Permissions | `Role`/`Permission`/`RolePermission`/`UserRole` (relational) | Prisma | `requirePermission()` / `hasErpRole()` in every admin action | permission strings | throw → action catch | server-side only | permission suites |
| Booking | `Booking` (+ `stateHistory` JSON, `BookingStateMachine` 13+ states) | Prisma | `src/actions/booking.ts` (IDs+quantities only; server-side pricing) | `moneySchema`, passenger zod | saga compensations | ownership `customerId===session.user.id` + FINANCE/OPS view | full-journey, booking-lifecycle, state-machine suites |
| Inventory | `Allotment`/`InventoryHold` (TTL tokens, `expiresAt > now` filtering + lazy expiry at capture) | Prisma serializable tx | InventoryEngine | hold TTL | retry on lock timeout; oversell prevented | internal | inventory-concurrency (100 concurrent), hold-race, capture-release-race |
| Pricing | Server-side `pricing/engine.ts` + `PriceSnapshot`; **frontend never authoritative** | Prisma | server actions only | zod | fail-closed unknown items | n/a | domain-logic, checkout-upgrades suites |
| Payment | `PaymentAttempt`/`GatewayTransaction`; webhook HMAC = capture authority; callback route is UX-only | Prisma | `/api/payments/webhook` (rate-limited, fail-closed), `/api/payments/ecardo/callback` (redirect only) | amount tampering + currency checks vs booking | idempotencyKey @unique; booking-scoped replay rejection | signature HMAC-SHA256 timing-safe | payment-safety, ecardo-gateway, card-to-card suites |
| Wallet | Ledger (`Account` `@@unique([ownerType,ownerId,currency])`, `LedgerEntry` groupId) — **no client balance writes** | Prisma | `requestWalletTopUp`, `exchangeWalletCurrency` server actions | balance checks server-side | balanced double-entry invariant | session-gated | phase4-ledger-manifest |
| Refund | `Refund` (`refundNumber` @unique, `idempotencyKey` @unique, `refundId+attemptNumber` @unique) + reversal journal + inventory release | Prisma | admin refund action w/ `booking:refund:approve` | amount caps | escrow overdraft refused | permission + booking linkage | refund suites |
| Invoicing | `Invoice` (`invoiceNumber` @unique) + `InvoiceLine`; `getInvoiceById/getInvoiceByBookingId` enforce owner-or-org-member | Prisma | `src/actions/invoices.ts` (staff bypass via `hasErpRole`) | tax breakdown Decimal | not-found errors | session + owner/member scope | invoice-domain suite |
| Cart | `UnifiedCartService` (server-side bundle pricing, flight+hotel −5%) | booking draft in DB | `createUnifiedBookingDraft` | server-side item resolution (unknown itemId rejected) | hold tokens, soft-lock timer UX | session | phase3-unified-cart suite |
| Suppliers | Seeded catalog (flights-service / hotels-service) — **MOCK, no live GDS** | Prisma/seed | `/api/flights/search`, `/api/hotels/search` | query zod | normalization | public read | search suites |
| Events/Async | `OutboxEvent` (`gatewayName+eventId` @unique on webhooks), DLQ, stale PROCESSING recovery (2min), clock-skew tolerance | Prisma | worker only | payload checks | retry → DLQ, poison isolation | internal | worker-crash-recovery, saga-outbox-crash, saga-idempotency suites |
| AI | AiRouterService (Gemini→DeepSeek→OpenAI→Claude failover, cooldowns); **AI never books/prices — PlannerGroundingService separates suggestion from inventory** | none (stateless) | `/api/plan/refine` (zod, max 1000 chars) | prompt-injection guard (EN+FA), output sanitization, MCP tool authorization | all-provider failure error | rate-limited | ai-security-guard, ai-observability suites |
| Loyalty | `LoyaltyStreakService` — server-authoritative, Asia/Tehran calendar day, idempotent claim | Prisma + ledger | `/api/loyalty/claim` | anti-abuse idempotency | duplicate claim rejected | session | streak suites |
| B2B | `Organization`/`Branch`/`Membership` (`@@unique([organizationId,userId])`); bookings carry `organizationId/branchId`; invoices resolve tenant | Prisma | `organizations.ts` actions (`user:manage`/`booking:view:all`) | DTO zod | not-found | permission-gated; member-scoped corporate bookings | organization-service suite |
| Notifications | Outbox events → channel providers (Telegram production provider, email) | Prisma | worker-driven | payload checks | DLQ on failure | internal | event suites |

---

## 3. Deployment reality (repo vs live)

| Surface | Local tree | Live (vercel) |
|---|---|---|
| Version / commit | v1.6.0 + **uncommitted delta (47 modified, 34 new files)** | v1.6.0 @ `a6d8270` exactly = local HEAD |
| DEMO_MODE | `false` (all env files) | `production` |
| Worker runtime | code present (`src/workers`, docker, k8s) | **not deployed on Vercel** (serverless; single daily cron for auto-buy) |
| Shetab/eCardo | fail-closed without credentials | fail-closed (no live PSP creds) |
| Flight/Hotel supply | seeded catalog | same seeded catalog |

## 4. Classification legend used in the matrix
- **REAL** — verified in code + tests, no simulation in the path
- **BETA** — real logic; external side effects still pending (e.g. bank payout, SMS provider)
- **SIMULATED** — logic exists but the external leg is simulated/fail-closed
- **MOCK** — data or engine is seeded/static
- **COMING_SOON** — UI gated off intentionally
