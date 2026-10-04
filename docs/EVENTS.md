# FIRUZO CHILD — DOMAIN EVENT TAXONOMY & CONTRACT SPECIFICATION

**Authority:** Section 8 of Master Roadmap  
**Pattern:** Transactional Outbox & Asynchronous Event Sourcing  
**Status:** Canonical Event Contract  

---

## 1. Domain Event Canonical Envelope

All domain events emitted by the Child platform strictly implement the following TypeScript schema:

```typescript
export interface DomainEvent<T = Record<string, unknown>> {
  /** Unique RFC-4122 UUID v4 event identifier */
  id: string;
  /** Dot-delimited event type in format: domain.entity.action */
  type: string;
  /** Schema version integer (monotonically increasing) */
  version: number;
  /** ISO-8601 UTC timestamp of occurrence */
  occurredAt: string;
  /** Originating service, e.g. "firuzo-child-business" */
  producer: string;
  /** Request correlation identifier for distributed tracing */
  correlationId: string;
  /** Event ID that caused this action (causation tracking) */
  causationId?: string;
  /** Organization or tenant ID scoping this event */
  tenantId?: string;
  /** User or actor UUID triggering this event */
  actorId?: string;
  /** Strongly-typed domain payload */
  payload: T;
}
```

---

## 2. Event Taxonomy & Payload Catalog

### 2.1 `child.request.draft_created` (v1)
- **Emitted When:** User initializes a new specialist tour request.
- **Payload:**
```json
{
  "requestId": "cm401req",
  "code": "FZB-2026-0042",
  "companyId": "cm101comp",
  "packageId": "cm101pkg",
  "departureId": "cm201dep",
  "paxCount": 2,
  "totalAmount": 985000000,
  "depositAmount": 295500000,
  "expiresAt": "2026-10-04T18:00:00.000Z"
}
```

### 2.2 `child.request.submitted` (v1)
- **Emitted When:** Terms are accepted and traveler passport details are submitted.
- **Payload:**
```json
{
  "requestId": "cm401req",
  "code": "FZB-2026-0042",
  "travelersCount": 2,
  "termsAccepted": true,
  "idempotencyKey": "sub_api_1790963933028"
}
```

### 2.3 `child.payment.deposit_captured` (v1)
- **Emitted When:** PSP verifies deposit payment for a specialist request.
- **Payload:**
```json
{
  "requestId": "cm401req",
  "paymentId": "cm501pay",
  "amountRial": 295500000,
  "gatewayRef": "SHP-9988221144",
  "paidAt": "2026-10-02T18:05:00.000Z"
}
```
- **Side Effects:** Capacity `bookedCount` incremented atomically; notification queued for company rep.

### 2.4 `child.request.reviewed` (v1)
- **Emitted When:** Operator reviews company qualification, documents, and approves or requests changes.
- **Payload:**
```json
{
  "requestId": "cm401req",
  "decision": "approved",
  "actorId": "usr_ops_01",
  "notes": "گواهی فعالیت فناوری و مدارک مسافران تایید شد."
}
```

### 2.5 `child.voucher.issued` (v1)
- **Emitted When:** Final settlement is paid and digital travel credentials/vouchers are minted.
- **Payload:**
```json
{
  "requestId": "cm401req",
  "voucherCode": "FZB-VCH-2026-0042",
  "travelerIds": ["trv_01", "trv_02"],
  "qrPayload": "HMAC-SHA256:FZB-VCH-2026-0042:9944",
  "issuedAt": "2026-10-02T18:15:00.000Z"
}
```

---

## 3. Transactional Outbox Pattern & Reliability Rules

1. **Transactional Emission:** Events are inserted into the outbox in the same database transaction as the domain aggregate mutation.
2. **Idempotent Consumers:** Consumers store processed `eventId` values. Duplicate events are silently acknowledged without reprocessing.
3. **Replay Safety:** Event handlers are stateless and recalculate state idempotently upon replay.
4. **Dead-Letter Handling:** After 5 failed retry attempts with exponential backoff (1s, 2s, 4s, 8s, 16s), poisoned events are moved to the dead-letter queue (`dlq_events`) for operator inspection.
5. **Auditing:** In addition to transient queues, every status event is immutably appended to `BusinessStatusEvent` in PostgreSQL.
