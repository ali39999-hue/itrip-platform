# OPS-104: Supplier Outage & Dynamic Failover Runbook

**Severity:** P1 Operational Disruption  
**Target Architecture:** `SupplierTransport`, `CircuitBreaker`, `PredictiveSupplierRoutingService`

---

## 1. Trigger Conditions

- Primary flight GDS or hotel BedBank error rate > 20% over a 3-minute window.
- p95 Latency > 4,000ms.
- Consecutive timeout count >= 5.

---

## 2. Automated Circuit Breaker & Routing Behavior

1. `SupplierTransport` records failing HTTP calls and increments error counter.
2. `CircuitBreaker` automatically flips status from `CLOSED` to `OPEN`.
3. `PredictiveSupplierRoutingService` re-evaluates candidates and immediately reroutes traffic to the secondary fallback supplier (e.g. switching from primary GDS to secondary aggregator).
4. An `OperationalException` of type `SUPPLIER_TIMEOUT` is created in Exception Center with SLA countdown (SLA target: 60 minutes).

---

## 3. Manual Operator Overrides

To manually disable an erratic supplier:
```sql
UPDATE "Supplier"
SET "isActive" = false
WHERE "id" = 'supplier_id_here';
```

To view current supplier health:
```sql
SELECT s."name", h."successRate", h."latencyP95", h."errorRate", h."updatedAt"
FROM "SupplierHealth" h
JOIN "Supplier" s ON s."id" = h."supplierId"
ORDER BY h."successRate" ASC;
```

---

## 4. Recovery & Verification Checklist

1. Verify upstream supplier status page or confirm with provider technical account manager.
2. Send test probe query through staging environment.
3. Re-enable supplier in production:
   ```sql
   UPDATE "Supplier" SET "isActive" = true WHERE "id" = 'supplier_id_here';
   ```
4. Confirm `CircuitBreaker` transitions through `HALF_OPEN` and settles back into `CLOSED`.
