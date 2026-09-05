# CHANGELOG — PRODUCTION HARDENING & RECONCILIATION v3.0
**Repository:** `itrip-platform`  
**Date:** 2026-09-05  

---

## Summary of Changes

### 1. Database & Schema (Migration: `20260905062408_production_hardening_core_models`)
- Added `GatewayTransaction` model linked to `PaymentAttempt`.
- Added `WebhookEvent` model with `@@unique([gatewayName, eventId])` for cryptographic replay protection.
- Enhanced `Booking` model with decoupled lifecycle fields: `paymentStatus`, `fulfillmentStatus`, `ticketStatus`, `organizationId`, `branchId`.
- Added relational `BookingStatusHistory` table replacing legacy JSON array dependencies.
- Added `PriceSnapshot` model for immutable price audit trails.
- Added versioned `TaxJurisdiction` and `TaxRule` models.
- Enhanced `JournalLine` with `chartOfAccountId` for direct account references per Section 14.

### 2. Payment Safety (PAY-001 to PAY-008)
- Removed all production simulated payment success paths.
- Isolated demo payment simulation into `DemoPaymentAdapter` which throws a fatal security error when `process.env.DEMO_MODE !== 'true'`.
- Implemented HMAC-SHA256 signature verification in `ShetabGatewayAdapter` and `PaymentDomainService.processWebhook`.
- Enforced 5-minute replay freshness window on all incoming payment webhooks and callbacks.
- Enforced exact amount and currency match against authoritative booking records.
- Guaranteed exactly-once side-effects: duplicate webhooks return duplicate status without re-capturing or double-posting.

### 3. Financial Kernel, Pricing & Tax Engine (MONEY-001 to MONEY-004, PRICE-001, PRICE-002)
- Upgraded `Money` kernel in `src/lib/finance/index.ts` with `MoneyBreakdown`, `MoneyLine`, and `FxSnapshot` preserving rates, timestamps, and sources.
- Replaced all floating-point math in `src/lib/pricing/engine.ts` with Decimal arithmetic and 10,000 Rial step rounding for IRR.
- Implemented canonical 12-stage server pricing pipeline generating immutable `PriceSnapshot` rows linked to bookings.
- Upgraded `TaxEngine` with date-effective, versioned tax rules across jurisdictions (IR, CN, AE, TR, GLOBAL).

### 4. Inventory Concurrency & Expiration (INV-001 to INV-004)
- Implemented explicit PostgreSQL row-locking (`SELECT ... FOR UPDATE`) in `InventoryEngine.createHold`.
- Implemented atomic conditional update pattern on allotments:
  `UPDATE "Allotment" SET booked = booked + $1 WHERE booked + $1 <= total RETURNING *`.
- Implemented `HoldExpirationWorker` (`src/workers/hold-expiration-worker.ts`) to release expired holds asynchronously and safely across server restarts.
- Implemented concurrency test suite verifying `oversell = 0` across 50 simultaneous threads.

### 5. Booking State Machines & Atomicity (BOOK-001 to BOOK-005)
- Decoupled `BookingStatus`, `PaymentStatus`, `FulfillmentStatus`, and `TicketStatus` in `src/domains/booking/state-machine.ts`.
- Integrated relational `BookingStatusHistory` writes on every state transition.
- Implemented atomic hold rollback compensation in `src/actions/booking.ts`: if booking draft creation fails, any acquired hold is immediately released.

### 6. RBAC & Multi-Tenancy (IAM-001 to IAM-003, SEC-001)
- Upgraded `src/domains/identity/permission-service.ts` to prioritize relational `RolePermission` database records.
- Implemented `TenantAuthContext` and `assertTenantAccess` enforcing strict organizational and branch boundaries against cross-tenant data leaks and IDOR.

### 7. General Ledger & Wallet (FIN-001 to FIN-003, WAL-001)
- Standardized double-entry posting kernel ensuring `SUM(DEBIT) === SUM(CREDIT)` across all transactions.
- Implemented idempotent `groupId` guards preventing duplicate postings.
- Added PostgreSQL row-locking `SELECT id FROM "Account" FOR UPDATE` in `postWalletPayment`, preventing concurrent overdrafts.

### 8. Outbox Worker & Saga Orchestration (SAGA-001, SAGA-002, OUTBOX-001, OUTBOX-002)
- Upgraded `OutboxConsumer` to use PostgreSQL `SELECT ... FOR UPDATE SKIP LOCKED` for zero-contention worker claiming.
- Built persistent `SagaWorker` (`src/workers/saga-worker.ts`) supporting step execution outside DB transactions, automatic reverse-order compensations, and crash recovery.

### 9. Supplier Architecture & Search Normalization (SUP-001, SUP-002, SEARCH-001, TZ-001)
- Implemented `createTravelDateTime` in `src/domains/supplier/supplier-orchestration.ts` preserving `localDateTime`, `timezone`, and `utcInstant`.
- Implemented `CircuitBreaker` protecting against supplier timeouts and cascading outages.
- Implemented canonical search response normalization with clear execution statuses (`LOADING`, `RESULTS`, `ZERO_RESULTS`, `SUPPLIER_FAILURE`).

### 10. Financial Reconciliation & Settlement (FIN-004, FIN-005, SET-001)
- Created `SettlementDomainService` generating `SettlementBatch` records tracing booking items, invoices, and ledger payables.
- Integrated automated discrepancy detection filing operational exceptions in the Exception Center on supplier billing statement mismatches.

### 11. Security Hardening
- Restricted Next.js `dangerouslyAllowLocalIP` to development mode only.
- Validated all Next.js security headers (CSP, HSTS, X-Frame-Options).
- Verified full test suite of 96 passing automated tests and clean production build.
