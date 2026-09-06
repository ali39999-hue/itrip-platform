# BASE-004 — DB Model → Domain Owner Map

Generated 2026-09-06 against baseline `0fc1a105`. Canonical owner = the domain that primarily reads/writes the model.
Legend: **ORPHAN** = zero production references · **UNWIRED** = service exists but has no production caller ·
**MULTI** = mutated from ≥3 unrelated layers.

## Identity / org / RBAC
| Model | Owner | Notes |
|---|---|---|
| User | identity | MULTI: created by NextAuth bootstrap + booking action lazy-create; updated by auth action. PII encrypted at all write sites |
| Organization / OrganizationBranch / OrganizationMembership | identity | read via permission-service includes; **no production write path** (seed/tests only) |
| TravelerProfile | identity | written from `actions/booking.ts:59` (cross-layer; findFirst-or-create without unique constraint → race duplicates) |
| TravelDocument | identity | written from `actions/booking.ts:79`; **tenant-scoper lists it with non-existent `organizationId`** |
| Role | identity | single writer (NextAuth bootstrap upsert) |
| Permission / RolePermission | identity | **ORPHAN** — runtime permissions are hardcoded strings (`domains/identity/permissions.ts`) |
| UserRole | identity | clean |
| OtpVerification | identity | clean (hashed codes, TTL, attempts) |

## Booking
| Model | Owner | Notes |
|---|---|---|
| Trip | erp (travel file) | **READ-ONLY model** — travel-files UI reads it; only seed writes it |
| Booking | booking | **MULTI/worst offender**: `actions/booking.ts:242`, `actions/admin.ts:153,186` (inline refund), `saga-orchestrator.ts:21,125`, `OutboxConsumer.ts:90` |
| BookingStatusHistory | booking | 3 writers, all state-machine-adjacent (OK) |
| PriceSnapshot | booking | nested create in `actions/booking.ts:290`; no TTL field |
| BookingItem | booking | nested create; PII snapshot in `details` JSON (encrypted) |

## Inventory
| Model | Owner | Notes |
|---|---|---|
| InventoryItem | inventory | writes via admin action; read cross-layer |
| Allotment | inventory | **MULTI**: engine raw-SQL paths + direct admin writes (`admin.ts:210,380,391`) bypassing the engine |
| InventoryHold | inventory | **MULTI**: engine + `booking.ts:323` (updateMany) + `admin.ts:207-218` (release) |

## Payments
| Model | Owner | Notes |
|---|---|---|
| PaymentIntent / PaymentAttempt / GatewayTransaction / Payment | payments | clean, centralized in PaymentDomainService |
| WebhookEvent | payments | unique `(gatewayName,eventId)` idempotency; read by reconciliation (acceptable) |

## Ledger / accounting / tax
| Model | Owner | Notes |
|---|---|---|
| ChartOfAccounts / JournalEntry / JournalLine / Account / LedgerEntry | ledger | writes centralized in GeneralLedgerService; **balance math duplicated** in wallet actions (`booking.ts:532-545,627-649`) and `admin.ts:19-75` |
| TaxJurisdiction | finance | **ORPHAN** |
| TaxRule | finance | read by `lib/finance/tax-engine.ts` (engine lives one layer too low — lib, not domain) |

## Refund / settlement / invoicing
| Model | Owner | Notes |
|---|---|---|
| Refund / RefundPolicySnapshot / RefundApproval / RefundAttempt / RefundItem | refund | **UNWIRED** — RefundDomainService is test-only; admin refund path never creates Refund rows |
| Invoice / InvoiceLine | finance | **UNWIRED** — InvoiceDomainService has no production caller |
| CommissionRule | finance | **UNWIRED** — CommissionService never called |
| SettlementBatch / SupplierStatement | finance | **UNWIRED** — SettlementDomainService test-only |

## Supplier
| Model | Owner | Notes |
|---|---|---|
| Supplier / SupplierContract | supplier | clean admin CRUD (`actions/admin.ts`) |
| SupplierConnection / SupplierCredential / SupplierHealth | supplier | **ORPHAN** (credentials storage/encryption not implemented anywhere) |

## Platform ops
| Model | Owner | Notes |
|---|---|---|
| AuditLog | platform | **MULTI**: 3 unrelated writers (admin action, OutboxConsumer, crypto-vault util) with no shared helper |
| OutboxEvent | platform | correct transactional-outbox pattern; producers: OTP events, saga; consumer + health reads |
| SagaExecution / SagaStep | platform | orchestrator writes + saga-worker consumes; orchestrator currently completes synchronously so worker is largely idle for booking-confirm saga |
| OperationalException | platform | cross-cutting by design; written by reconciliation/settlement/three-way engines, read by exceptions UI |

## Consolidation actions required (feeds later waves)
1. Wire Refund/Invoice/Commission/Settlement services into production commands or remove models.
2. Route every Allotment/InventoryHold mutation through InventoryEngine.
3. Extract refund flow from `actions/admin.ts` into RefundDomainService; give Booking a single mutation path.
4. Shared audit helper instead of 3 direct AuditLog writers.
5. Fix tenant-scoper model/column mismatch (Invoice, TravelDocument).
6. Move TaxRule access under finance domain; either use Permission/RolePermission relationally or drop them (IAM-001/003 decision).
