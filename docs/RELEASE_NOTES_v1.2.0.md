# iTrip / Firuzo Platform Release Notes — v1.2.0

**Release Tag:** `v1.2.0`  
**Release Date:** 2026-09-07  
**Commit SHA:** `cf45237bd0a01f6b4e0a2a7940c40f87358a224f` (`cf45237`)  
**Target Environment:** Node.js 20+ / PostgreSQL 16 / Next.js 16 (App Router)  

---

## 🚀 Key Highlights & What's New

### 1. Auto-Buy Engine & Automated Purchasing
- Added `AutoBuyRule` domain and execution engine supporting max price triggers, soft/hard deadlines, passenger seat preferences, and direct wallet execution.
- Idempotent execution lifecycle with concurrency guards and status transitions (`ACTIVE` → `PROCESSING` → `FULFILLED` / `EXPIRED` / `CANCELLED`).

### 2. CMS Content Domain & Curated Tours
- Relational CMS data models: `Tour`, `TourDepartureDate`, `TourItineraryDay`, `SignatureExperience`, `Travelogue`, `GuideArticle`.
- Deep tour details engine with interactive accommodations, pricing widgets, itineraries, and verified traveler reviews.
- Flight comparison modals, pricing calendars, price alert subscriptions, and fare rules drawer.

### 3. ERP & Back-Office Workflows
- `TravelFileDomainService` (ERP-001..007): groups related flights, hotels, and tours into consolidated `Trip` dossiers.
- `CommissionService` (COMM-001 / FIN-013..015): calculates tiered commission accruals, agency cuts, and adjustments.
- `InvoiceDomainService` (FIN-006 / FIN-011): generates structured commercial invoices and itemized lines for confirmed bookings.
- `SettlementService` (SET-001): batches supplier payable transactions for weekly/monthly reconciliation.

### 4. Tenant Isolation, IAM & IDOR Hardening (Waves 0 & 1)
- `TenantRepository` and `createTenantScoper`: centralized, boundary-enforced repository ensuring all B2B queries are locked to the caller's organization and branch context.
- Database-level tenant ownership and foreign keys for `Invoice`, `Trip`, `SettlementBatch`, and `TravelDocument`.
- Relational RBAC as sole runtime authority: legacy `User.role` and `Role.permissions` strings decoupled from runtime access checks.
- Middleware and policy migration to canonical permission codes (`booking:view:all`, `ops:override:cancel`, `finance:view`).
- Expanded IDOR test suite covering ERP, finance, travel files, invoices, settlements, and documents.

### 5. Telemetry & Conversion Metrics (OBS-005)
- In-memory and structured business telemetry recording search volume, draft conversions, payment success rates, refund velocity, and price drift.

---

## 🧪 Verification & Health
- **Unit & Domain Tests:** 148+ tests passing across 26 test suites against isolated PostgreSQL 16.
- **TypeScript:** Strict typecheck with 0 errors (`tsc --noEmit`).
- **ESLint:** 0 lint errors with architectural guardrails enabled.
- **Internationalization:** 5 languages (`fa`, `en`, `ar`, `zh`, `ru`) synchronized across 851 keys with RTL support.
