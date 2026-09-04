# iTRIP / FIRUZO — IMPLEMENTATION BACKLOG v1.0

**Source:** `iTRIP_MASTER_IMPLEMENTATION_SPEC_v2.md`
**Repository:** `ali39999-hue/itrip-platform`
**Branch:** `main`
**Goal:** Production-ready Travel Platform + Travel ERP with target score >= 9/10 across Backend, Data, Booking, Payment, Finance, ERP, UX, Security, QA and Operations.

---

## 0. How to use this backlog

This document is the execution layer above the Master Specification. Do not create implementation tasks outside this backlog without mapping them to a domain and acceptance criterion.

### Priority
- **P0:** production blocker / architectural blocker
- **P1:** required for 9/10 product quality
- **P2:** premium / scale / intelligence

### Task ownership
- **BE:** Backend / Domain
- **DB:** Database / Prisma
- **ERP:** ERP frontend + workflows
- **FE:** B2C frontend
- **UX:** UX/UI
- **QA:** testing / regression
- **SEC:** security
- **DEVOPS:** CI/CD / infrastructure
- **DATA:** analytics / reporting

### Rule
A task is not complete when code merely compiles. It is complete only when its acceptance criteria and required tests pass.

---

# 1. Master delivery sequence

```text
W0  Baseline + architecture lock
W1  PostgreSQL + migrations
W2  Identity + Organization + RBAC
W3  Money + Currency + FX + Tax + Config
W4  Inventory + concurrency
W5  Booking + Trip + state machines
W6  Payment + webhooks + idempotency
W7  Supplier adapters + fulfillment
W8  Outbox + workers + Saga + retry/DLQ
W9  Refund + Invoice + Accounting
W10 Commission + Settlement + Reconciliation
W11 ERP Travel File + Exceptions + Operations
W12 B2C Search + Results + Checkout UX
W13 My Trips + Wallet + service surfaces
W14 i18n/RTL + Accessibility + Mobile
W15 Security hardening + Observability + SLOs
W16 E2E + visual + load + recovery certification
W17 AI readiness + recommendation + ERP copilot foundations
```

---

# 2. Workstream dependency map

```text
DB-0 ──→ IAM ──→ MONEY ──→ INVENTORY ──→ BOOKING ──→ PAYMENT
                             │               │            │
                             └───────────────┴────→ SAGA ──┘
                                                     │
                                                     ├──→ REFUND
                                                     ├──→ ACCOUNTING
                                                     ├──→ COMMISSION
                                                     └──→ RECONCILIATION

SUPPLIER ────────────────────────────────────────────┘

CORE BACKEND ──→ ERP UX
CORE BACKEND ──→ B2C UX
ALL ──→ QA / SECURITY / OBSERVABILITY
```

---

# 3. W0 — Baseline & Architecture Lock

## ARC-001 — Reality map
**Owner:** BE/ARCH
**Priority:** P0
**Depends on:** none

Inventory actual implementation vs Master Spec for every domain.

**Deliverables**
- current entity map
- current API/action map
- current direct-Prisma call map
- current mock/demo path map
- current state mutation map

**Acceptance**
- every P0 domain has an implementation status: `implemented / partial / missing`
- every P0 direct write to sensitive state is documented

---

## ARC-002 — Architecture Decision Records
**Owner:** ARCH
**Priority:** P0

Create ADRs for:
- modular monolith
- PostgreSQL
- Prisma Migrate
- Money/Decimal
- Outbox
- Saga/workers
- supplier adapters
- RBAC/tenant scope
- B2C/B2B/ERP separation

**Acceptance:** every future architectural deviation requires an ADR.

---

## ARC-003 — Production claim audit
**Owner:** PRODUCT/BE
**Priority:** P0

Audit all UI claims such as live payments, GDS, instant ticketing, guaranteed refund, 24/7 support, etc.

Create enum:

```text
LIVE | BETA | DEMO | COMING_SOON
```

**Acceptance:** no production page exposes a `DEMO` capability as if it were live.

---

# 4. W1 — PostgreSQL & Database Foundation

## DB-001 — Switch Prisma datasource to PostgreSQL
**Owner:** DB
**Priority:** P0
**Depends on:** ARC-001

**Acceptance**
- PostgreSQL used in dev/test/staging/prod
- no transactional path depends on SQLite
- schema migration passes on empty PostgreSQL database

---

## DB-002 — Create Prisma migration baseline
**Owner:** DB
**Priority:** P0
**Depends on:** DB-001

Replace `db push` production workflow with migrations.

**Acceptance**
- migration history committed
- `prisma migrate deploy` works from empty database
- CI never uses `db push`

---

## DB-003 — PostgreSQL CI service
**Owner:** DEVOPS/DB
**Priority:** P0
**Depends on:** DB-002

**Acceptance**
- CI boots PostgreSQL
- runs migrations
- seeds deterministic test data
- runs integration tests against PostgreSQL

---

## DB-004 — Database constraints review
**Owner:** DB
**Priority:** P0

Add/verify:
- unique booking references
- unique idempotency keys per scope
- unique PNR/provider references where required
- non-negative financial amounts
- valid enum/state constraints where practical

---

## DB-005 — Index review
**Owner:** DB
**Priority:** P0

Required indexes for:
- Booking `(status, createdAt)`
- Booking `(organizationId, createdAt)`
- Payment `(bookingId, createdAt)`
- Payment `(idempotencyKey)`
- Webhook `(externalEventId)`
- Inventory `(itemId, date)`
- Holds `(expiresAt, status)`
- Outbox `(status, availableAt)`
- Exceptions `(status, severity, createdAt)`

**Acceptance:** explain plans exist for top 20 ERP queries.

---

## DB-006 — Backup and restore drill
**Owner:** DEVOPS/DB
**Priority:** P0

**Acceptance**
- automated backup configured in staging
- restore tested successfully
- documented RPO/RTO assumptions

---

# 5. W2 — Identity, Traveler, Organization & RBAC

## IAM-001 — Split User model
**Owner:** DB/BE
**Priority:** P0
**Depends on:** DB-002

Create:

```text
User
AuthIdentity
PersonProfile
ContactMethod
```

Migrate existing data.

---

## IAM-002 — Traveler profile
**Owner:** BE/DB
**Priority:** P0

Create:

```text
TravelerProfile
TravelDocument
Address
```

Passport/national ID data should no longer be primary User columns.

---

## IAM-003 — Organization model
**Owner:** BE/DB
**Priority:** P0

Create:

```text
Organization
OrganizationMembership
Agency
AgencyBranch
Corporate
Agent
```

---

## IAM-004 — Relational permissions
**Owner:** BE/DB
**Priority:** P0

Create:

```text
Role
Permission
RolePermission
UserRole
```

Remove JSON permissions as authoritative source.

---

## IAM-005 — Resource scope policies
**Owner:** BE
**Priority:** P0

Support scopes:

```text
GLOBAL
ORGANIZATION
BRANCH
OWN
ASSIGNED
```

---

## IAM-006 — OTP hardening
**Owner:** SEC/BE
**Priority:** P0

Implement:
- IP rate limit
- identifier rate limit
- attempt cap
- cooldown
- enumeration resistance

---

## IAM-007 — Tenant isolation tests
**Owner:** QA/SEC
**Priority:** P0

**Acceptance**
- Agency A cannot access Agency B records
- Branch A cannot modify Branch B data
- every sensitive query has scope enforcement

---

# 6. W3 — Money, Currency, FX, Tax & Configuration

## MONEY-001 — Money kernel
**Owner:** BE
**Priority:** P0

Create:

```text
Money
CurrencyCode
MoneyLine
MoneyBreakdown
```

**Rule:** business money cannot use JS floating-point arithmetic.

---

## MONEY-002 — Remove `number` from financial domain
**Owner:** BE
**Priority:** P0
**Depends on:** MONEY-001

Migrate booking, ledger, payment, pricing and refund calculations.

**Acceptance:** no financial domain interface accepts `number` for amount values.

---

## MONEY-003 — Currency & FX engine
**Owner:** BE
**Priority:** P0

Store:

```text
transactionCurrency
transactionAmount
baseCurrency
baseAmount
fxRate
fxSource
fxTimestamp
```

---

## TAX-001 — Tax rules
**Owner:** BE/DB
**Priority:** P0

Create:

```text
TaxRule
TaxRate
TaxJurisdiction
TaxCategory
```

Remove hard-coded rates from services.

---

## CONFIG-001 — Versioned business configuration
**Owner:** BE/ERP
**Priority:** P1

Version:
- tax
- markup
- retry policy
- approval thresholds
- supplier timeouts
- hold TTL
- rounding

---

## PRICING-001 — Pricing engine
**Owner:** BE
**Priority:** P0

Pipeline:

```text
Supplier Cost
→ Supplier Fee
→ Markup
→ Channel Rule
→ Customer Rule
→ Tax
→ Payment Fee
→ Promotion
→ FX
→ Rounding
→ Sell Price
```

---

## PRICING-002 — Pricing rule versioning
**Owner:** BE/DB
**Priority:** P0

Every rule must support:
- priority
- version
- scope
- validFrom
- validTo
- condition
- action

---

## PRICING-003 — Immutable price snapshot
**Owner:** BE
**Priority:** P0

Save complete price calculation snapshot on quote/booking.

---

# 7. W4 — Inventory Engine

## INV-001 — Inventory model v2
**Owner:** DB/BE
**Priority:** P0

Create:

```text
InventoryProduct
InventoryOffer
Availability
Allotment
StopSell
InventoryHold
InventoryCommit
InventoryRelease
```

---

## INV-002 — Inventory modes
**Owner:** BE
**Priority:** P0

Support:

```text
FREE_SALE
ALLOTMENT
ON_REQUEST
```

---

## INV-003 — Atomic hold
**Owner:** BE/DB
**Priority:** P0

Use PostgreSQL locking or conditional atomic update.

**Acceptance**
- no oversell under concurrent requests
- hold and inventory changes are one DB transaction

---

## INV-004 — Hold expiry worker
**Owner:** BE/WORKER
**Priority:** P0

Sweep expired holds periodically.

---

## INV-005 — Hold release/capture idempotency
**Owner:** BE
**Priority:** P0

Repeated release/capture commands produce one final result.

---

## INV-006 — Concurrency test
**Owner:** QA
**Priority:** P0

Test:

```text
capacity = 1
100 simultaneous hold requests
```

Expected:

```text
success = 1
oversell = 0
```

---

# 8. W5 — Trip & Booking Core

## BOOK-001 — Trip aggregate
**Owner:** BE/DB
**Priority:** P0

Create `Trip` and relationships to Booking/Traveler/Document/Payment/Timeline.

---

## BOOK-002 — Booking model v2
**Owner:** DB/BE
**Priority:** P0

Create:

```text
Booking
BookingItem
BookingTraveler
BookingContact
BookingPrice
BookingPriceLine
BookingPolicySnapshot
BookingSupplierReference
BookingDocument
BookingNote
BookingTimeline
BookingStatusHistory
```

---

## BOOK-003 — Separate state dimensions
**Owner:** BE
**Priority:** P0

Separate:
- BookingStatus
- PaymentStatus
- FulfillmentStatus
- TicketStatus
- RefundStatus
- SupplierStatus

---

## BOOK-004 — Central state machine service
**Owner:** BE
**Priority:** P0

All sensitive state changes go through domain transition methods.

---

## BOOK-005 — Block direct sensitive status writes
**Owner:** BE/QA
**Priority:** P0

Search repo for direct `status` writes and remove unauthorized ones.

---

## BOOK-006 — Booking timeline
**Owner:** BE
**Priority:** P1

Capture:
- actor
- event
- timestamp
- entity
- correlationId

---

## BOOK-007 — Multi-item booking accounting input
**Owner:** BE
**Priority:** P0

No service may derive booking totals/revenue/cost from `firstItem` only.

---

## BOOK-008 — Timezone-safe travel times
**Owner:** BE/DB
**Priority:** P0

Store local date/time + timezone + UTC instant where relevant.

---

# 9. W6 — Payment

## PAY-001 — PaymentIntent
**Owner:** BE/DB
**Priority:** P0

Create lifecycle for payment intent.

---

## PAY-002 — PaymentAttempt
**Owner:** BE/DB
**Priority:** P0

Track every gateway attempt separately.

---

## PAY-003 — Gateway port
**Owner:** BE
**Priority:** P0

```ts
interface PaymentGateway {
  createPayment()
  verifyPayment()
  capturePayment()
  voidPayment()
  refundPayment()
}
```

---

## PAY-004 — Real gateway adapter
**Owner:** BE
**Priority:** P0

Replace simulated success flow with one real gateway integration for production path.

---

## PAY-005 — Webhook verification
**Owner:** SEC/BE
**Priority:** P0

Verify signature, merchant, amount, currency, reference and timestamp.

---

## PAY-006 — Webhook idempotency
**Owner:** BE
**Priority:** P0

Duplicate webhook produces no duplicate capture or ledger posting.

---

## PAY-007 — Payment state machine
**Owner:** BE
**Priority:** P0

```text
INITIATED
AUTHORIZED
CAPTURED
FAILED
VOIDED
PARTIALLY_REFUNDED
REFUNDED
```

---

## PAY-008 — Wrong amount/currency test
**Owner:** QA
**Priority:** P0

Reject mismatched gateway confirmation.

---

## PAY-009 — Payment timeout recovery
**Owner:** BE/QA
**Priority:** P0

Verify behavior after gateway timeout and retry.

---

# 10. W7 — Supplier & Fulfillment

## SUP-001 — Supplier model v2
**Owner:** DB/BE
**Priority:** P0

Create:

```text
Supplier
SupplierConnection
SupplierCredential
SupplierContract
SupplierProductMapping
SupplierRatePlan
SupplierCommission
SupplierSLA
SupplierHealth
SupplierStatement
```

---

## SUP-002 — Supplier ports
**Owner:** BE
**Priority:** P0

Create interfaces per product type.

---

## SUP-003 — Flight supplier contract
**Owner:** BE
**Priority:** P0

Support:

```text
search
price
hold
book
ticket
void
refund
exchange
```

---

## SUP-004 — Hotel supplier contract
**Owner:** BE
**Priority:** P0

Support:

```text
search
price
availability
book
cancel
refund
```

---

## SUP-005 — Adapter isolation tests
**Owner:** QA
**Priority:** P1

Supplier adapter failure must not leak provider-specific state into core booking domain.

---

## SUP-006 — Supplier health metrics
**Owner:** BE/DATA
**Priority:** P1

Capture latency, errors, timeouts, last success/failure.

---

## SUP-007 — Circuit breaker
**Owner:** BE
**Priority:** P1

Use timeout/backoff/circuit-breaker rules per supplier.

---

# 11. W8 — Outbox, Workers, Saga, Retry & DLQ

## ASYNC-001 — Outbox v2
**Owner:** DB/BE
**Priority:** P0

Fields:

```text
eventId
eventType
aggregateType
aggregateId
correlationId
causationId
payload
status
availableAt
lockedAt
workerId
retryCount
lastError
```

---

## ASYNC-002 — Outbox worker
**Owner:** BE/DEVOPS
**Priority:** P0

State flow:

```text
PENDING → CLAIMED → PROCESSING → PROCESSED
                         ↓
                       FAILED
                         ↓
                      RETRY
                         ↓
                     DEAD_LETTER
```

---

## ASYNC-003 — Persistent SagaExecution
**Owner:** BE/DB
**Priority:** P0

Create:

```text
SagaExecution
SagaStep
CompensationAction
RetryPolicy
```

---

## ASYNC-004 — Booking confirmation saga
**Owner:** BE
**Priority:** P0

External supplier calls happen outside long DB transactions.

---

## ASYNC-005 — Compensation actions
**Owner:** BE
**Priority:** P0

Every irreversible or externally visible step documents compensation behavior.

---

## ASYNC-006 — Worker crash recovery test
**Owner:** QA
**Priority:** P0

Kill worker during saga and restart.

Expected: resume or compensate exactly once.

---

## ASYNC-007 — DLQ tooling
**Owner:** ERP/BE
**Priority:** P1

ERP operator can inspect/retry dead-letter events.

---

# 12. W9 — Refund, Invoice & Accounting

## REF-001 — Refund domain
**Owner:** BE/DB
**Priority:** P0

Create:

```text
Refund
RefundItem
RefundCalculation
RefundPolicySnapshot
RefundAttempt
RefundLedgerPosting
```

---

## REF-002 — Refund state machine
**Owner:** BE
**Priority:** P0

```text
REQUEST
ELIGIBILITY
POLICY_CHECK
PENALTY
SUPPLIER_REFUND
CUSTOMER_REFUND
LEDGER
COMPLETE
```

---

## REF-003 — Refund idempotency
**Owner:** BE/QA
**Priority:** P0

Repeated refund command cannot refund twice.

---

## FIN-001 — Chart of accounts
**Owner:** Finance/BE/DB
**Priority:** P0

Create account hierarchy and account codes.

---

## FIN-002 — Journal model
**Owner:** Finance/BE/DB
**Priority:** P0

Create:

```text
Journal
JournalEntry
JournalLine
PostingGroup
AccountingPeriod
FiscalYear
```

---

## FIN-003 — Immutable ledger rules
**Owner:** BE/DB
**Priority:** P0

Posted entries cannot be updated/deleted; corrections use reversal.

---

## FIN-004 — Balanced posting engine
**Owner:** BE
**Priority:** P0

Reject any posting where:

```text
SUM(debit) != SUM(credit)
```

---

## FIN-005 — Booking posting templates
**Owner:** Finance/BE
**Priority:** P0

Implement templates for:
- payment
- revenue
- supplier payable
- refund
- settlement
- commission

---

## FIN-006 — Invoice domain
**Owner:** BE/DB
**Priority:** P1

Create:

```text
Invoice
InvoiceLine
InvoiceStatusHistory
```

---

# 13. W10 — Commission, Settlement & Reconciliation

## COMM-001 — Commission engine
**Owner:** BE/DB
**Priority:** P1

Create:

```text
CommissionPlan
CommissionRule
CommissionTier
CommissionAccrual
CommissionAdjustment
CommissionSettlement
```

---

## SET-001 — Supplier settlement
**Owner:** BE/Finance
**Priority:** P1

Create:

```text
SettlementBatch
SettlementLine
SupplierStatement
```

---

## RECON-001 — Reconciliation engine
**Owner:** BE/Finance
**Priority:** P0

Match:

```text
Booking ↔ Payment ↔ Supplier Statement ↔ Invoice ↔ Ledger
```

---

## RECON-002 — Reconciliation confidence score
**Owner:** BE/DATA
**Priority:** P1

Recommended routing:

```text
95–100 → auto match
80–95  → review
<80    → exception
```

Treat these as product policy, not accounting standards.

---

## RECON-003 — Exception Center
**Owner:** ERP/BE
**Priority:** P0

Exception types:

```text
PRICE_MISMATCH
PAYMENT_MISMATCH
SUPPLIER_TIMEOUT
TICKET_NOT_ISSUED
REFUND_TIMEOUT
COMMISSION_MISMATCH
FX_VARIANCE
DUPLICATE_BOOKING
```

---

# 14. W11 — ERP

## ERP-001 — ERP shell v2
**Owner:** ERP/UX
**Priority:** P1

Navigation:

```text
Dashboard
Travel Files
Bookings
Customers
Travelers
Agencies
Corporates
Suppliers
Inventory
Pricing
Operations
Payments
Refunds
Finance
Accounting
Reconciliation
Documents
Support
Reports
Settings
```

---

## ERP-002 — Travel File
**Owner:** ERP/BE
**Priority:** P0

Single operator view containing:
- customer
- travelers
- flight
- hotel
- transfer
- eSIM
- insurance
- payments
- refunds
- invoices
- documents
- timeline
- notes
- support cases

---

## ERP-003 — Global search
**Owner:** ERP/BE
**Priority:** P1

Search:

```text
Booking ID
PNR
Ticket
Invoice
Payment
Customer
Phone
Passport
Supplier reference
```

---

## ERP-004 — Role dashboards
**Owner:** ERP/UX/DATA
**Priority:** P1

Dashboards:
- Operations
- Finance
- Sales
- Management

---

## ERP-005 — Advanced data table
**Owner:** ERP/FE
**Priority:** P1

Features:
- search
- filters
- sorting
- pagination
- saved views
- column visibility
- bulk action
- export
- keyboard navigation

---

## ERP-006 — Approval workflows
**Owner:** ERP/BE
**Priority:** P1

Sensitive actions require policy-based approval:
- high-value refund
- manual price override
- ledger adjustment
- supplier override

---

## ERP-007 — Audit viewer
**Owner:** ERP/BE
**Priority:** P1

Operators with access can inspect full audit history.

---

# 15. W12–W14 — B2C UX

## UX-001 — Home intent-first redesign
**Owner:** UX/FE
**Priority:** P1

Target hierarchy:

```text
Hero
→ Search / Plan
→ Continue Trip / Personalization
→ Destinations
→ Relevant Services
→ Offers
→ Trust
→ Editorial
```

---

## UX-002 — Flight results redesign
**Owner:** UX/FE
**Priority:** P1

Every card must communicate:

```text
WHAT
WHY
HOW MUCH
NEXT
```

---

## UX-003 — Hotel result redesign
**Owner:** UX/FE
**Priority:** P1

Show total stay price, cancellation and “Why recommended?”.

---

## UX-004 — Search state system
**Owner:** FE/UX
**Priority:** P0

Explicit states:

```text
Loading
Partial Results
No Results
Provider Error
Price Changed
```

---

## UX-005 — Checkout v2
**Owner:** UX/FE
**Priority:** P1

Flow:

```text
Select
→ Travelers
→ Extras
→ Review
→ Payment
→ Confirmation
```

---

## UX-006 — Mobile checkout sticky CTA
**Owner:** FE
**Priority:** P1

Total + primary action remain accessible on mobile.

---

## UX-007 — My Trips Travel OS
**Owner:** FE/BE
**Priority:** P1

Timeline + documents + booking states + payments + support.

---

## UX-008 — Wallet v2
**Owner:** FE/BE
**Priority:** P1

Wallet balance is server/ledger-backed, not client-authoritative.

---

## UX-009 — Planner decision engine
**Owner:** FE/BE/AI
**Priority:** P1

```text
Intent
→ Destination
→ Dates
→ Travelers
→ Style
→ Budget
→ Recommendation
→ Why
→ Compare
→ Book
```

---

# 16. W14 — i18n, RTL, Accessibility & Mobile

## I18N-001 — Remove `lt.ts` dependency
**Owner:** FE
**Priority:** P1

All user-facing text comes from locale messages.

---

## I18N-002 — Translation completeness CI
**Owner:** QA/FE
**Priority:** P1

Locales:

```text
fa
 en
ar
zh
ru
```

No missing production keys.

---

## I18N-003 — RTL regression suite
**Owner:** QA/UX
**Priority:** P1

Test layout, icons, tables, forms, sheets and navigation in Persian/Arabic.

---

## A11Y-001 — Accessibility gate
**Owner:** QA/FE
**Priority:** P1

Check:
- keyboard
- focus
- contrast
- labels
- errors
- screen reader
- reduced motion

---

## MOBILE-001 — Mobile UX pass
**Owner:** UX/FE
**Priority:** P1

Test widths:

```text
375
390
412
```

---

# 17. W15 — Security

## SEC-001 — Authorization audit
**Owner:** SEC/BE
**Priority:** P0

Test IDOR and tenant isolation for all sensitive resources.

---

## SEC-002 — Webhook security
**Owner:** SEC/BE
**Priority:** P0

Verify signature, replay protection and source validation.

---

## SEC-003 — Secrets audit
**Owner:** DEVOPS/SEC
**Priority:** P0

No production secrets or fallback credentials in repo/CI.

---

## SEC-004 — Demo mode hard stop
**Owner:** BE/DEVOPS
**Priority:** P0

Production must fail closed if demo-only mode is enabled.

---

## SEC-005 — File/document security
**Owner:** SEC/BE
**Priority:** P1

Validate:
- MIME
- size
- extension
- object access
- signed URL expiry

---

## SEC-006 — Abuse testing
**Owner:** SEC/QA
**Priority:** P1

Test:

```text
OTP brute force
rate limit bypass
open redirect
SSRF
XSS
upload abuse
```

---

# 18. W15–W16 — Observability & Operations

## OBS-001 — Correlation IDs
**Owner:** BE
**Priority:** P0

Propagate:

```text
requestId
correlationId
causationId
sagaId
bookingId
paymentId
supplierRequestId
```

---

## OBS-002 — Structured logs
**Owner:** BE/DEVOPS
**Priority:** P0

Logs must be machine-readable and redact sensitive data.

---

## OBS-003 — Business metrics
**Owner:** DATA/BE
**Priority:** P1

Track:
- search latency
- zero-result rate
- booking success
- payment success
- ticket issue
- refund completion
- supplier timeouts
- price changes
- checkout conversion

---

## OBS-004 — Health endpoints
**Owner:** BE
**Priority:** P0

Create:

```text
/api/health/live
/api/health/ready
```

---

## OBS-005 — Alerts
**Owner:** DEVOPS
**Priority:** P1

Alert on:
- payment failure spike
- booking failure spike
- supplier timeout spike
- queue backlog
- reconciliation backlog
- refund SLA breach

---

# 19. W16 — QA / Certification

## QA-001 — Unit test baseline
**Owner:** QA/BE
**Priority:** P0

Critical domain services >= meaningful branch coverage.

---

## QA-002 — Integration test suite
**Owner:** QA/BE
**Priority:** P0

Run against PostgreSQL.

---

## QA-003 — Golden Journey E2E
**Owner:** QA
**Priority:** P0

```text
Home
→ Search
→ Select
→ Traveler
→ Hold
→ Payment
→ Supplier Confirmation
→ Ticket
→ My Trips
```

Assert database/business outcomes, not just page load.

---

## QA-004 — Payment adversarial E2E
**Owner:** QA/SEC
**Priority:** P0

Test duplicate webhook, wrong amount, wrong currency, timeout, retry, refund.

---

## QA-005 — Inventory concurrency suite
**Owner:** QA
**Priority:** P0

Capacity-one concurrent test.

---

## QA-006 — Saga recovery suite
**Owner:** QA
**Priority:** P0

Worker crash/restart test.

---

## QA-007 — Visual regression
**Owner:** QA/UX
**Priority:** P1

Baseline:

```text
Home
Flight Search
Flight Results
Hotel Search
Hotel Detail
Planner
Checkout
My Trips
ERP Dashboard
Travel File
```

---

## QA-008 — Cross-browser matrix
**Owner:** QA
**Priority:** P1

Desktop:
- Chromium
- Firefox
- WebKit

Mobile:
- Chromium mobile

---

## QA-009 — Accessibility regression
**Owner:** QA
**Priority:** P1

Automated accessibility checks on critical routes.

---

## QA-010 — Load test baseline
**Owner:** QA/DEVOPS
**Priority:** P1

Establish baseline for:
- search
- booking hold
- payment webhook
- ERP dashboard queries

---

# 20. W17 — AI Readiness

## AI-001 — Read-only domain query layer
**Owner:** BE/AI
**Priority:** P2

AI can query approved views for:
- inventory
- pricing
- destinations
- booking state
- supplier health

---

## AI-002 — Recommendation engine
**Owner:** AI/DATA
**Priority:** P2

Destination and product ranking based on user intent and context.

---

## AI-003 — ERP copilot
**Owner:** AI/ERP
**Priority:** P2

Capabilities:
- summarize Travel File
- detect anomalies
- explain reconciliation mismatch
- suggest operational priority

No direct financial state mutation.

---

## AI-004 — Approval boundary
**Owner:** SEC/BE
**Priority:** P2

Sensitive action flow:

```text
AI Suggestion
→ Human Approval
→ Command
→ Domain
→ Audit
```

---

# 21. Required backend test matrix

## Payment

```text
✓ duplicate webhook
✓ duplicate capture
✓ wrong amount
✓ wrong currency
✓ wrong booking
✓ timeout
✓ retry
✓ partial refund
✓ full refund
```

## Inventory

```text
✓ concurrent hold
✓ expired hold
✓ release
✓ capture
✓ stop sell
✓ zero inventory
✓ oversell prevention
```

## Booking

```text
✓ valid transition
✓ invalid transition
✓ duplicate confirmation
✓ supplier timeout
✓ supplier failure
✓ cancellation
✓ expiry
```

## Finance

```text
✓ debit = credit
✓ duplicate posting
✓ wrong currency
✓ refund posting
✓ settlement mismatch
✓ reversal
```

## Authorization

```text
✓ tenant isolation
✓ role permission
✓ resource scope
✓ admin escalation
✓ audit visibility
```

---

# 22. Definition of Done

A task affecting production behavior is complete only if all applicable checks pass:

```text
[ ] Implementation complete
[ ] Unit tests
[ ] Integration tests
[ ] E2E tests when user/business flow changes
[ ] Typecheck
[ ] Lint
[ ] Migration reviewed
[ ] Authorization reviewed
[ ] Audit impact reviewed
[ ] i18n keys added
[ ] RTL checked
[ ] Mobile checked
[ ] Accessibility checked
[ ] Observability added
[ ] Error state handled
[ ] Loading state handled
[ ] Empty state handled
[ ] Rollback/recovery considered
[ ] Documentation updated
```

---

# 23. Release gates

## Gate A — Backend production readiness

All P0 tasks complete:
- DB
- Money
- Inventory
- Booking
- Payment
- Supplier
- Saga/Outbox
- Refund
- Accounting
- Security

## Gate B — ERP operational readiness

- Travel File
- Exceptions
- Reconciliation
- Role dashboards
- audit
- global search

## Gate C — B2C release readiness

- Search
- Results
- Checkout
- My Trips
- Wallet
- Mobile
- i18n
- A11y

## Gate D — Release certification

- E2E green
- Visual green
- security checks green
- PostgreSQL-only CI green
- performance baseline green
- no unresolved P0/P1 production defects

---

# 24. 9/10 scorecard

## Backend — 9/10

```text
Postgres
Money/Decimal
Idempotency
Concurrency
State machines
Saga
Outbox
Supplier adapters
Audit
Observability
```

## Finance — 9/10

```text
Double-entry
Immutable ledger
Tax engine
FX
Invoices
Commission
Settlement
Reconciliation
```

## Travel — 9/10

```text
Trip
Booking
Inventory
Flight
Hotel
Supplier
Ticketing
Refund
Ancillaries
```

## ERP — 9/10

```text
Travel File
Exception Center
Operations
Finance
Supplier
Inventory
Reporting
Approvals
Global Search
```

## B2C — 9/10

```text
Intent-first Home
Decision-first Search
Simple Checkout
Personalization
Mobile-first
Accessibility
Localization
Trust
```

---

# 25. Suggested team split

## Backend Team
Owns:
- DB
- domain models
- state machines
- booking
- payment
- refund
- inventory
- supplier
- saga
- accounting
- reconciliation

## ERP Team
Owns:
- Travel File
- dashboard
- exception center
- finance screens
- operations queues
- permissions UI
- tables

## B2C Team
Owns:
- home
- search
- results
- planner
- checkout
- my trips
- wallet
- services

## QA / Platform Team
Owns:
- CI/CD
- E2E
- visual regression
- accessibility
- load tests
- security tests
- observability

---

# 26. Agent assignment rules

Every AI coding agent must be assigned a bounded task such as:

```text
PAY-006
INV-003
BOOK-004
ERP-002
UX-004
QA-005
```

Agent must not:
- rewrite unrelated domains
- introduce a second architecture
- change database provider without DB task
- change state semantics without Booking/PAY task
- bypass domain services with direct DB writes
- add fake production capability
- mark work done without running required validation

### Required agent output

```text
Changed files
Database changes
Behavior changes
Tests added/updated
Known limitations
Acceptance criteria status
```

---

# 27. Final implementation rule

The project should optimize for:

```text
Correctness
> Data integrity
> Security
> Reliability
> Observability
> UX
> Performance
> Feature count
```

Do not add new major domains until the P0 transaction core is stable.

---

# 28. Immediate next 20 tasks

Execute these first, in order:

1. ARC-001
2. ARC-003
3. DB-001
4. DB-002
5. DB-003
6. DB-004
7. IAM-001
8. IAM-003
9. IAM-004
10. MONEY-001
11. MONEY-002
12. TAX-001
13. INV-003
14. BOOK-003
15. BOOK-004
16. PAY-001
17. PAY-003
18. PAY-005
19. ASYNC-001
20. ASYNC-003

After #20, the team should reassess implementation reality before starting the next block.

---

# 29. Non-goals during the P0 hardening window

Do not spend significant engineering capacity on:

```text
Microservices migration
Kubernetes complexity
Large visual rewrite
Unbounded AI features
GraphQL migration
Offline-first PWA expansion
```

These are secondary until the transaction core is production-safe.
