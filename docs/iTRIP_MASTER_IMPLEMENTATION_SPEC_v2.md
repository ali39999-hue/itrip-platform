# iTRIP / FIRUZO — MASTER IMPLEMENTATION SPECIFICATION v2.0

**هدف:** تبدیل `itrip-platform` از Prototype/Pre-Production به یک Travel Platform + Travel ERP قابل اتکا، مقیاس‌پذیر و قابل توسعه.

**Scope:** B2C + B2B + ERP + Booking + Inventory + Supplier Integrations + Payments + Refunds + Finance + Reconciliation + Notifications + AI-ready architecture.

**مرجع فعلی پروژه:** `ali39999-hue/itrip-platform`, branch `main`

---

## 0. اصول غیرقابل مذاکره

1. PostgreSQL منبع حقیقت Production/Test/Staging است؛ SQLite فقط در صورت نیاز برای ابزارهای مستقل و غیرتراکنشی.
2. `prisma db push` در CI/Production ممنوع؛ migration رسمی با Prisma Migrate.
3. Money در هسته کسب‌وکار با `Decimal`/Money Object؛ `number` برای پول ممنوع.
4. Booking، Payment، Fulfillment، Ticket و Refund وضعیت‌های مستقل دارند.
5. هیچ تغییر مستقیم به statusهای حساس خارج از state machine/domain service مجاز نیست.
6. External API call در transaction طولانی DB انجام نمی‌شود.
7. External side effects با Outbox/Worker/Saga اجرا می‌شوند.
8. Payment/Webhook/Booking/Ticket/Refund/Ledger/Invoice/Commission idempotent هستند.
9. Ledger append-only و double-entry است؛ Debit = Credit.
10. داده‌های مورد استفاده برای query/reporting باید relational باشند؛ JSON برای snapshot/raw external payload مناسب است.
11. B2C، B2B و ERP یک UI یکسان ندارند؛ design language مشترک، density متفاوت.
12. Demo/Mock فقط adapter/environment feature است و نباید مسیر Production باشد.
13. AI مستقیماً state حساس را تغییر نمی‌دهد؛ Suggestion → Approval → Command.
14. هر feature باید Code + Typecheck + Lint + Unit/Integration + E2E/A11y/i18n در سطح مرتبط داشته باشد.
15. هر claim محصول در UI باید با قابلیت واقعی backend هم‌خوان باشد.

---

# 1. Target Architecture

```text
Experience
  ├── B2C
  ├── B2B
  ├── ERP
  └── Support
       ↓
Application
  ├── Commands
  ├── Queries
  ├── DTOs
  └── Policies
       ↓
Domain
  ├── Identity
  ├── Organization
  ├── Traveler
  ├── Catalog
  ├── Supplier
  ├── Inventory
  ├── Flight
  ├── Hotel
  ├── Tour
  ├── Pricing
  ├── Booking
  ├── Payment
  ├── Refund
  ├── Wallet
  ├── Accounting
  ├── Commission
  ├── Settlement
  ├── Reconciliation
  ├── Document
  ├── Notification
  ├── Support
  ├── Reporting
  └── Audit
       ↓
Infrastructure
  ├── PostgreSQL/Prisma
  ├── Redis/Cache
  ├── Object Storage
  ├── Supplier Adapters
  ├── PSP Adapters
  ├── Messaging
  └── External Providers
       ↓
Workers / Outbox / Saga
```

### Recommended code structure

```text
src/
├── app/
├── domains/
│   ├── identity/
│   ├── organization/
│   ├── traveler/
│   ├── catalog/
│   ├── supplier/
│   ├── inventory/
│   ├── flight/
│   ├── hotel/
│   ├── tour/
│   ├── pricing/
│   ├── booking/
│   ├── payment/
│   ├── refund/
│   ├── wallet/
│   ├── accounting/
│   ├── commission/
│   ├── settlement/
│   ├── reconciliation/
│   ├── document/
│   ├── notification/
│   ├── support/
│   ├── reporting/
│   └── audit/
├── application/
│   ├── commands/
│   ├── queries/
│   ├── dto/
│   └── policies/
├── infrastructure/
│   ├── prisma/
│   ├── suppliers/
│   ├── payments/
│   ├── storage/
│   ├── messaging/
│   └── cache/
├── workers/
│   ├── outbox/
│   ├── booking/
│   ├── payment/
│   ├── refund/
│   ├── reconciliation/
│   └── notification/
└── lib/
    ├── money/
    ├── time/
    ├── validation/
    ├── crypto/
    └── ids/
```

---

# 2. Database Master Model

## 2.1 Identity

### User

- id
- status
- defaultLocale
- defaultCurrency
- createdAt
- updatedAt
- lastLoginAt

### AuthIdentity

- id
- userId
- provider
- providerSubject
- verifiedAt
- createdAt

### PersonProfile

- userId
- firstName
- lastName
- displayName
- dateOfBirth
- nationality
- gender (nullable/optional)

### ContactMethod

- id
- userId
- type
- value
- normalizedValue
- isPrimary
- verifiedAt

### TravelerProfile

- id
- userId
- personId
- travelerType
- preferencesJson

### TravelDocument

- id
- travelerId
- type
- numberEncrypted
- issuingCountry
- issuedAt
- expiresAt
- holderName
- verificationStatus

Sensitive fields are encrypted or tokenized where operationally required.

---

# 3. Organization / B2B

### Organization

- id
- type: AGENCY | CORPORATE | PARTNER | INTERNAL
- legalName
- displayName
- registrationNo
- taxNo
- status
- defaultCurrency
- timezone

### OrganizationMembership

- id
- organizationId
- userId
- roleId
- branchId
- status

### Branch

- id
- organizationId
- name
- code
- timezone
- status

### CreditAccount

- id
- organizationId
- currency
- creditLimit
- availableCredit
- status

### CreditTransaction

- id
- creditAccountId
- type
- amount
- referenceType
- referenceId
- createdAt

### SettlementCycle

- id
- organizationId
- frequency
- cutoffRule
- dueRule
- status

---

# 4. Authorization

Use relational permissions:

```text
UserRole
Role
RolePermission
Permission
OrganizationMembership
ResourcePolicy
```

Permission naming:

```text
booking.read
booking.write
booking.cancel
booking.refund.request
booking.refund.approve
payment.read
payment.capture
payment.refund
inventory.read
inventory.hold
inventory.release
supplier.read
supplier.manage
finance.read
finance.post
finance.reconcile
report.read
settings.manage
```

Scopes:

```text
GLOBAL
ORGANIZATION
BRANCH
OWN
ASSIGNED
```

Sensitive actions require both permission and policy evaluation.

---

# 5. Supplier Domain

### Supplier

- id
- type
- legalName
- displayName
- status
- country
- defaultCurrency

### SupplierConnection

- id
- supplierId
- productType
- baseUrl
- environment
- timeoutMs
- retryPolicyId
- circuitBreakerPolicyId

### SupplierCredential

- id
- supplierConnectionId
- credentialRef
- expiresAt
- rotationState

Never store raw secrets in normal business tables.

### SupplierContract

- id
- supplierId
- contractNo
- validFrom
- validTo
- settlementCurrency
- termsSnapshot
- status

### SupplierProductMapping

- id
- supplierId
- internalProductId
- externalProductId
- externalCode

### SupplierHealth

- id
- supplierId
- windowStart
- windowEnd
- successRate
- timeoutRate
- latencyP50
- latencyP95
- errorRate

### SupplierStatement / SupplierStatementLine

For settlement and reconciliation.

---

# 6. Supplier Adapter Contract

Domain must depend on ports, not HTTP/SDK implementations.

```ts
interface FlightSupplierPort {
  search(input): Promise<SearchResult>
  price(input): Promise<PricedOffer>
  hold(input): Promise<SupplierHold>
  book(input): Promise<SupplierBooking>
  ticket(input): Promise<TicketResult>
  void(input): Promise<VoidResult>
  refund(input): Promise<RefundResult>
  exchange(input): Promise<ExchangeResult>
}
```

Implementations:

```text
MahanAdapter
ChinaSouthernAdapter
AmadeusAdapter
HotelSupplierAdapter
TransferSupplierAdapter
ESimSupplierAdapter
InsuranceSupplierAdapter
```

Every adapter must implement:

- timeout
- retry policy
- idempotency
- request/response logging without secrets
- correlation ID
- provider reference
- provider error normalization
- health metrics

---

# 7. Catalog

### Product

- id
- type
- status
- slug
- title
- description

### ProductTranslation

- productId
- locale
- title
- description

### ProductMedia

- productId
- storageObjectId
- kind
- sortOrder

This prevents the transaction schema from becoming the CMS.

---

# 8. Flight Domain

Required models:

```text
Airline
Airport
Flight
FlightSegment
FlightOffer
Fare
FareRule
BaggageAllowance
Seat
SSR
PNR
Ticket
TicketDocument
EMD
```

Booking must preserve:

- supplier reference
- PNR
- fare basis
- cabin
- baggage
- fare rules
- ticket number
- segment timing/timezone

---

# 9. Hotel Domain

Required models:

```text
Property
PropertyTranslation
RoomType
RoomAmenity
RatePlan
MealPlan
RoomInventory
HotelRate
CancellationPolicy
```

Required result facts:

- total price
- price per night
- number of nights
- meal plan
- cancellation policy
- taxes/fees
- room occupancy
- provider
- availability timestamp

---

# 10. Inventory Domain

### Core

```text
InventoryProduct
InventoryOffer
Availability
Allotment
InventoryHold
InventoryCommit
InventoryRelease
StopSell
```

Inventory modes:

```text
FREE_SALE
ALLOTMENT
ON_REQUEST
```

### Hold invariants

```text
available = total - booked - activeHolds
```

But the mutation must be atomic.

Preferred PostgreSQL pattern:

1. lock/conditional update availability row
2. verify capacity
3. create hold
4. commit

### Required tests

- 100 concurrent holds against capacity=1 → exactly 1 succeeds
- expired hold becomes EXPIRED
- release returns capacity
- double capture is rejected
- duplicate release is idempotent

---

# 11. Pricing Domain

### PricingRule

- id
- name
- priority
- scope
- version
- validFrom
- validTo
- conditionJson
- actionJson
- status

### PriceQuote

- id
- booking/session reference
- currency
- total
- generatedAt
- expiresAt

### PriceQuoteLine

```text
SUPPLIER_COST
SUPPLIER_FEE
MARKUP
PLATFORM_FEE
TAX
PAYMENT_FEE
ADDON
DISCOUNT
FX_ADJUSTMENT
```

Pipeline:

```text
Supplier Cost
→ Supplier Fee
→ Markup
→ Channel/Customer Rule
→ Platform Fee
→ Tax
→ Add-ons
→ Promotion
→ FX
→ Rounding
→ Final Sell Price
```

All applied rules and FX values must be snapshotted into the booking quote.

---

# 12. Money / Currency Kernel

```ts
type Money = {
  amount: Decimal
  currency: CurrencyCode
}
```

Required primitives:

```text
Money
Currency
ExchangeRate
RoundingPolicy
TaxRule
```

No `Math.round()` in financial domain.

No floating point arithmetic for financial truth.

Required stored data:

```text
transactionAmount
transactionCurrency
baseAmount
baseCurrency
fxRate
fxSource
fxTimestamp
```

---

# 13. Tax Engine

### TaxRule

- jurisdiction
- country
- serviceType
- rate
- method
- validFrom
- validTo
- priority

Replace all hard-coded tax values with rule lookup.

Required tests:

- country/service-specific rate
- date-effective rate
- tax-exempt case
- rounding
- multi-line booking tax

---

# 14. Trip + Booking Model

## Trip

```text
Trip
 ├── Booking[]
 ├── Traveler[]
 ├── Document[]
 ├── Payment[]
 ├── Refund[]
 ├── SupportCase[]
 └── Timeline[]
```

## Booking

- id
- reference
- tripId
- customerId
- organizationId (nullable for B2C)
- channel
- status
- currency
- createdAt
- expiresAt

## BookingItem

- id
- bookingId
- productType
- productId
- supplierId
- status
- quantity
- serviceDate
- priceQuoteId

## BookingTraveler

- bookingItemId
- travelerId
- role
- documentSnapshotId

## BookingSupplierReference

- bookingItemId
- supplierId
- externalBookingReference
- externalPnr
- externalStatus

---

# 15. Booking State Machine

### BookingStatus

```text
DRAFT
QUOTED
HELD
PENDING_PAYMENT
CONFIRMING
CONFIRMED
CANCEL_REQUESTED
CANCELLING
CANCELLED
EXPIRED
FAILED
```

### FulfillmentStatus

```text
PENDING
IN_PROGRESS
CONFIRMED
FAILED
```

### TicketStatus

```text
NOT_ISSUED
ISSUING
ISSUED
VOIDED
REFUND_PENDING
REFUNDED
```

### Rules

No direct DB writes to these fields except through controlled domain/application commands.

Invalid transition must fail.

Every transition writes history with:

- previous state
- next state
- actor/system source
- reason
- correlationId
- timestamp

---

# 16. Booking Commands

```text
CreateBooking
QuoteBooking
HoldBooking
StartPayment
ConfirmPayment
ConfirmBooking
CancelBooking
ExpireBooking
RequestRefund
```

Queries:

```text
GetBooking
GetTrip
GetTravelFile
SearchBookings
GetBookingTimeline
```

---

# 17. Payment Domain

Required models:

```text
PaymentIntent
Payment
PaymentAttempt
PaymentGateway
PaymentMethod
GatewayTransaction
WebhookEvent
Refund
RefundAttempt
```

### PaymentStatus

```text
INITIATED
AUTHORIZED
CAPTURED
FAILED
VOIDED
PARTIALLY_REFUNDED
REFUNDED
```

### Payment flow

```text
Create PaymentIntent
→ Create Attempt
→ Gateway Request
→ Customer Interaction
→ Webhook/Callback
→ Signature Verification
→ Amount/Currency Verification
→ Idempotency Check
→ Capture
→ Ledger Posting
→ Booking Confirmation
```

### Security

Never accept success purely because an external callback says success.

Verify:

- merchant
- amount
- currency
- booking/payment intent
- gateway reference
- signature
- replay/nonce
- gateway status

---

# 18. Refund Domain

Required models:

```text
Refund
RefundItem
RefundCalculation
RefundPolicySnapshot
RefundAttempt
RefundLedgerPosting
```

Workflow:

```text
REQUEST
→ ELIGIBILITY
→ POLICY_CHECK
→ PENALTY
→ SUPPLIER_REFUND
→ CUSTOMER_REFUND
→ LEDGER
→ COMPLETE
```

For high-value refunds:

```text
REQUEST
→ APPROVAL
→ EXECUTION
```

Refund idempotency is mandatory.

---

# 19. Wallet

Wallet is ledger-backed.

```text
Wallet
WalletAccount
WalletTransaction
```

Transactions:

```text
TOPUP
DEBIT
CREDIT
REFUND
TRANSFER
ADJUSTMENT
```

Balance must not be client-authoritative.

---

# 20. Accounting

Required models:

```text
ChartOfAccounts
Account
Journal
JournalEntry
JournalLine
PostingGroup
LedgerEntry
AccountingPeriod
FiscalYear
```

Invariant:

```text
SUM(DEBIT) = SUM(CREDIT)
```

Posted entries are immutable.

Correction:

```text
Original Entry
→ Reversal Entry
→ Correcting Entry
```

### Posting examples

Payment captured:

```text
DR Gateway Clearing / Customer Receivable
CR Cash/Escrow/Customer Liability
```

Revenue recognition:

```text
DR Clearing / Customer Liability
CR Revenue
CR Tax Payable
CR Supplier Payable (where applicable)
```

Refund:

```text
DR Refund/Customer Liability
CR Clearing/Cash
```

Exact accounts depend on legal/entity/accounting policy.

---

# 21. Commission

```text
CommissionPlan
CommissionRule
CommissionTier
CommissionAccrual
CommissionAdjustment
CommissionSettlement
```

Support commission recipients:

```text
SUPPLIER
AGENCY
AGENT
PARTNER
AFFILIATE
```

Commission must be calculated from immutable commercial snapshots.

---

# 22. Settlement

```text
SettlementBatch
SettlementLine
SupplierStatement
SupplierStatementLine
SettlementPayment
```

Every settlement should link back to:

```text
Booking
BookingItem
Supplier Reference
Invoice
Ledger
```

---

# 23. Reconciliation

Matching chain:

```text
Booking
 ↕
Payment
 ↕
Supplier Statement
 ↕
Invoice
 ↕
Ledger
 ↕
Bank/Gateway Settlement
```

### Result

```text
MATCHED
PARTIAL_MATCH
MISMATCH
UNRESOLVED
```

### Exception categories

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

# 24. Exception Center

### Exception

- id
- type
- severity
- entityType
- entityId
- ownerId
- status
- slaDueAt
- detectedAt
- resolution
- closedAt

Statuses:

```text
OPEN
ACKNOWLEDGED
IN_PROGRESS
WAITING_EXTERNAL
RESOLVED
CLOSED
```

ERP should prioritize exceptions above generic dashboards.

---

# 25. Saga / Outbox

## OutboxEvent

- eventId
- eventType
- aggregateType
- aggregateId
- correlationId
- causationId
- payload
- status
- availableAt
- lockedAt
- workerId
- retryCount
- lastError
- createdAt
- processedAt

## SagaExecution

- id
- sagaType
- aggregateType
- aggregateId
- status
- currentStep
- correlationId
- startedAt
- finishedAt

## SagaStep

- id
- sagaId
- stepType
- status
- attempts
- inputSnapshot
- resultSnapshot
- error
- startedAt
- finishedAt

## CompensationAction

- id
- sagaStepId
- actionType
- status
- attempts
- result

### Worker policy

```text
PENDING
→ CLAIMED
→ PROCESSING
→ PROCESSED
```

On failure:

```text
FAILED
→ RETRY with exponential backoff
→ DEAD_LETTER after max attempts
```

No long-running external API calls inside a DB transaction.

---

# 26. Notification

```text
NotificationTemplate
NotificationPreference
NotificationDelivery
NotificationChannel
```

Channels:

```text
EMAIL
SMS
WHATSAPP
TELEGRAM
PUSH
```

Delivery statuses:

```text
QUEUED
SENDING
SENT
FAILED
DELIVERED
READ
```

All asynchronous sends are triggered from Outbox.

---

# 27. Document Management

```text
Document
DocumentVersion
DocumentType
DocumentRelation
StorageObject
DocumentAccessLog
```

Document types:

```text
PASSPORT
VISA
TICKET
VOUCHER
INVOICE
INSURANCE
CONTRACT
RECEIPT
```

Use object storage for file bytes; DB stores metadata/reference.

---

# 28. Audit

Audit event fields:

- actorUserId
- organizationId
- action
- entityType
- entityId
- oldValue
- newValue
- reason
- requestId
- correlationId
- ip
- userAgent
- timestamp

High-risk actions require reason:

```text
refund.approve
booking.manual_cancel
pricing.override
ledger.adjust
supplier.override
wallet.adjust
```

---

# 29. API Contract Rules

Use stable DTOs and Zod validation.

```text
HTTP/Server Action
→ Auth
→ Policy
→ Validate Input
→ Command/Query
→ Domain
→ Repository
→ DTO
```

Never expose Prisma models directly as public API response contracts.

### Error envelope

```json
{
  "error": {
    "code": "PRICE_CHANGED",
    "message": "The supplier price changed.",
    "requestId": "..."
  }
}
```

Business error codes should be stable and localizable.

---

# 30. Repository Layer

Create interfaces:

```text
BookingRepository
PaymentRepository
RefundRepository
InventoryRepository
SupplierRepository
LedgerRepository
TravelFileRepository
ReconciliationRepository
```

Domain logic must not depend directly on Prisma implementation details.

---

# 31. Time / Timezone Rules

Travel events must store:

```text
localDateTime
timezone
utcInstant
```

Rules:

- date-only values are distinct from timestamps
- departure/arrival keep airport timezone
- hotel check-in/check-out keep property timezone
- reporting converts to organization/user timezone only at presentation layer

---

# 32. Frontend Architecture

Keep current strong foundation:

```text
Next.js App Router
React
TypeScript
Tailwind
next-intl
Zustand
Playwright
```

Do not rewrite the frontend wholesale.

Refactor around:

```text
Feature
  ├── UI
  ├── hooks
  ├── schema
  ├── actions
  └── view-model
```

---

# 33. B2C UX Target

## Home

```text
Hero / Intent
→ Search or Plan
→ Continue Trip / Personalized Recommendation
→ Destinations
→ Relevant Services
→ Offers
→ Trust
→ Editorial
```

Do not present every service as equal priority.

## Search

Three UI states are mandatory:

```text
Loading
Partial Results
No Results
Provider Failure
```

## Search result hierarchy

Every card answers:

```text
WHAT?
WHY?
HOW MUCH?
NEXT?
```

## Hotel Card

Must show:

- total stay price
- cancellation
- meal plan
- rating
- why recommended
- primary CTA

## Checkout

```text
Select
→ Travelers
→ Extras
→ Review
→ Pay
→ Confirmation
```

Mobile uses sticky total + CTA.

---

# 34. My Trips / Travel OS

Trip page should aggregate:

```text
Timeline
Flight
Hotel
Transfer
eSIM
Insurance
Tickets
Vouchers
Payments
Refunds
Documents
Support
```

This is a major product differentiator.

---

# 35. ERP UX Architecture

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
Supplier Health
Contracts
Inventory
Availability
Allotments
Stop Sell
Pricing
Markup
Commission
Promotions
Operations
Ticketing
Queues
Exceptions
SLA
Payments
Refunds
Invoices
Finance
Accounting
Ledger
Reconciliation
Settlement
Documents
Support
Reports
Analytics
Users
Roles
Permissions
Audit
Settings
```

## ERP Dashboard strategy

### Operations

Pending ticketing / supplier timeouts / expiring holds / refund queue / exceptions.

### Finance

Cash / AR / AP / refund pending / unreconciled / revenue / margin / FX.

### Sales

Quotes / bookings / revenue / conversion / commission.

### Management

GMV / revenue / margin / profit / bookings / cancellation / supplier health.

---

# 36. Travel File

Primary ERP entity view:

```text
TRAVEL FILE
 ├── Customer
 ├── Travelers
 ├── Bookings
 ├── PNRs
 ├── Tickets
 ├── Hotel Vouchers
 ├── Transfers
 ├── eSIM
 ├── Insurance
 ├── Payments
 ├── Refunds
 ├── Invoices
 ├── Documents
 ├── Support Cases
 └── Timeline
```

Global search must resolve:

```text
Booking ID
PNR
Ticket number
Invoice number
Payment ID
Customer
Phone
Passport/reference
Supplier reference
```

---

# 37. ERP Data Table standard

Every main table supports:

- search
- advanced filters
- saved views
- sort
- pagination
- column visibility
- bulk actions
- export
- keyboard navigation
- row detail drawer/page

---

# 38. i18n / RTL

Supported locales remain:

```text
fa
 en
 ar
 zh
 ru
```

No production user-facing strings outside translation messages.

Remove/shrink the `lt.ts` compatibility layer after migration.

Every release has translation completeness check.

RTL acceptance includes:

- layout mirroring
- icons with directional semantics
- tables
- dates/numbers
- validation messages
- dialogs/sheets
- mobile CTA placement

---

# 39. Design System Governance

Existing tokens/primitives remain.

Add CI lint rules against:

```text
raw hex colors
random radius values
random shadows
unapproved typography
arbitrary spacing in production UI
```

Create semantic icon registry.

---

# 40. Security Baseline

Mandatory test categories:

```text
IDOR
RBAC bypass
Tenant leakage
OTP brute force
Replay attacks
Webhook forgery
Open redirect
SSRF
XSS
unsafe file upload
secret leakage
rate limiting
```

Production must fail closed when:

```text
DEMO_MODE=true
```

unless explicitly deployed to an isolated demo environment.

---

# 41. CI/CD Target

```text
Install
→ Lint
→ Typecheck
→ Unit
→ PostgreSQL service
→ Prisma migrate deploy
→ Seed
→ Integration
→ E2E Desktop
→ E2E Mobile
→ Accessibility
→ Visual Regression
→ Security Scan
→ Build
```

Pipeline should publish artifacts:

- Playwright report
- screenshots
- traces
- coverage
- build logs

Do not commit test artifacts to source control.

---

# 42. Test Pyramid

## Unit

Money / pricing / tax / state machine / commission / accounting.

## Integration

Repositories / transactions / payments / inventory / outbox / workers.

## E2E

Golden journeys.

## Property/Invariant tests

```text
Debit == Credit
No oversell
Idempotent commands
No invalid transitions
No duplicate captures
```

---

# 43. Golden Journeys

### GJ-001 Flight purchase

```text
Home
→ Search
→ Select offer
→ Traveler
→ Review
→ Payment
→ Supplier confirmation
→ Ticket
→ My Trips
```

Assertions:

```text
payment = CAPTURED
booking = CONFIRMED
fulfillment = CONFIRMED
 ticket = ISSUED
ledger balanced
trip exists
```

### GJ-002 Hotel booking

### GJ-003 Combined trip

```text
Flight + Hotel + Transfer + eSIM
```

### GJ-004 Refund

```text
Booking
→ Refund request
→ Eligibility
→ Supplier refund
→ Customer refund
→ Ledger
```

### GJ-005 B2B

```text
Agency login
→ search
→ quote
→ credit booking
→ statement
```

---

# 44. Resilience Tests

### Payment

- duplicate webhook
- wrong amount
- wrong currency
- gateway timeout
- callback replay
- duplicate capture

### Booking

- duplicate confirm
- provider timeout
- invalid transition
- worker crash

### Inventory

- 100 concurrent holds/capacity 1
- simultaneous capture
- hold expiry
- retry after worker crash

### Accounting

- unbalanced posting rejected
- duplicate posting prevented
- reversal works
- multi-item booking correct

---

# 45. Observability

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

Key metrics:

```text
search_latency
search_zero_result_rate
price_change_rate
booking_success_rate
payment_success_rate
ticket_issue_rate
supplier_timeout_rate
refund_completion_time
reconciliation_mismatch_rate
checkout_conversion
```

Health endpoints:

```text
/api/health/live
/api/health/ready
```

Readiness checks critical infrastructure.

---

# 46. Reporting / Analytics

Do not run heavy dashboards directly against high-write transactional tables.

Introduce:

```text
read models
materialized views
aggregates
```

Core KPIs:

```text
GMV
Revenue
Gross Margin
Net Margin
Bookings
Cancellation Rate
Payment Success
Supplier Success
Refund SLA
AR/AP
```

---

# 47. AI Layer

AI reads through safe query interfaces.

AI can:

```text
recommend
summarize
classify
prioritize
explain
flag anomalies
```

Sensitive mutations require approval.

Examples:

```text
ERP reconciliation suggestion
Supplier risk alert
Refund prioritization
Pricing suggestion
Customer trip recommendation
```

---

# 48. Implementation Roadmap

## Phase 0 — Reality Sync

**Goal:** Code = DB = Docs = CI = Environment.

Tasks:

- [P0] Switch datasource to PostgreSQL.
- [P0] Create migration baseline.
- [P0] Replace CI `db push` with migration deployment.
- [P0] Remove/guard demo production flags.
- [P0] Audit all README/HANDOFF claims.
- [P1] Remove `lt.ts` compatibility paths.

Exit criteria:

```text
PostgreSQL everywhere
Migrations green
CI reproducible
No accidental demo path
```

---

## Phase 1 — Money + Foundation

Tasks:

- [P0] Money object / Decimal kernel.
- [P0] Replace financial `number` inputs.
- [P0] Currency model.
- [P0] FX rate model.
- [P0] TaxRule model.
- [P0] Rounding policy.
- [P0] Repository interfaces.
- [P0] Command/query DTO validation.

Exit criteria:

```text
No floating-point financial truth
No hard-coded VAT
```

---

## Phase 2 — Identity / Organization / RBAC

Tasks:

- [P0] User/Profile split.
- [P0] Traveler domain.
- [P0] TravelDocument.
- [P0] Organization/Branch.
- [P0] Agency/Corporate.
- [P0] Role/Permission relational model.
- [P0] Tenant/resource scope.
- [P0] Audit hardening.

---

## Phase 3 — Inventory

Tasks:

- [P0] InventoryOffer.
- [P0] Atomic hold.
- [P0] Locking/concurrency strategy.
- [P0] Hold expiry worker.
- [P0] Capture/release idempotency.
- [P0] Concurrency suite.

---

## Phase 4 — Booking / Trip

Tasks:

- [P0] Trip aggregate.
- [P0] BookingItem.
- [P0] Traveler association.
- [P0] Supplier references.
- [P0] Price snapshot.
- [P0] Policy snapshot.
- [P0] State machine enforcement.

---

## Phase 5 — Payments / Refunds

Tasks:

- [P0] PaymentIntent.
- [P0] PaymentAttempt.
- [P0] Gateway abstraction.
- [P0] Webhook verification.
- [P0] Replay prevention.
- [P0] Amount/currency verification.
- [P0] Capture idempotency.
- [P0] Refund domain.
- [P0] Refund approval workflow.

---

## Phase 6 — Supplier Engine

Tasks:

- [P0] SupplierConnection.
- [P0] Credential reference architecture.
- [P0] Supplier contract.
- [P0] Product mapping.
- [P0] Supplier health.
- [P0] Adapter interface.
- [P0] First real flight adapter.
- [P0] First real hotel adapter.

---

## Phase 7 — Saga / Outbox / Worker

Tasks:

- [P0] Outbox schema expansion.
- [P0] Claim/lock worker.
- [P0] Retry/backoff.
- [P0] DLQ.
- [P0] SagaExecution.
- [P0] SagaStep.
- [P0] Compensation.
- [P0] Crash recovery.

---

## Phase 8 — Accounting / Finance

Tasks:

- [P0] Chart of accounts.
- [P0] Journal.
- [P0] JournalEntry.
- [P0] JournalLine.
- [P0] Posting engine.
- [P0] Invoice.
- [P0] Commission.
- [P0] Settlement.
- [P0] Revaluation/FX.

---

## Phase 9 — Reconciliation / Exceptions

Tasks:

- [P1] Supplier statement import.
- [P1] Gateway settlement import.
- [P1] Match engine.
- [P1] Exception Center.
- [P1] SLA.
- [P1] Owner assignment.

---

## Phase 10 — ERP

Tasks:

- [P1] Travel File.
- [P1] Role dashboards.
- [P1] Global search.
- [P1] Advanced data tables.
- [P1] Operations queues.
- [P1] Supplier health screen.
- [P1] Finance screens.
- [P1] Reconciliation screens.

---

## Phase 11 — B2C UX

Tasks:

- [P1] Home intent-first redesign.
- [P1] Flight result redesign.
- [P1] Hotel result redesign.
- [P1] Planner UX refinement.
- [P1] Checkout simplification.
- [P1] My Trips / Travel OS.
- [P1] Wallet redesign.
- [P1] Contextual trust.
- [P1] Empty/error/partial-result states.

---

## Phase 12 — Mobile / Accessibility / i18n

Tasks:

- [P1] 375/390/412 layouts.
- [P1] Sticky CTA.
- [P1] Bottom sheets.
- [P1] keyboard/assistive tech.
- [P1] RTL audit.
- [P1] Translation completeness.
- [P1] reduced motion.

---

## Phase 13 — QA / Security / Performance

Tasks:

- [P0] CI with Postgres.
- [P0] E2E in CI.
- [P0] concurrency tests.
- [P0] crash-recovery tests.
- [P0] security regression suite.
- [P1] visual regression.
- [P1] load tests.
- [P1] Core Web Vitals.
- [P1] production monitoring.

---

## Phase 14 — AI

Tasks:

- [P2] AI Planner connected to real inventory.
- [P2] ERP Copilot.
- [P2] anomaly detection.
- [P2] supplier health intelligence.
- [P2] pricing recommendations.

---

# 49. Task Backlog — First 60 Tickets

## Database

**DB-001** PostgreSQL migration.

**DB-002** Prisma migration baseline.

**DB-003** CI Postgres service.

**DB-004** Migration deploy pipeline.

**DB-005** Index review.

**DB-006** Unique constraints review.

**DB-007** Referential integrity review.

**DB-008** Seed dataset.

## Money

**MONEY-001** Money primitive.

**MONEY-002** Decimal propagation.

**MONEY-003** Currency model.

**MONEY-004** FX model.

**MONEY-005** Rounding policy.

**MONEY-006** Remove hard-coded tax.

## Identity

**ID-001** User/Profile split.

**ID-002** Traveler model.

**ID-003** TravelDocument.

**ID-004** Organization.

**ID-005** Branch.

**ID-006** Role/Permission normalization.

## Inventory

**INV-001** Atomic hold.

**INV-002** Hold expiry worker.

**INV-003** Release idempotency.

**INV-004** Capture idempotency.

**INV-005** concurrency tests.

## Booking

**BOOK-001** Trip aggregate.

**BOOK-002** BookingItem redesign.

**BOOK-003** Status separation.

**BOOK-004** State machine enforcement.

**BOOK-005** Supplier references.

**BOOK-006** Price snapshot.

## Payment

**PAY-001** PaymentIntent.

**PAY-002** PaymentAttempt.

**PAY-003** Gateway interface.

**PAY-004** Webhook verification.

**PAY-005** Amount/currency verification.

**PAY-006** Replay protection.

**PAY-007** Capture idempotency.

## Refund

**REF-001** Refund model.

**REF-002** Refund calculation.

**REF-003** Supplier refund adapter.

**REF-004** Customer refund execution.

**REF-005** Refund ledger posting.

## Supplier

**SUP-001** SupplierConnection.

**SUP-002** SupplierCredential reference.

**SUP-003** SupplierContract.

**SUP-004** Product mapping.

**SUP-005** Supplier health.

## Workflow

**WF-001** Outbox schema expansion.

**WF-002** Outbox worker.

**WF-003** Retry/backoff.

**WF-004** DLQ.

**WF-005** SagaExecution.

**WF-006** SagaStep.

**WF-007** Compensation.

## Finance

**FIN-001** Chart of accounts.

**FIN-002** Journal.

**FIN-003** JournalLine.

**FIN-004** Posting engine.

**FIN-005** Immutable ledger.

**FIN-006** Reversal flow.

## ERP / UX

**ERP-001** Travel File.

**ERP-002** Exception Center.

**ERP-003** Global search.

**ERP-004** Role dashboard.

**UX-001** Home intent-first.

**UX-002** Search result hierarchy.

**UX-003** Checkout redesign.

**UX-004** Mobile checkout.

**UX-005** Empty/error/partial result states.

---

# 50. Acceptance Criteria by Domain

## Database

- All environments use PostgreSQL.
- Migrations reproducible from clean database.
- CI starts with empty DB and passes.
- No production dependency on SQLite.

## Payment

- Duplicate webhook never duplicates money movement.
- Wrong amount cannot capture.
- Wrong currency cannot capture.
- Restart after timeout is safe.
- Payment state is auditable.

## Inventory

- No oversell under concurrency.
- Expired holds release availability.
- Duplicate capture/release is safe.

## Booking

- Invalid state transitions fail.
- Multi-item booking supported.
- Supplier failure results in deterministic status and compensation path.

## Finance

- Every posted group balances.
- Posted entries immutable.
- Refund creates proper reversal/posting.
- FX data preserved.

## ERP

- Operator finds a Travel File from one search.
- Exceptions have owner/SLA/status.
- Finance can reconcile payment/supplier/ledger.

## UX

- User can understand primary CTA within seconds.
- All critical states have loading/empty/error/success UI.
- Mobile checkout remains usable at 375px.
- All supported locales render without missing strings.

---

# 51. Production Readiness Gate

Do not call the platform Production Ready until all P0s are green:

```text
[ ] PostgreSQL
[ ] Migration-based deployment
[ ] Money/Decimal
[ ] Tax rules
[ ] Inventory atomicity
[ ] Booking state enforcement
[ ] Payment gateway verification
[ ] Refund workflow
[ ] Supplier adapters
[ ] Outbox worker
[ ] Durable saga/recovery
[ ] Double-entry accounting
[ ] Reconciliation baseline
[ ] RBAC + organization isolation
[ ] Audit logging
[ ] Security regression suite
[ ] CI Postgres + E2E
[ ] Backup/restore drill
[ ] Health/readiness endpoints
[ ] Monitoring/alerts
```

---

# 52. Target Scorecard

A domain is considered **9/10 ready** only when:

```text
Functional Correctness      >= 9
Data Integrity              >= 9
Security                    >= 9
Performance                 >= 9
Observability               >= 9
Test Coverage/Quality      >= 9
Maintainability             >= 9
UX (where applicable)       >= 9
Accessibility               >= 9
Documentation               >= 9
```

No domain can claim 9 only because its UI looks polished.

---

# 53. Final Engineering Decision

Do **not**:

- rewrite the complete frontend
- jump to microservices
- add many AI agents before the transaction core is stable
- keep demo/simulated payment as an implicit production path
- use JSON as a substitute for relational modeling
- use client state as source of truth for money/inventory

Do:

- harden the current modular monolith
- move to PostgreSQL
- formalize domains
- build transactionally safe payment/inventory/accounting
- use Outbox + Workers + Saga
- make ERP operationally useful through Travel File + Exceptions + Reconciliation
- redesign B2C around intent and decision making
- enforce quality through CI, E2E, A11y, security and visual regression

---

# 54. Definition of Done for the Entire Platform

```text
Architecture ✅
Database ✅
Backend ✅
Booking ✅
Inventory ✅
Supplier ✅
Payments ✅
Refunds ✅
Accounting ✅
Reconciliation ✅
ERP ✅
B2C UX ✅
Mobile ✅
i18n/RTL ✅
Accessibility ✅
Security ✅
Performance ✅
Observability ✅
QA ✅
CI/CD ✅
Documentation ✅
```

**This document is the implementation contract. Any future AI agent/developer task should reference the relevant section and ticket ID instead of inventing a parallel architecture.**
