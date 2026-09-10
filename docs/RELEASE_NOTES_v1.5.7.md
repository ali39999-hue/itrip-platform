# iTrip / Firuzo Platform Release Notes — v1.5.7

**Release Tag:** `v1.5.7`  
**Release Commit:** `4b3174e`  
**Release Date:** 2026-09-10  
**Branch:** `main`  
**Authoritative Version:** `package.json` (1.5.7)  

---

## Executive Summary

Release v1.5.7 delivers a comprehensive production upgrade, full reality audit reconciliation, UI/UX rebuild, and hardening across core commerce, financial, and operational systems of the Firuzo travel platform.

---

## Key Deliverables & Changes in v1.5.7

### 1. Centralized Product Capability Registry (CAP-001)
- Built `src/lib/capabilities/index.ts` tracking 18 platform capabilities across payments, suppliers, FX, auth, AI, refunds, and multi-currency wallets.
- Exposed dynamic JSON API endpoint at `/api/capabilities`.
- Enforces strict product truth: frontend components query this registry rather than claiming `LIVE` status for mock or simulated third-party integrations.

### 2. Feature Reality Matrix (BASE-102)
- Reconciled `docs/baseline/FEATURE_REALITY_MATRIX.md` against commit `4b3174e`.
- Exhaustive verification of all 33 platform domains across database, backend, API, frontend, tests, and production reality layers.
- Investigated and documented the hotel price filter scale change (`25_000_000` -> `20` Millions of Tomans) with regression testing.

### 3. Hotel Search Header, Filters & Responsive Cards
- Redesigned `HotelSearchHeader` with destination picker, date range calendar, room/guest popover, and instant submit.
- Calibrated price histogram and range slider to 0–20 Million Tomans with 14-bucket density visualizer and one-click quick presets (`< 3M`, `3–6M`, `6–10M`, `10M+`).
- Enhanced `HotelCard` responsive layouts with star ratings, breakfast badges, instant booking CTA, and price breakdowns.

### 4. SMSWBS OTP Dispatch & Fallback Resilience
- Enhanced `ProductionSmswbsProvider` with handling for provider duplicate/recent code (-1401) with user-friendly notices.
- Added graceful fallback to multi-channel notification provider when primary gateway experiences temporary upstream downtime.

### 5. Outbox & Clock-Skew Tolerance
- Hardened event claiming in `OutboxWorker` to tolerate distributed database clock drift without stalling event publication.
- Zero message loss guarantee with dead-letter queue (DLQ) for poisoned payloads.

### 6. Settlements Portal & User Management
- Zero-drift PostgreSQL migrations for `SettlementBatch`, `SupplierStatement`, `OrganizationMembership`, and relational RBAC.
- Admin settlement dashboard for statement variance computation and batch approvals.

### 7. Test Suite Hardening
- 50 test suites and 331 tests passing cleanly on isolated PostgreSQL test database.
- Concurrency test verifies 100 concurrent reservation attempts against capacity=1 yields exactly 1 success and 0 oversells.
