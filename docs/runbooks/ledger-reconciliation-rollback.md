# Runbook — Ledger Reconciliation & Rollback

Scope: `GeneralLedgerService`, `ReconciliationService`, Exception Center, release rollback.
Related: `docs/RELEASE_CHECKLIST.md` (§ Rollback), `docs/PRODUCTION_ARCHITECTURE.md`.

## The invariant

Every posting group must satisfy `SUM(DEBIT) === SUM(CREDIT)` per currency. Postings are created only
by `GeneralLedgerService` templates (wallet, gateway, revenue realization, FX, refund) and enforced
against unbalanced writes. Corrections are reversal + corrective entries — **never edit posted rows**.

## Health signals

- `GET /api/health/ready` → `checks.ledger`: `healthy` when balanced; `degraded` otherwise. The check
  is cached for 5 minutes (fresh at most once per TTL) — a just-fixed imbalance may still show for up
  to 5 minutes; wait out the TTL or restart to force freshness.
- A 30-min background sweep logs `[Reconciliation Health Check] Ledger is UNBALANCED!` with the
  mismatch list.

## Imbalance triage

1. Get the authoritative report (same engine the health check uses):
   - ERP: **Admin → Finance → Run Ledger Reconciliation** (`runLedgerReconciliation`).
2. Read `mismatches[]`: each row is one posting `groupId` with debit/credit/diff/currency.
3. Trace the group:
   ```sql
   SELECT le."groupId", a."ownerType", a."ownerId", le."direction", le.amount, le.currency,
          le."referenceType", le."referenceId", le."createdAt"
   FROM "LedgerEntry" le JOIN "Account" a ON a.id = le."accountId"
   WHERE le."groupId" = '<groupId>' ORDER BY le."createdAt";
   ```
4. Identify the source event via `referenceId` (booking/payment/refund id) and the template from
   `referenceType` (TOPUP / PAYMENT / REFUND / REVENUE / FX...).
5. Fix path: post a corrective entry through `GeneralLedgerService` (balanced) referencing the same
   source — never hand-insert one-sided rows. If the source event itself is wrong (e.g. duplicate
   capture), fix the event flow first; ledger correction follows.

## Booking-level reconciliation (3-way)

`ReconciliationService.reconcileBookingFinancials(bookingId)` compares booking total ↔ successful
payments ↔ issued invoices; mismatches file a `PAYMENT_MISMATCH` exception (deduped while open —
ERP-009). Review open items in **Admin → Exceptions**; each has owner/SLA/status.

## Common incident patterns

| Symptom | Likely cause | Response |
|---|---|---|
| Unbalanced group with `referenceType=REFUND` | Refund posted outside `RefundDomainService` | Post reversal via GLS; route the flow through the domain service |
| Duplicate `PAYMENT_CAPTURED` audit rows, one booking | Pre-PAY-010 double capture | Verify via `Payment` rows; refund the duplicate; ledger correction entry |
| Escrow balance negative after refunds | Refund without funded escrow | Fund escrow with a balanced TOPUP pair; re-run reconciliation |
| `FX_VARIANCE` / `SUPPLIER_STATEMENT_MISMATCH` exceptions | Settlement statement ≠ batch | `SettlementDomainService` flow; resolve via Exception Center with owner + SLA |

## Rollback

Follow `docs/RELEASE_CHECKLIST.md` §6: one-command redeploy of the previous artifact, DB snapshot
taken before migration, env changes reversible without redeploy, named owner + comms channel.

Ledger-specific rollback rule: **application rollback is safe; ledger data rollback is not.** Posted
entries are immutable — after any rollback, re-run reconciliation; if a code version posted entries
differently, reconcile with corrective entries rather than restoring ledger tables from snapshots
(restoring would also resurrect reversed entries and break the audit trail).
