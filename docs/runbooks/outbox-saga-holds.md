# Runbook — Outbox, Sagas, Holds & Booking Lifecycle

Scope: outbox worker (`OutboxConsumer`), saga worker (`SagaWorker`), hold sweeper
(`HoldExpirationWorker` + `BookingDomainService.expireStaleBookings`), all started by
`src/instrumentation.ts` inside the web process.

## Worker schedule

| Interval | Worker | Work |
|---|---|---|
| 10s | OutboxConsumer | claim (`FOR UPDATE SKIP LOCKED`) → deliver → retry with exponential backoff (10s→…, cap 600s) → DEAD_LETTER after 5 failures |
| 15s | SagaWorker | resume `RUNNING` sagas; leases older than 5 min are considered crashed and reset |
| 60s | Hold sweeper | `ACTIVE` holds past `expiresAt` → `EXPIRED`; abandoned `HELD/PENDING_PAYMENT` bookings older than 30 min with no successful payment → `EXPIRED` (history row by `LIFECYCLE_SWEEPER`) |
| 30min | Ledger reconciliation | balance sweep, logs unbalanced groups |

⚠️ Workers run **inside the web process**. Multi-replica is safe (SKIP LOCKED + leases), but if no
web process is running, nothing drains — provision a dedicated worker or external scheduler (W6 gap).

## Outbox triage

Health signal: `GET /api/health/ready` → `checks.outbox`
- `dead_letter ≤ 5` → healthy · `> 5` → degraded · `> 20` → unhealthy (503).

```sql
-- What is stuck and why
SELECT id, "eventType", status, "retryCount", "lastError", "availableAt", "workerId"
FROM "OutboxEvent"
WHERE status IN ('PENDING','PROCESSING','DEAD_LETTER')
ORDER BY "availableAt" ASC LIMIT 50;
```

| Symptom | Meaning | Procedure |
|---|---|---|
| `PENDING` growing, none processed | Worker not running or DB contention | Check the web process started (`instrumentation.register` logs); verify DB health |
| `PROCESSING` older than 2 min | Worker crashed mid-event | Auto-recovered on next cycle (stale-lease reset). If persistent, check app logs for claim errors |
| `DEAD_LETTER` | 5 failed attempts, `lastError` has the cause | Fix the root cause (e.g. SMS provider keys — OTP events fail-closed), then requeue: |
| OTP events stuck with delivery errors | SMS/email provider not configured or rejected | `checks` in health/ready show provider status; fix keys; requeue |

Requeue (after the root cause is fixed — never blind-requeue):

```sql
UPDATE "OutboxEvent"
SET status='PENDING', "retryCount"=0, "availableAt"=NOW(), "lockedAt"=NULL, "workerId"=NULL
WHERE id IN ('<id1>','<id2>');
```

Event types: `AUTH_OTP_REQUESTED` (sealed code — see below), `BOOKING_CONFIRMED/PAID` (PNR stamping),
`BOOKING_REFUNDED`/`REFUND_REQUESTED` (customer notice).

**OTP note:** the payload carries the code AES-256-GCM sealed (`codeEnc`); the consumer unseals it at
delivery. If you see *"could not decrypt one-time code"*, the `ENCRYPTION_KEY`/`AUTH_SECRET` was
rotated — affected events cannot be unsealed; let them dead-letter and re-issue OTPs to users.

## Saga triage

```sql
SELECT id, "sagaType", status, "currentStep", "correlationId", "contextJson"
FROM "SagaExecution" WHERE status IN ('RUNNING','FAILED') ORDER BY "startedAt" DESC;
SELECT * FROM "SagaStep" WHERE "sagaExecutionId" = '<id>' ORDER BY "stepOrder";
```

- `RUNNING` with old `updatedAt`: the worker resets leases > 5 min and re-runs steps; steps are
  idempotent (compensations run in reverse order on failure).
- `FAILED`: inspect the failing `SagaStep`, fix the cause, then reset the execution to `RUNNING` for
  resume — or re-trigger the operation with a **new idempotency key**.

## Booking/hold lifecycle

- Holds expire after TTL (default 10–15 min); capacity returns via the sweeper.
- Abandoned bookings expire after 30 min — and PAY-010 means **late captures for expired bookings
  are rejected**; the money path back is a PSP-side refund, never a forced confirm.
- If a customer paid but the booking expired mid-flow (rare, <30 min edge): verify `WebhookEvent`
  (REJECTED + reason) and `Payment` rows, refund via the PSP, and re-book.
