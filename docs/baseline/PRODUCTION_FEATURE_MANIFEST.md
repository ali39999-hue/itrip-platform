# Production Feature Manifest

**Document:** `docs/baseline/PRODUCTION_FEATURE_MANIFEST.md`  
**Task:** BASE-103  
**Verified Baseline:** Commit `cf45237` (Version `1.2.0`)  
**Verified Date:** 2026-09-07  
**Authority:** Generated and audited from code inspection and test suite execution.

---

## 1. Identity, Multi-Tenancy & Access Control (IAM)

| Feature ID | Module | Feature Name & Scope | Status | Evidence (File:Line) | Verification | Verified Date |
|---|---|---|---|---|---|---|
| IAM-001 | Identity | Relational RBAC (Role → RolePermission → Permission) | PRODUCTION-READY | `src/domains/identity/permission-service.ts:38-71` | `src/domains/identity/tenant-isolation.test.ts` (IAM-001) | 2026-09-07 |
| IAM-002 | Identity | Dynamic Relational Permissions in JWT Session | PRODUCTION-READY | `src/auth.ts:259-286` | `src/domains/identity/tenant-isolation.test.ts` | 2026-09-07 |
| IAM-003 | Multi-Tenancy | Multi-Tenant Scoping Extension (`tenant-scoper.ts`) | PRODUCTION-READY | `src/domains/identity/tenant-scoper.ts:8-62` | `src/domains/identity/tenant-isolation.test.ts` (IAM-007) | 2026-09-07 |
| IAM-004 | Identity | Referential Integrity FK for `OrganizationMembership.roleId` | PRODUCTION-READY | `prisma/schema.prisma:97`, migration `20260906120000` | `src/domains/identity/tenant-isolation.test.ts` (IAM-004) | 2026-09-07 |
| IAM-005 | Identity | ERP Staff Role Authorization Gate (`hasErpRole`) | PRODUCTION-READY | `src/domains/identity/permission-service.ts:21-35` | `src/domains/identity/tenant-isolation.test.ts` | 2026-09-07 |
| IAM-006 | Identity | Centralized Tenant Repository (`TenantRepository`) | PRODUCTION-READY | `src/domains/identity/TenantRepository.ts:1-180` | `src/domains/identity/tenant-isolation.test.ts` | 2026-09-07 |
| IAM-007 | Identity | Canonical Permission Middleware Checks | PRODUCTION-READY | `src/middleware.ts:11-96` | Middleware unit/integration audit | 2026-09-07 |
| IAM-008 | Multi-Tenancy | Cross-Tenant Authorization Matrix (Deny/Grant/Revoke) | PRODUCTION-READY | `src/domains/identity/permission-service.ts:134-167` | `src/domains/identity/tenant-isolation.test.ts` (IAM-008) | 2026-09-07 |
| IAM-009 | Multi-Tenancy | IDOR Protection across ERP, Finance & Documents | PRODUCTION-READY | `src/domains/identity/permission-service.ts:134-167` | `src/domains/identity/idor-protection.test.ts` | 2026-09-07 |
| IAM-010 | Multi-Tenancy | Cross-Organization Write Rejection | PRODUCTION-READY | `src/domains/identity/TenantRepository.ts:25-90` | `src/domains/identity/tenant-isolation.test.ts` (IAM-110) | 2026-09-07 |

---

## 2. Pricing, Tax & Money Kernel (MONEY / FIN)

| Feature ID | Module | Feature Name & Scope | Status | Evidence (File:Line) | Verification | Verified Date |
|---|---|---|---|---|---|---|
| MONEY-001 | Money | Arbitrary-Precision Decimal `Money` Representation | COMPLETE | `src/lib/finance/index.ts:1-85` | `src/domains/finance/money-pricing-tax.test.ts` | 2026-09-07 |
| MONEY-002 | Pricing | 12-Stage Deterministic Decimal Pricing Pipeline | COMPLETE | `src/lib/pricing/engine.ts:1-240` | `src/domains/finance/money-pricing-tax.test.ts` | 2026-09-07 |
| MONEY-003 | Tax | Date-Effective Versioned Tax Engine | COMPLETE | `src/lib/finance/tax-engine.ts:1-120` | `src/domains/finance/money-pricing-tax.test.ts` | 2026-09-07 |
| MONEY-004 | Accounting | Double-Entry General Ledger (`GeneralLedgerService`) | COMPLETE | `src/domains/ledger/GeneralLedgerService.ts:1-260` | `src/domains/ledger/ledger-accounting.test.ts` | 2026-09-07 |
| MONEY-005 | Accounting | Unbalanced Journal Rejection Invariant | COMPLETE | `src/domains/ledger/GeneralLedgerService.ts:55-80` | `src/domains/ledger/ledger-accounting.test.ts` | 2026-09-07 |
| MONEY-006 | Accounting | Unified Account Balance Resolution (`MONEY-012`) | COMPLETE | `src/domains/ledger/GeneralLedgerService.ts:125-165` | `src/domains/ledger/ledger-accounting.test.ts` | 2026-09-07 |
| MONEY-007 | Invoicing | Commercial Invoice Generation (`InvoiceDomainService`) | PRODUCTION-READY | `src/domains/finance/InvoiceDomainService.ts:1-120` | `src/domains/finance/refund-settlement-reconcile.test.ts` | 2026-09-07 |
| MONEY-008 | Commission | Multi-Tier Partner Commission Rules (`CommissionService`)| PRODUCTION-READY | `src/domains/finance/CommissionService.ts:1-110` | `src/domains/erp-domains.test.ts` | 2026-09-07 |
| MONEY-009 | Settlement | Supplier Settlement Batch Reconciliation | PRODUCTION-READY | `src/domains/finance/SettlementService.ts:1-105` | `src/domains/finance/refund-settlement-reconcile.test.ts` | 2026-09-07 |
| MONEY-010 | FX | Currency Conversion & Rate Provider | SIMULATED | `src/domains/finance/CurrencyService.ts:1-75` | `src/domains/finance/money-pricing-tax.test.ts` | 2026-09-07 |

---

## 3. Booking Engine & Inventory Lifecycle (BOOK / INV)

| Feature ID | Module | Feature Name & Scope | Status | Evidence (File:Line) | Verification | Verified Date |
|---|---|---|---|---|---|---|
| BOOK-001 | Booking | Decoupled 4-State Lifecycle Machine | COMPLETE | `src/domains/booking/state-machine.ts:1-165` | `src/domains/booking/state-machine.test.ts` | 2026-09-07 |
| BOOK-002 | Booking | Relational `BookingStatusHistory` Audit Logging | COMPLETE | `src/domains/booking/BookingDomainService.ts:80-120` | `src/domains/booking/booking-lifecycle.test.ts` | 2026-09-07 |
| BOOK-003 | Booking | Immutable `PriceSnapshot` on Draft Creation | COMPLETE | `src/domains/booking/BookingDomainService.ts:40-65` | `src/domains/booking/booking-lifecycle.test.ts` | 2026-09-07 |
| BOOK-004 | Booking | Quote Expiry & Reprice Verification (`B2C-007`) | COMPLETE | `src/domains/booking/BookingDomainService.ts:130-160` | `src/domains/booking/booking-lifecycle.test.ts` | 2026-09-07 |
| BOOK-005 | Booking | Concurrent Booking Confirmation Race Lock | COMPLETE | `src/domains/booking/BookingDomainService.ts:170-220` | `src/domains/booking/booking-lifecycle.test.ts` (BOOK-014) | 2026-09-07 |
| INV-001 | Inventory | Row-Locked Atomic Inventory Holds | COMPLETE | `src/domains/inventory/InventoryEngine.ts:45-110` | `src/domains/inventory/inventory-concurrency.test.ts` | 2026-09-07 |
| INV-002 | Inventory | 100-Thread Oversell Concurrency Protection | COMPLETE | `src/domains/inventory/InventoryEngine.ts:80-140` | `src/domains/inventory/inventory-concurrency.test.ts` (INV-001) | 2026-09-07 |
| INV-003 | Inventory | Hold Expiration Sweep Worker | COMPLETE | `src/domains/inventory/HoldExpirationWorker.ts:1-85` | `src/domains/inventory/inventory-concurrency.test.ts` (INV-003) | 2026-09-07 |
| INV-004 | Inventory | Compensation Hold Release on Booking Failure | COMPLETE | `src/domains/booking/BookingDomainService.ts:240-275` | `src/domains/booking/booking-lifecycle.test.ts` (BOOK-005) | 2026-09-07 |
| INV-005 | Inventory | Hold Release Compensation on Refund Execution (`INV-010`)| COMPLETE | `src/domains/refund/RefundDomainService.ts:140-175` | `src/domains/inventory/inventory-engine-policy.test.ts` | 2026-09-07 |

---

## 4. Payments, Gateways & Refunds (PAY / REF)

| Feature ID | Module | Feature Name & Scope | Status | Evidence (File:Line) | Verification | Verified Date |
|---|---|---|---|---|---|---|
| PAY-001 | Payments | PaymentIntent & PaymentAttempt State Management | COMPLETE | `src/domains/payments/PaymentDomainService.ts:50-130` | `src/domains/payments/payment-safety.test.ts` | 2026-09-07 |
| PAY-002 | Payments | Webhook Signature Verification (Fail-Closed HMAC) | COMPLETE | `src/domains/payments/gateway-port.ts:175-235` | `src/domains/payments/payment-safety.test.ts` | 2026-09-07 |
| PAY-003 | Payments | Webhook Replay & Idempotency Window Guard | COMPLETE | `src/domains/payments/PaymentDomainService.ts:310-385` | `src/domains/payments/payment-safety.test.ts` (PAY-007) | 2026-09-07 |
| PAY-004 | Payments | PSP External Bank Port | SIMULATED | `src/domains/payments/gateway-port.ts:89-111` | `src/domains/payments/payment-safety.test.ts` | 2026-09-07 |
| PAY-005 | Payments | Demo Mode Production Guard (`CI-012`) | PRODUCTION-READY | `next.config.ts:10-14`, `PaymentDomainService.ts` | Build & unit tests | 2026-09-07 |
| REF-001 | Refund | Comprehensive Refund Aggregate (`RefundDomainService`)| PRODUCTION-READY | `src/domains/refund/RefundDomainService.ts:1-240` | `src/domains/refund/refund-domain.test.ts` | 2026-09-07 |
| REF-002 | Refund | Atomic Ledger Reversal & Hold Release in Transaction | COMPLETE | `src/domains/refund/RefundDomainService.ts:135-185` | `src/domains/refund/refund-domain.test.ts` | 2026-09-07 |
| REF-003 | Refund | Deterministic Idempotency Key & Race Collapse | COMPLETE | `src/domains/refund/RefundDomainService.ts:70-110` | `src/domains/refund/refund-domain.test.ts` | 2026-09-07 |

---

## 5. ERP, Travel Dossiers & Exceptions (ERP / OPS)

| Feature ID | Module | Feature Name & Scope | Status | Evidence (File:Line) | Verification | Verified Date |
|---|---|---|---|---|---|---|
| ERP-001 | ERP | Travel File Dossier Grouping (`Trip` model aggregation)| PRODUCTION-READY | `src/domains/erp/TravelFileDomainService.ts:1-95` | `src/domains/erp-domains.test.ts` | 2026-09-07 |
| ERP-002 | ERP | Trip Status Sync with Confirmed Bookings | PRODUCTION-READY | `src/domains/erp/TravelFileDomainService.ts:40-75` | `src/domains/erp-domains.test.ts` | 2026-09-07 |
| ERP-003 | ERP | Operational Exception Deduplication & SLA Re-Arm | COMPLETE | `src/actions/admin.ts:310-380` | `src/domains/erp-domains.test.ts` (ERP-009) | 2026-09-07 |
| ERP-004 | ERP | Back-Office Admin Dashboard & Queues | COMPLETE | `src/actions/admin.ts:455-580` | `src/app/[locale]/admin/page.tsx` | 2026-09-07 |
| ERP-005 | ERP | PII Document Encryption & Auditing | COMPLETE | `src/domains/documents/DocumentService.ts:1-90` | `src/domains/security-fixes.test.ts` | 2026-09-07 |

---

## 6. Auto-Buy Engine & CMS Content Domain

| Feature ID | Module | Feature Name & Scope | Status | Evidence (File:Line) | Verification | Verified Date |
|---|---|---|---|---|---|---|
| AUTO-001 | Auto-Buy | Auto-Buy Rules Evaluation & Deadline Check | COMPLETE | `src/domains/autobuy/AutoBuyService.ts:1-180` | `src/domains/autobuy/autobuy-domain.test.ts` | 2026-09-07 |
| AUTO-002 | Auto-Buy | Direct Internal Wallet Debit & Autonomous Booking | COMPLETE | `src/domains/autobuy/AutoBuyService.ts:90-150` | `src/domains/autobuy/autobuy-domain.test.ts` | 2026-09-07 |
| CMS-001 | CMS | Curated Tours, Departures & Itinerary Models | COMPLETE | `src/domains/content/ContentService.ts:1-150` | `src/domains/content/content-domain.test.ts` | 2026-09-07 |
| CMS-002 | CMS | Signature Experiences, Travelogues & Guide Articles | COMPLETE | `src/domains/content/ContentService.ts:151-240` | `src/domains/content/content-domain.test.ts` | 2026-09-07 |

---

## 7. Asynchronous Architecture, Outbox & Saga

| Feature ID | Module | Feature Name & Scope | Status | Evidence (File:Line) | Verification | Verified Date |
|---|---|---|---|---|---|---|
| ASYNC-001 | Outbox | Transactional Outbox Pattern | COMPLETE | `src/domains/events/OutboxConsumer.ts:1-180` | `src/domains/events/saga-outbox-crash.test.ts` | 2026-09-07 |
| ASYNC-002 | Outbox | `FOR UPDATE SKIP LOCKED` Polling & Concurrency | COMPLETE | `src/domains/events/OutboxConsumer.ts:50-85` | `src/domains/events/saga-outbox-crash.test.ts` (OUTBOX-001) | 2026-09-07 |
| ASYNC-003 | Outbox | Exponential Backoff & Dead Letter Queue (DLQ) | COMPLETE | `src/domains/events/OutboxConsumer.ts:110-155` | `src/domains/events/saga-outbox-crash.test.ts` (OUTBOX-002) | 2026-09-07 |
| ASYNC-004 | Saga | Booking Confirmation Saga with Compensation | COMPLETE | `src/domains/booking/saga-orchestrator.ts:1-180` | `src/domains/events/saga-outbox-crash.test.ts` (SAGA-001) | 2026-09-07 |

---

## 8. Observability, Security & Provenance

| Feature ID | Module | Feature Name & Scope | Status | Evidence (File:Line) | Verification | Verified Date |
|---|---|---|---|---|---|---|
| OBS-001 | Telemetry | End-to-End Correlation ID Header (`x-correlation-id`)| COMPLETE | `src/middleware.ts:26-30` | End-to-end request audit | 2026-09-07 |
| OBS-002 | Telemetry | Structured JSON Logger with PII Redaction | COMPLETE | `src/lib/observability/logger.ts:1-95` | `src/domains/events/saga-outbox-crash.test.ts` | 2026-09-07 |
| OBS-003 | Telemetry | Business Telemetry & Conversion Metrics (`OBS-005`) | COMPLETE | `src/lib/observability/business-metrics.ts:1-110`| `src/lib/observability/business-metrics.test.ts` | 2026-09-07 |
| OBS-004 | Health | Liveness & Readiness Probes (`/api/health/*`) | COMPLETE | `src/app/api/health/ready/route.ts:1-65` | `npm run test:unit` | 2026-09-07 |
| PROV-001| Provenance | App Version & Commit Provenance (`BASE-106`) | COMPLETE | `src/lib/version.ts:1-25`, `next.config.ts:8-16` | Typecheck & build | 2026-09-07 |
