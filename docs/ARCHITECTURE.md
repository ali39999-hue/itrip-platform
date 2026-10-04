# FIRUZO CHILD — TARGET ARCHITECTURE SPECIFICATION

**Document:** Child Platform Architecture Specification  
**Authority:** Section 3, 4, 9, 37 of Master Roadmap  
**Status:** Canonical Baseline Architecture  
**Target:** Independent Specialist Travel Operating System  

---

## 1. Architectural Philosophy & Principles

The Child is **not** a clone or thin skin of Firuzo; it is an independent specialist travel platform with its own information architecture, domain models, UX system, and operational rules, integrated with Firuzo Core via explicit, versioned contracts.

### Core Principles
- **P01 — Domain Ownership First:** Every entity has exactly one authoritative owner. No dual-master synchronization loops.
- **P02 — Contract Before Coupling:** The Child never queries Firuzo Core tables directly. All inter-system requests flow through typed contracts (`FiruzoCoreClient`).
- **P03 — Child Business Logic Stays Child-Owned:** Eligibility, specialist qualification, tour pricing, deposit rules, and traveler preparation checklists remain 100% Child-managed.
- **P04 — UX Independence:** The Child possesses dedicated design tokens (`--fz-*`), specialized page layouts, bespoke interaction models, and specialized mobile ergonomics.
- **P05 — Mobile First:** Viewports < 768px drive all UX patterns: sticky thumb-zone action bars, bottom sheets instead of centered modals, 44×44px touch targets.

---

## 2. High-Level Architecture Topology

```text
                        ┌─────────────────────────────────┐
                        │          FIRUZO CORE            │
                        │                                 │
                        │  Global Identity / Relational   │
                        │  Payment Gateways / Ledger      │
                        │  SMS & Notification Pipeline    │
                        │  File & Media Storage Vault     │
                        └───────────────┬─────────────────┘
                                        │
                         Versioned SDK / Adapter Contract
                            (FiruzoCoreClient Interface)
                                        │
                                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FIRUZO CHILD PLATFORM                           │
│                                                                        │
│  Experience & Presentation Layer                                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Technology Tours │ Health & Wellness │ Specialist Verticals     │  │
│  │ Mobile Thumb Zone Actions │ GoalWheel │ Request Stepper UI       │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│  Specialist Domain Engine           │                                  │
│  ┌──────────────────────────────────▼───────────────────────────────┐  │
│  │ Catalog & Packages │ Departure Allotments │ Addons & Subsidies  │  │
│  │ 6-Stage State Machine │ Integer Rial Pricing │ Document Checks  │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│  Platform Integration Adapter       │                                  │
│  ┌──────────────────────────────────▼───────────────────────────────┐  │
│  │ InProcessFiruzoCoreClient (Network-Ready Interface)             │  │
│  │ Holds │ Bookings │ Revenue Realization │ Exception Logging       │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│  Persistence & Audit Storage        │                                  │
│  ┌──────────────────────────────────▼───────────────────────────────┐  │
│  │ 11 Dedicated PostgreSQL Tables (Business* Namespace)             │  │
│  │ Append-Only BusinessStatusEvent Audit Stream                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Boundary & Adapter Strategy

### 3.1 `FiruzoCoreClient` Interface
The boundary is defined in `src/domains/business/core/FiruzoCoreClient.ts`:
- **Identity & Context:** `getUser(userId)`, `getTenantContext(userId)`
- **Inventory & Capacity:** `createHold`, `captureHold`, `releaseHold`, `compensateCapturedHold`, `sweepExpiredHolds`
- **Core Booking Delegation:** `createCoreBooking(params)` (maps to `type: 'EXPERIENCE'`)
- **Ledger Posting:** `postRevenueRealization(params)`
- **Operational Exceptions:** `raiseOperationalException(params)`

### 3.2 In-Process vs Remote Deployment Evolution
1. **Phase 1 (Current):** In-process modular monolith via `InProcessFiruzoCoreClient`. Schema tables share PostgreSQL instance but are strictly isolated via TypeScript interfaces and ESLint boundary rules.
2. **Phase 2 (Target Micro-service / Separate DB):** Transition `InProcessFiruzoCoreClient` to `HttpFiruzoCoreClient` without modifying any domain or page code.

---

## 4. Resilience & Graceful Degradation Strategy

### 4.1 Critical Dependencies (e.g. Shetab Payment Gateway)
- **Failure Mode:** Gateway down, network timeout, or card decline.
- **Handling:** Request remains in `submitted` or `under_review` state; capacity lock maintained until `expiresAt` (48h); user presented with clear retry path and alternative payment methods.

### 4.2 Non-Critical Dependencies (e.g. SMS Notifications, Recommendations)
- **Failure Mode:** Notification provider timeout or quota exhausted.
- **Handling:** Status event written to `BusinessStatusEvent` audit log; notification failure queued for retry in background without failing user request.

### 4.3 Idempotency Strategy
- All payment creation calls enforce a unique `idempotencyKey` indexed at the database level (`business_payments_idempotency_key_key`).
- Simultaneous duplicate clicks safely return the existing payment intent without double billing.
