# iTRIP / FIRUZO — SYSTEM ARCHITECTURE SPECIFICATION
**Version:** 3.0 (Production Hardened)  
**Architectural Style:** Modular Monolith with Outbox & Saga Orchestration  
**Primary Language & Framework:** TypeScript 5, Next.js 16 (App Router), React 19  
**Database & ORM:** PostgreSQL 16+, Prisma ORM (Prisma Migrate)  
**State & Style:** Tailwind CSS 4, Zustand 5, next-intl  

---

## 1. High-Level Modular Monolith Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                            │
│   B2C Mobile/Desktop Portal    │    B2B Agency Portal    │    ERP Ops  │
│   (Faceted Search, Booking,   │    (Wholesale Pricing,  │    (Travel  │
│    Checkout, Wallet, Trips)   │     Staff, Allotments)  │     Files)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                          APPLICATION LAYER                             │
│   Server Actions & API Routes (Thin Controller Pattern)                │
│   - Authorization Context Guard (Tenant Scoping, RBAC)                 │
│   - Request Validation (Zod Schemas)                                   │
│   - Application Commands & Queries                                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                            DOMAIN LAYER                                │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Identity & Access (Relational RBAC, Multi-Tenant Context)      │   │
│   │ Booking Aggregate (Multi-Dimensional Lifecycle State Machine)  │   │
│   │ Financial Kernel (Money, Versioned Tax, 12-Stage Pricing)      │   │
│   │ Inventory Engine (Row-Locked Holds, Atomic Conditional Updates)│   │
│   │ Payment Core (HMAC Signed Webhooks, Authoritative Lifecycle)   │   │
│   │ Refund Engine (Eligibility, Policy Snapshots, Ledger Credits)  │   │
│   │ General Ledger (Chart of Accounts, Balanced Double-Entry)      │   │
│   │ Reconciliation & Settlement (Statement Mismatch, Exceptions)   │   │
│   └────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                       INFRASTRUCTURE & WORKERS                         │
│   PostgreSQL 16 DB  │  PSP Gateways  │  GDS & BedBanks  │  Outbox Worker │
│   (Row Locks, JSON  │  (HMAC Verify, │  (Circuit Break, │  (SKIP LOCKED, │
│    Snapshots, Acid) │   Fail-Closed) │   Normalizers)   │   Saga Engine) │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Domain Boundaries & Responsibilities

### 2.1 Identity, Multi-Tenancy & RBAC (`src/domains/identity/`)
- **Entities:** `User`, `Organization`, `OrganizationBranch`, `OrganizationMembership`, `Role`, `Permission`, `RolePermission`, `UserRole`.
- **Invariants:**
  - Relational `RolePermission` is the authoritative source for permissions.
  - Principal -> Organization Context -> Branch Context -> Scope.
  - Users belonging to Organization A cannot query, update, or inspect Organization B records (IDOR and cross-tenant guard).

### 2.2 Financial Kernel & Pricing (`src/lib/finance/`, `src/lib/pricing/`)
- **Entities:** `Money`, `TaxRule`, `TaxJurisdiction`, `PriceSnapshot`.
- **Invariants:**
  - Zero JavaScript floating-point arithmetic on monetary values. All arithmetic uses `Prisma.Decimal` with explicit rounding.
  - 12-Stage Server Pricing Pipeline: Supplier Base Cost → Supplier Fee → Markup → Channel Rule → Customer Rule → Platform Fee → Versioned Tax → Promotion → Payment Fee → FX → Rounding → Final Authoritative Sell Price & Immutable `PriceSnapshot`.

### 2.3 Inventory Concurrency & Allocation (`src/domains/inventory/`, `src/workers/`)
- **Entities:** `Supplier`, `InventoryItem`, `Allotment`, `InventoryHold`.
- **Invariants:**
  - Oversell invariant: `oversell = 0`.
  - PostgreSQL row-locking (`FOR UPDATE`) on allotment rows during hold creation.
  - Atomic conditional update on allotment booking:
    `UPDATE "Allotment" SET booked = booked + $1 WHERE booked + $1 <= total`.
  - `HoldExpirationWorker` sweeps expired holds asynchronously and safely across crashes and instance restarts.

### 2.4 Payment Domain (`src/domains/payments/`)
- **Entities:** `PaymentIntent`, `PaymentAttempt`, `GatewayTransaction`, `WebhookEvent`, `Payment`.
- **Invariants:**
  - Canonical lifecycle: `PaymentIntent` → `PaymentAttempt` → `GatewayTransaction` → `WebhookEvent` → verification → capture → ledger posting → booking transition.
  - Mandatory HMAC-SHA256 signature verification.
  - Replay protection with 5-minute freshness window.
  - Demo payment adapter isolated behind feature flag and fails closed in production (`DEMO_MODE !== 'true'`).

### 2.5 Booking Domain (`src/domains/booking/`)
- **Entities:** `Trip`, `Booking`, `BookingItem`, `BookingStatusHistory`, `PriceSnapshot`.
- **Invariants:**
  - Decoupled lifecycle dimensions: `BookingStatus`, `PaymentStatus`, `FulfillmentStatus`, `TicketStatus`.
  - All status transitions validated against strict state machines (`assertTransition`).
  - Historical transitions queryable through relational SQL (`BookingStatusHistory`).
  - Booking + Hold atomicity: Automatic compensation releases hold if booking record persistence fails.

### 2.6 General Ledger & Double-Entry Accounting (`src/domains/ledger/`)
- **Entities:** `ChartOfAccounts`, `JournalEntry`, `JournalLine`, `Account`, `LedgerEntry`.
- **Invariants:**
  - Canonical double-entry model: every debit has an equal and opposite credit (`SUM(DEBIT) === SUM(CREDIT)`).
  - Deterministic idempotency: `groupId` uniqueness check prevents duplicate postings.
  - Wallet debits use PostgreSQL row locking (`SELECT id FROM "Account" FOR UPDATE`) to prevent concurrent overdrafts.

### 2.7 Saga Orchestration & Outbox Worker (`src/domains/events/`, `src/workers/`)
- **Entities:** `OutboxEvent`, `SagaExecution`, `SagaStep`.
- **Invariants:**
  - Outbox claiming uses `SELECT ... FOR UPDATE SKIP LOCKED` for zero-contention multi-worker scaling.
  - Long external calls are executed outside giant database transactions.
  - Automatic reverse-order compensation triggered on step failure.
  - Crash recovery: workers resume without duplicate external side effects.
