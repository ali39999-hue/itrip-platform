# REALITY RECONCILIATION REPORT (ARCH-001, ARCH-002)
**Project:** iTRIP / Firuzo Travel Platform & Travel ERP  
**Repository:** https://github.com/ali39999-hue/itrip-platform  
**Inspection Date:** 2026-09-05  
**Target Quality:** 9/10 Production-Grade Travel Platform + Travel ERP  
**Database:** PostgreSQL 16 (active schema: public, 9 baseline migrations applied)

---

## 1. Executive Summary

A comprehensive architectural and implementation reality audit of the `itrip-platform` repository was conducted against the physical codebase, PostgreSQL database schema, migrations, domain services, application layer, UI components, tests, and configuration.

### Key Reality Findings:
1. **Database & Schema Baseline:** 
   The database is running PostgreSQL with 9 applied migrations. While models such as `ChartOfAccounts`, `JournalEntry`, `JournalLine`, `Refund`, `SagaExecution`, `OutboxEvent`, `OperationalException`, `SupplierConnection`, `CommissionRule`, and `SettlementBatch` exist in `schema.prisma`, several domain services either still use the intermediate model (`Account`, `LedgerEntry`), store status history as JSON arrays (`Booking.stateHistory`), or rely on in-memory / JS floating-point calculations.
2. **Payment Engine (P0):**
   `PaymentDomainService.processPayment` has a working idempotency guard and booking scope guard, but `ShetabGatewayAdapter` and `InternalWalletGatewayAdapter` return simulated tokens and immediate approvals. No cryptographic HMAC webhook verification, timestamp replay window, or merchant validation exists.
3. **Money & Finance (P0):**
   A kernel `Money` class backed by `Prisma.Decimal` exists in `src/lib/finance/index.ts`, but core application code in `src/lib/pricing/engine.ts`, `src/actions/booking.ts`, and `BookingDomainService.ts` still uses standard JS floating-point numbers (`number`), `Math.round()`, and hardcoded markups and taxes.
4. **Tax & Pricing Engine (P0):**
   `TaxEngine` currently uses static in-memory lookup tables instead of versioned, date-effective database rules (`TaxRule`, `TaxRate`, `TaxJurisdiction`, `effectiveFrom`, `effectiveTo`). Pricing calculation produces transient numbers without persisting an immutable, audit-safe `PriceSnapshot`.
5. **Inventory Concurrency & Expiration (P0):**
   `InventoryEngine.createHold` uses DB transaction isolation with retry logic and has a passing race test for 6 concurrent holds. However, oversell protection relies on aggregate reads rather than PostgreSQL atomic conditional updates (`UPDATE ... WHERE booked + requested <= total`). Hold expiration sweeper exists as a helper method (`sweepExpiredHolds`), but there is no dedicated background worker or scheduled job releasing expired holds.
6. **Booking Lifecycle & Status History (P0):**
   `BookingStateMachine` validates state transitions, but lifecycle status is overloaded in a single `Booking.status` column. Transitions between separate states (`PaymentStatus`, `FulfillmentStatus`, `TicketStatus`) are not decoupled. Status history is stored as a JSON string (`stateHistory`) on the `Booking` record rather than in a relational, SQL-queryable `BookingStatusHistory` table.
7. **Identity, RBAC & Multi-Tenancy (P0):**
   Relational RBAC tables (`Role`, `Permission`, `RolePermission`, `UserRole`) and B2B tables (`Organization`, `OrganizationBranch`, `OrganizationMembership`) exist in schema and migrations. However, `getUserPermissions` still falls back to legacy `User.role` string defaults and `Role.permissions` JSON. B2B tenant isolation (`organizationId` scoping on bookings, trips, payments) is not enforced at repository or query level.
8. **Double-Entry Accounting & Ledger Idempotency (P0):**
   `GeneralLedgerService` enforces `getAccountBalance` and checks balances before debiting, but operates on the older `Account` / `LedgerEntry` tables rather than the new `ChartOfAccounts` / `JournalEntry` / `JournalLine` models. Debit = Credit invariants are not enforced by database triggers or atomic posting group invariants.
9. **Saga Orchestration & Outbox (P0):**
   `BookingSagaOrchestrator` executes multiple steps (payment, inventory capture, ledger posting) inside a single giant PostgreSQL transaction block (`prisma.$transaction`), contradicting the distributed saga pattern where external provider side effects must happen outside the DB transaction with persistent steps and compensation.
10. **Supplier Integrations & Search (P1):**
    `FlightSupplierPort` and `HotelSupplierPort` interfaces exist, but implementations return hardcoded mock offers. Normalized data pipelines and resilient circuit breakers / retry policies are needed.

---

## 2. Reality Reconciliation Matrix

| Area | Docs | DB | Domain | Application | API | UI | Tests | Runtime | Status | Risk |
|---|---|---|---|---|---|---|---|---|---|---|
| **Payment Integrity & PSP Gateways** | COMPLETE | PARTIAL | PARTIAL | PARTIAL | PARTIAL | COMPLETE | PARTIAL | SIMULATED | **PARTIAL** | **HIGH** |
| **Money & Precision Kernel** | COMPLETE | COMPLETE | PARTIAL | PARTIAL | PARTIAL | COMPLETE | PARTIAL | PARTIAL | **PARTIAL** | **HIGH** |
| **Tax Engine & Versioned Rules** | COMPLETE | MISSING | PARTIAL | PARTIAL | MISSING | PARTIAL | PARTIAL | SIMULATED | **PARTIAL** | **HIGH** |
| **Pricing Engine & Price Snapshots** | COMPLETE | PARTIAL | PARTIAL | PARTIAL | PARTIAL | COMPLETE | PARTIAL | PARTIAL | **PARTIAL** | **HIGH** |
| **Inventory Concurrency & Allocation** | COMPLETE | COMPLETE | PARTIAL | COMPLETE | N/A | COMPLETE | COMPLETE | PARTIAL | **PARTIAL** | **HIGH** |
| **Hold Expiration Worker** | COMPLETE | COMPLETE | PARTIAL | MISSING | MISSING | N/A | MISSING | MISSING | **MISSING** | **HIGH** |
| **Booking Model (Split Aggregates)** | COMPLETE | PARTIAL | PARTIAL | PARTIAL | PARTIAL | COMPLETE | PARTIAL | PARTIAL | **PARTIAL** | **HIGH** |
| **Booking State Machine (Decoupled)** | COMPLETE | PARTIAL | COMPLETE | PARTIAL | PARTIAL | COMPLETE | COMPLETE | PARTIAL | **PARTIAL** | **MEDIUM** |
| **Relational Booking Status History** | COMPLETE | MISSING | LEGACY | LEGACY | LEGACY | COMPLETE | LEGACY | LEGACY | **LEGACY** | **HIGH** |
| **Booking & Hold Atomicity** | COMPLETE | COMPLETE | PARTIAL | COMPLETE | N/A | COMPLETE | PARTIAL | PARTIAL | **PARTIAL** | **MEDIUM** |
| **Relational RBAC & Authority** | COMPLETE | COMPLETE | PARTIAL | PARTIAL | COMPLETE | COMPLETE | COMPLETE | PARTIAL | **PARTIAL** | **MEDIUM** |
| **B2B Tenant Isolation (IAM-002)** | COMPLETE | COMPLETE | MISSING | MISSING | PARTIAL | PARTIAL | MISSING | MISSING | **PARTIAL** | **HIGH** |
| **Accounting / Chart of Accounts** | COMPLETE | COMPLETE | LEGACY | LEGACY | N/A | COMPLETE | PARTIAL | LEGACY | **LEGACY** | **HIGH** |
| **Ledger Idempotency & Reversals** | COMPLETE | COMPLETE | PARTIAL | PARTIAL | N/A | COMPLETE | COMPLETE | PARTIAL | **PARTIAL** | **MEDIUM** |
| **Authoritative Wallet Debits** | COMPLETE | COMPLETE | COMPLETE | COMPLETE | N/A | COMPLETE | COMPLETE | COMPLETE | **PRODUCTION-READY** | **LOW** |
| **Saga Orchestrator & Compensations** | COMPLETE | COMPLETE | PARTIAL | PARTIAL | N/A | N/A | MISSING | PARTIAL | **PARTIAL** | **HIGH** |
| **Outbox Worker & Dead-Letter Queue** | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | N/A | COMPLETE | COMPLETE | **PRODUCTION-READY** | **LOW** |
| **Supplier Ports & Adapters** | COMPLETE | COMPLETE | PARTIAL | PARTIAL | COMPLETE | COMPLETE | PARTIAL | SIMULATED | **SIMULATED** | **MEDIUM** |
| **Canonical Search Normalization** | COMPLETE | N/A | PARTIAL | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | **PRODUCTION-READY** | **LOW** |
| **Flight & Hotel Deep Data Models** | COMPLETE | COMPLETE | PARTIAL | COMPLETE | COMPLETE | COMPLETE | PARTIAL | COMPLETE | **PRODUCTION-READY** | **LOW** |
| **Travel Timezone Safety** | COMPLETE | N/A | PARTIAL | PARTIAL | PARTIAL | COMPLETE | MISSING | PARTIAL | **PARTIAL** | **MEDIUM** |
| **Refund Domain & Lifecycle** | COMPLETE | COMPLETE | COMPLETE | COMPLETE | N/A | COMPLETE | COMPLETE | COMPLETE | **PRODUCTION-READY** | **LOW** |
| **Reconciliation & Settlements** | COMPLETE | COMPLETE | PARTIAL | PARTIAL | N/A | COMPLETE | PARTIAL | PARTIAL | **PARTIAL** | **MEDIUM** |
| **Operational Exception Center** | COMPLETE | COMPLETE | PARTIAL | PARTIAL | N/A | COMPLETE | PARTIAL | COMPLETE | **PARTIAL** | **MEDIUM** |
| **ERP Travel File & Global Search** | COMPLETE | COMPLETE | PARTIAL | COMPLETE | COMPLETE | COMPLETE | PARTIAL | COMPLETE | **PRODUCTION-READY** | **LOW** |
| **Document & PII Security** | COMPLETE | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | COMPLETE | PARTIAL | **PARTIAL** | **HIGH** |
| **Next.js & Infrastructure Security** | COMPLETE | N/A | COMPLETE | COMPLETE | COMPLETE | N/A | COMPLETE | COMPLETE | **PRODUCTION-READY** | **LOW** |
| **i18n & Multi-Locale / RTL** | COMPLETE | N/A | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | **PRODUCTION-READY** | **LOW** |
| **Health Checks (/live, /ready)** | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | N/A | COMPLETE | COMPLETE | **PRODUCTION-READY** | **LOW** |

---

## 3. Detailed Evidence per Problem Area

### 3.1 P0 — Payment Correctness (PAY-001 to PAY-008)
- **Current Evidence:**
  - `PaymentDomainService.processPayment`: Checks idempotency and rejects cross-booking key replay.
  - `PaymentDomainService.processWebhook`: Checks amount tampering and currency mismatch against booking record.
  - **Flaw / Simulated Path:** `ShetabGatewayAdapter` generates a pseudo-token `shb_${Date.now()}` and returns `redirectUrl: https://sep.shaparak.ir/OnlinePayment.aspx?ref=...`. `verifyPayment` immediately returns `verified: true, status: 'CAPTURED'` without contacting an actual gateway, validating merchant IDs, checking HMAC signatures, or enforcing replay timestamps.
  - **Required Action:**
    1. Separate `RealShetabGatewayAdapter` from `DemoShetabGatewayAdapter`.
    2. In production mode (`DEMO_MODE !== 'true'`), reject demo/simulated payments and fail closed.
    3. Implement HMAC-SHA256 signature verification, merchant identity matching, and timestamp freshness check (e.g. 5-minute replay window) on webhooks/callbacks.
    4. Implement `GatewayTransaction` audit record linked to `PaymentAttempt`.

### 3.2 P0 — Money & Financial Integrity (MONEY-001, MONEY-002)
- **Current Evidence:**
  - `src/lib/finance/index.ts` provides a `Money` class based on `Prisma.Decimal`.
  - However, `src/lib/pricing/engine.ts` uses JavaScript numbers for `basePrice`, `rawMarkup`, `serviceFee`, `rawTax`, `unroundedSellPrice`, and uses `Math.round()`.
  - `src/domains/booking/BookingDomainService.ts` accepts `baseAmount: number` and outputs `MoneyBreakdown` with `number` fields.
  - **Required Action:**
    1. Refactor `calculatePricing` and `MoneyBreakdown` to operate strictly with `Money` / `Prisma.Decimal`.
    2. Eliminate all `Math.round()` on currency values and use `Decimal.ROUND_HALF_UP` with explicit precision policies.
    3. Persist immutable `PriceSnapshot` with `baseAmount`, `markupAmount`, `taxAmount`, `serviceFee`, `discountAmount`, `currency`, `fxRate`, and `effectiveRuleIds`.

### 3.3 P0 — Tax Engine & Versioned Rules (MONEY-003)
- **Current Evidence:**
  - `TaxEngine` in `src/lib/finance/tax-engine.ts` uses an in-memory dictionary `defaultRates: Record<string, number> = { 'IR:GENERAL': 0.09, ... }`.
  - There is no database table for tax rules or date-effective rule tracking.
  - **Required Action:**
    1. Add `TaxRule` and `TaxJurisdiction` models to schema (or formalize versioned tax rule definitions with `effectiveFrom`, `effectiveTo`, `category`, `jurisdiction`, `rate`).
    2. Update `TaxEngine` to evaluate versioned rules and output an immutable tax breakdown for bookings.

### 3.4 P0 — Inventory Concurrency & Allocation (INV-001, INV-002, INV-004)
- **Current Evidence:**
  - `InventoryEngine.createHold` uses `prisma.$transaction` with `Serializable` isolation and retries on lock timeout.
  - However, in PostgreSQL, `allotment.total - allotment.booked - heldQty` is checked via separate queries before insert, which is vulnerable under non-serializable transactions or race spikes.
  - **Required Action:**
    1. Implement PostgreSQL-safe row-locking or conditional atomic updates:
       `UPDATE "Allotment" SET "booked" = "booked" + $1 WHERE "inventoryItemId" = $2 AND "date" = $3 AND "booked" + "held" + $1 <= "total" RETURNING *;`
    2. Concurrency tests: verify 100 concurrent holds and captures deterministically prevent oversell (oversell = 0).

### 3.5 P0 — Hold Expiration Worker (INV-003)
- **Current Evidence:**
  - `InventoryEngine.sweepExpiredHolds()` exists as a static method, but nothing calls it periodically.
  - Expired inventory holds remain locked until someone invokes a sweep or attempts a hold that queries `expiresAt > now`.
  - **Required Action:**
    1. Create a dedicated background hold expiration worker / job handler (`src/workers/hold-expiration-worker.ts`).
    2. Provide an automated interval runner or endpoint with idempotency and structured logging.

### 3.6 P0 — Relational Booking Status History & Decoupled States (BOOK-001 to BOOK-005)
- **Current Evidence:**
  - `Booking.stateHistory` in `prisma/schema.prisma` is a text field containing a JSON array: `"[{\"from\":\"DRAFT\",\"to\":\"HELD\"}]"`.
  - Status is overloaded: `Booking.status` contains `DRAFT`, `HELD`, `PENDING_PAYMENT`, `PAYMENT_CONFIRMED`, `CONFIRMED`, `CANCELLED`, `REFUNDED`, etc.
  - **Required Action:**
    1. Add relational `BookingStatusHistory` model with fields `id`, `bookingId`, `fromStatus`, `toStatus`, `actor`, `reason`, `correlationId`, `createdAt`.
    2. Add separate lifecycle statuses: `paymentStatus`, `fulfillmentStatus`, `ticketStatus` on `Booking`.
    3. Migrate consumers from JSON `stateHistory` to `BookingStatusHistory`.

### 3.7 P0 — RBAC Consolidation & B2B Tenant Isolation (IAM-001 to IAM-003)
- **Current Evidence:**
  - Relational `Role`, `Permission`, `RolePermission`, and `UserRole` tables exist.
  - However, `getUserPermissions` in `permission-service.ts` still has fallback mapping from `ROLE_DEFAULT_PERMISSIONS[user.role]` and JSON `ur.role.permissions`.
  - `Booking` has `customerId` (User ID), but lacks `organizationId` or `branchId` scoping for B2B multi-tenancy.
  - **Required Action:**
    1. Consolidate permission resolution: relational `RolePermission` must be authoritative.
    2. Ensure B2B entity queries enforce tenant scoping (`organizationId`, `branchId`) preventing cross-tenant access and IDOR.

### 3.8 P0 — Accounting Consolidation & Dual-Entry Ledger (FIN-001 to FIN-003)
- **Current Evidence:**
  - Schema has two parallel sets of accounting models:
    a) `ChartOfAccounts`, `JournalEntry`, `JournalLine`
    b) `Account`, `LedgerEntry`
  - `GeneralLedgerService` currently posts to `Account` and `LedgerEntry`.
  - **Required Action:**
    1. Consolidate accounting onto the canonical double-entry model (`ChartOfAccounts`, `JournalEntry`, `JournalLine`).
    2. Create standardized posting templates: Payment, Revenue Realization, Tax Payable, Supplier Liability, Settlement, Refund, Commission.
    3. Guarantee `SUM(DEBIT) = SUM(CREDIT)` invariant across all posting groups.

### 3.9 P0 — Saga Workflow Orchestration & Crash Recovery (SAGA-001, SAGA-002)
- **Current Evidence:**
  - `BookingSagaOrchestrator.confirmBookingSaga` executes payment, inventory hold capture, ledger posting, and status updates inside a single `prisma.$transaction`.
  - If an external supplier API is called inside this block, it holds open a DB transaction, causing connection exhaustion and inability to recover if a crash occurs mid-flight.
  - **Required Action:**
    1. Implement persistent Saga state transitions:
       `Command` -> `create SagaExecution` -> `create SagaStep` -> `create OutboxEvent` -> `commit` -> `worker executes step` -> `persist result` -> `compensation on failure`.
    2. Provide crash-recovery simulation tests.

---

## 4. Immediate Execution Plan

Proceed with Phase 1 through Phase 16 as mandated by Master Prompt v3.0:
- **Phase 1:** Payment Safety & Gateway Hardening (PAY-001 to PAY-008)
- **Phase 2:** Money, Pricing Pipeline, Versioned Tax Engine & FX Snapshots (MONEY-001 to MONEY-004, PRICE-001, PRICE-002)
- **Phase 3:** Inventory Concurrency, Atomic Holds & Expiration Worker (INV-001 to INV-004)
- **Phase 4:** Booking State Machines, Split Lifecycle Statuses & Relational History (BOOK-001 to BOOK-005)
- **Phase 5:** Relational RBAC Authority & B2B Tenant Isolation (IAM-001 to IAM-003, SEC-001)
- **Phase 6:** Accounting Consolidation & Ledger Invariants (FIN-001 to FIN-003, WAL-001)
- **Phase 7:** Durable Outbox & Saga Worker Crash Recovery (SAGA-001, SAGA-002, OUTBOX-001, OUTBOX-002)
- **Phase 8-15:** Supplier Adapters, Refund Domain, ERP Travel File, Security, CI/CD and Comprehensive QA.
