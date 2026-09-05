# iTRIP / FIRUZO — INVENTORY CONCURRENCY & ALLOCATION SPECIFICATION
**Domain:** Inventory Allotments, Concurrency Control, Atomic Holds & Sweepers  
**Version:** 3.0 (Production Hardened)  

---

## 1. Concurrency Invariant: `oversell = 0`

In travel reservation systems, inventory overselling results in immediate financial penalties, customer displacement, and carrier compliance sanctions. iTRIP strictly enforces the invariant:
$$\text{booked} + \text{active holds} \le \text{total capacity}$$
Under 100 concurrent requests for a single remaining flight seat or hotel room, exactly 1 hold request succeeds, and 99 requests fail with:
`Insufficient inventory available (Oversell prevented)`.

---

## 2. PostgreSQL Concurrency Control Patterns

### 2.1 Hold Creation: Explicit Row Locking (`FOR UPDATE`)
Rather than relying on naive `READ -> CALCULATE -> INSERT`, `InventoryEngine.createHold` executes:

```sql
SELECT "id", "total", "booked", "stopSell"
FROM "Allotment"
WHERE "inventoryItemId" = $1 AND "date" = $2
FOR UPDATE;
```

This locks the allotment row in PostgreSQL, preventing any competing transaction from reading a stale `booked` or `held` count until the current hold record is written.

### 2.2 Hold Capture: Atomic Conditional Update
When a customer completes payment, the hold is captured and the allotment is incremented using an atomic conditional update:

```sql
UPDATE "Allotment"
SET "booked" = "booked" + $1
WHERE "inventoryItemId" = $2
  AND "date" = $3
  AND ("booked" + $1) <= "total"
RETURNING "id", "booked", "total";
```

If `RETURNING` yields 0 rows, the update fails atomically, preventing oversell even under anomalous race conditions.

### 2.3 Hold Capture Idempotency (INV-002)
To handle retry storms from webhooks and browser callbacks, `captureHold` locks the hold row:
```sql
SELECT "id", "status" FROM "InventoryHold" WHERE "token" = $1 FOR UPDATE;
```
If the hold is already `CAPTURED`, it returns `{ success: true }` without incrementing the allotment's `booked` count a second time.

---

## 3. Hold Expiration Worker (INV-003)

Holds have an authoritative time-to-live (default 10-15 minutes). Inventory release is never dependent on customer browser events.

`HoldExpirationWorker.runSweep()` executes on a scheduled interval:
```typescript
const result = await prisma.inventoryHold.updateMany({
  where: {
    status: 'ACTIVE',
    expiresAt: { lte: new Date() },
  },
  data: {
    status: 'EXPIRED',
  },
});
```

- **Idempotency:** Safe against multiple simultaneous runs.
- **Crash Recovery:** If a node restarts mid-run, stale holds are cleanly swept on the next cycle.
- **Audit Logging:** Emits structured metrics (`sweptCount`, `activeRemaining`, `durationMs`).

---

## 4. Verification Evidence

Verified by `src/domains/inventory/inventory-concurrency.test.ts`:
- **Test:** 50 concurrent holds against `capacity = 1`.
  - Result: Exactly 1 success, 49 rejections. Final available = 0, oversell = 0.
- **Test:** 20 concurrent capture attempts on the same hold token.
  - Result: All return `success: true`. Final `Allotment.booked` = 1 (no duplicate increments).
- **Test:** Hold expiration worker with mixed past/future holds.
  - Result: Past hold transitioned to `EXPIRED`, future hold remained `ACTIVE`.
