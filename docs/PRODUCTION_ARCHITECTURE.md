# iTRIP Production Architecture (DOC-003)

Canonical runtime architecture as of the 2026-09-06 hardening run (baseline `0fc1a105` + W0/IAM continuations).
Evidence-based; supersedes prose claims in older docs. Companion docs:
`docs/baseline/FEATURE_REALITY_MATRIX.md` (per-area status), `docs/PRODUCTION_ENV_CONTRACT.md` (env),
`docs/RELEASE_CHECKLIST.md` (release), `docs/baseline/DB_MODEL_OWNERSHIP.md` (model owners),
`docs/baseline/COMMAND_QUERY_MAP.md` (action-level audit).

## 1. Layering rule (BASE-006, enforced by eslint)

```
app/[locale] pages ─┐
app/api routes ─────┼─► actions (src/actions) ─► domain services (src/domains) ─► prisma
components ─────────┘              │                     │
stores/hooks (client)              └── lib/ (Money, pricing, tax, security) ◄──┘
```

- Actions authenticate/validate/dispatch only; business workflows live in domains.
- Domains must not import app/components/actions/stores/hooks (lint error).
- Pages must not import Prisma directly (warn — legacy admin pages to be ratcheted).
- UI reads/writes only through actions and query surfaces.

## 2. Domain services (single mutation authorities)

| Domain (src/domains/…) | Service | Owns | Notes |
|---|---|---|---|
| booking | `BookingStateMachine` | legal transitions for Booking/Payment/Fulfillment/Ticket lifecycles | statuses are strings; legality lives here only |
| booking | `BookingSagaOrchestrator.confirmBookingSaga` | confirm flow: payment → hold capture → ledger → revenue → CONFIRMED (+outbox+saga record) | money path Decimal end-to-end |
| booking | `BookingDomainService` | price breakdown; `expireStaleBookings` lifecycle sweeper | draft-creation wiring pending (blocked by staged booking.ts) |
| payments | `PaymentDomainService` | PaymentIntent/Attempt/GatewayTransaction/Payment; `processPayment`; `processWebhook` | webhook: signature fail-closed, raw-body HMAC, replay window, per-event + per-booking idempotency, terminal-state guard; writes PAYMENT_CAPTURED audit |
| payments | `gateway-port.ts` | PSP boundary: Shetab (fail-closed), InternalWallet, Demo (non-prod only) | **no real PSP yet** — rails simulated |
| inventory | `InventoryEngine` | holds/captures/releases/compensation; `setAllotmentPolicy` | row-locked raw SQL; oversell invariant; capacity mutations must route here |
| ledger | `GeneralLedgerService` | double-entry posting (wallet/gateway/revenue/FX/refund templates), balance reads | SUM(DEBIT)=SUM(CREDIT) invariant |
| ledger | `ReconciliationService` | ledger balance scan; booking financial 3-way match; files exceptions via ERP-009 dedupe | |
| refund | `RefundDomainService.processRefund` | Refund aggregate: policy snapshot + approval + attempt + ledger reversal + hold compensation, idempotent | used by admin command |
| finance | `InvoiceDomainService`, `CommissionService`, `SettlementDomainService`, `FinancialReconciliationEngine`, `OperationalExceptionService` | invoicing/commission/settlement/3-way match/exception center | **services tested but not yet wired to production commands** (except exception filing) |
| identity | `permission-service` + `permissions` + `tenant-scoper` | relational RBAC, tenant context, Prisma scoping | JWT role/permission claims relational; legacy JSON neutralized |
| currency | `CurrencyService` | FX conversion (StaticRateProvider — SIMULATED) | no FX snapshot persistence yet |
| events | `OutboxConsumer`, `NotificationProvider` | transactional outbox pump; SMS/email (fail-closed in prod) | OTP codes AES-GCM sealed in outbox payloads |
| supplier | ports + `supplier-orchestration` (CircuitBreaker) | provider boundary + canonical models | adapters serve local catalogs (MOCK) |

## 3. Application commands/queries (src/actions)

- `booking.ts`: createBookingDraft (server-authoritative reprice + hold), payBooking (saga), wallet top-up/exchange/get, booking reads. *(largest inline-logic concentration — wiring into domains is queued)*
- `admin.ts`: ERP queries (finance stats, bookings, suppliers, inventory) + commands (supplier/inventory create, `updateAllotment` → engine, `refundBookingAdmin` → RefundDomainService).
- `auth.ts`: credentials/OTP login, profile/KYC with field-level AES-256-GCM.

## 4. Workers (in-process via `instrumentation.register()`)

| Interval | Worker | Duty |
|---|---|---|
| 60s | HoldExpirationWorker (+ BookingDomainService.expireStaleBookings) | expire holds; expire abandoned HELD/PENDING_PAYMENT bookings |
| 10s | OutboxConsumer | claim (FOR UPDATE SKIP LOCKED) → deliver (PNR stamping, refund notices, OTP) → retry/backoff → DLQ |
| 15s | SagaWorker | resume/compensate RUNNING sagas; stale-lease recovery |
| 30min | ReconciliationService.reconcileLedger | ledger balance health sweep |
| 60s | AutoBuyWorker | auto-buy rule evaluation *(concurrent feature)* |

⚠️ All workers live inside the web process — serverless/multi-node deployments need a dedicated worker or external scheduler (W6 gap).

## 5. Cross-cutting

- **Correlation:** booking/refund/outbox/saga records carry `correlationId`; webhook events carry `eventId` + unique `(gatewayName,eventId)` idempotency.
- **Audit (IAM-011):** refund, gateway capture, voucher issue, document access write `AuditLog`.
- **Exceptions (ERP-009):** all filings go through `OperationalExceptionService.raiseException` — dedupe on (type, entityType, entityId) while open, SLA re-armed on recurrence.
- **PII:** traveler documents/national IDs AES-256-GCM via `crypto-vault` (`enc:v1:…`), masked on read.
- **Rate limiting:** in-memory token buckets (OTP identifier+IP, webhook per IP) — per-instance; shared store needed for multi-replica.
- **Startup contract:** `assertProductionConfig()` fails fast on demo flags/missing secrets (BASE-008).

## 6. Known architecture debts (tracked in the reality matrix)

1. Real PSP adapter (PAY-004) — production payments fail closed until shipped.
2. `createBookingDraft` inline logic → BookingDomainService (after staged travel-date work merges).
3. Wallet balance computed in 3 places → unify on `GeneralLedgerService`.
4. Invoice/Commission/Settlement/3-way engines unwired to commands.
5. `Trip` (Travel File) is read-only — nothing writes dossiers yet.
6. Tenant-scoped Prisma extension adopted by one query surface only.
7. Workers outside web process; correlation-ID propagation edge→action.
8. Quote/price TTL explicit enforcement (B2C-007) — currently approximated by hold/intent TTL + booking expiry.
