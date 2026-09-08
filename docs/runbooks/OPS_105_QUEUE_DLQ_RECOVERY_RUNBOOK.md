# OPS-105: Background Worker & Dead-Letter Queue (DLQ) Recovery Runbook

**Severity:** P1 Reliability Operation  
**Target Architecture:** `OutboxConsumer`, `WorkerLeaseService`, `QueueMetricsService`

---

## 1. Trigger Conditions

- `QueueMetricsService` reports DLQ count > 0.
- Oldest pending event age > 300 seconds (5 minutes).
- Worker lease expiration / heartbeat timeout.

---

## 2. Inspecting the Dead-Letter Queue

Execute SQL inspection to analyze the root cause of DLQ events:
```sql
SELECT "id", "eventType", "aggregateType", "aggregateId", "retryCount", "lastError", "createdAt"
FROM "OutboxEvent"
WHERE "status" = 'DEAD_LETTER'
ORDER BY "createdAt" DESC
LIMIT 50;
```

---

## 3. Remediating & Re-queuing Dead-Letter Events

Once the underlying issue (network partition, third-party timeout, or transient database lock) is resolved, requeue the dead-lettered events:

```sql
-- Requeue dead-letter events for retry
UPDATE "OutboxEvent"
SET "status" = 'PENDING',
    "retryCount" = 0,
    "availableAt" = NOW(),
    "lastError" = NULL
WHERE "status" = 'DEAD_LETTER'
  AND "createdAt" >= NOW() - INTERVAL '24 hours';
```

---

## 4. Recovering Orphaned or Crashed Worker Leases

If a worker node terminated ungracefully:
```sql
-- Identify expired worker leases
SELECT "workerId", "role", "acquiredAt", "expiresAt"
FROM "WorkerLease"
WHERE "expiresAt" < NOW();

-- Clear stuck leases to allow healthy instances to claim tasks
DELETE FROM "WorkerLease"
WHERE "expiresAt" < NOW();
```
