# FIRUZO CHILD — PROJECT CONTRACT & ARCHITECTURE COVENANT

**Status:** Authoritative Architectural Contract  
**Applies To:** Firuzo Child / Specialist Travel Product (`itrip-platform/src/domains/business`, `src/app/[locale]/business`, `src/app/api/v1/business`)  
**Parent Platform:** Firuzo Core Platform (`itrip-platform`)  
**Baseline Date:** 2026-10-02  

---

## 1. Foundational Tenets

```text
The Child is an independent specialist travel product.
Its UI/UX and specialist business logic are Child-owned.
Firuzo is a platform partner, not a hidden implementation detail.
No direct database coupling is allowed.
No undocumented cross-domain imports are allowed.
All platform integrations must use versioned adapters/contracts.
All business-critical state must be server-authoritative.
All production features require tests and acceptance evidence.
```

---

## 2. Core Boundary & Anti-Coupling Mandate

### 2.1 The Single Integration Boundary
1. The Child domain **MUST NOT** import `@/lib/prisma` or query Core tables directly (enforced by architecture boundary rules).
2. The **ONLY** permitted communication channel between Child domain logic and Firuzo Core services is `FiruzoCoreClient` (`src/domains/business/core/FiruzoCoreClient.ts`).
3. While the current phase runs as an in-process modular monolith via `InProcessFiruzoCoreClient`, the interface is strictly network-ready and serialized:
   - Financial numbers are transmitted as Decimal strings or integer Rials—never JS floats.
   - Core identifiers (`userId`, `organizationId`, `inventoryItemId`) are treated as opaque tokens.
   - Core transitions rely on server-side assertions (`assertBookingTransition`).

### 2.2 Data Sovereignty & Single Master Rule (P01)
- Every entity belongs to exactly one owner.
- **Child-Owned:**
  - Specialist Vertical Taxonomy & Package Definitions (`BusinessTourPackage`)
  - Departures & Specialist Allotments (`BusinessDeparture`)
  - Specialist Add-ons & Activities (`BusinessAddon`)
  - Specialist Company/Enterprise Profiles (`BusinessCompany`)
  - Specialist Requests & State Lifecycle (`BusinessRequest`)
  - Traveler Rosters & Specialist Documents (`BusinessTraveler`, `BusinessDocument`)
  - Specialist Vouchers & QR Verification Records (`BusinessVoucher`)
  - Status Audit Event Log (`BusinessStatusEvent`)
- **Firuzo Core-Owned (Consumed via Contract):**
  - Global Identity & Authentication (`User`, `Account`, `Session`)
  - Tenant Organization Hierarchy (`Organization`, `OrganizationMembership`)
  - Double-Entry General Ledger (`LedgerAccount`, `JournalEntry`)
  - Physical Payment Execution & Shetab PSP Gateways (`PaymentIntent`)
  - Enterprise Role-Based Access Control (`Role`, `Permission`, `RolePermission`)

---

## 3. Server-Authoritative State & Zero-Trust Invariants

1. **Pricing Authority:** The client never computes or specifies prices. All pricing, quotes, deposits, and totals are computed server-side via `computeQuote` in integer Rials.
2. **State Machine Integrity:** All status transitions (`draft → submitted → deposit_paid → under_review → approved → issued`) are strictly enforced by `BusinessStateMachine`. Client status mutations are rejected with HTTP 409 `invalid_transition`.
3. **Capacity Locks:** No booking may be confirmed without capacity reservation. Capacity is held for 48 hours upon draft creation and booked atomically on verified payment callback.
4. **Authoritative Payment Verification:** Payments are recognized only upon receipt of cryptographic webhooks or verified gateway callbacks. No client-supplied payment confirmation is trusted.

---

## 4. Mobile Ergonomics & Visual Identity

1. The Child owns its experience layer, tailored for specialized, high-consideration travel decisions.
2. Mobile UI strictly follows:
   - Primary action buttons anchored in thumb zones (`fixed bottom-0`).
   - Touch targets must adhere to a minimum of 44×44px with 8px interactive spacing.
   - Bottom sheets for contextual interactions on `< 768px` viewports.
   - Full RTL and Persian typography compliance (`leading-relaxed`, logical CSS properties `start-`, `end-`, `ms-`, `me-`).

---

## 5. Quality & Release Gates

A task, PR, or release is considered **DONE** only when:
- TypeScript compilation: 0 errors (`npm run typecheck`).
- Linter: 0 warnings and 0 errors (`npm run lint`).
- Unit and domain test suite: 100% pass rate (`npm run test:unit`).
- Critical E2E scenarios pass on desktop and mobile viewports (`playwright test`).
- Documentation, status, and task files are updated with concrete evidence.
