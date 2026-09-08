# OPS-106: Financial Reconciliation Period-Close Runbook

**Severity:** Financial Accounting Operation  
**Target Architecture:** `GeneralLedgerService`, `JournalService`, `SettlementBatchService`, `ReconciliationDomainService`

---

## 1. Objective & Scope

This runbook specifies the operational closing procedure for daily and monthly accounting periods to ensure zero ledger variance, audited supplier payables, verified customer refunds, and balanced settlement batches.

---

## 2. Pre-Close Verification Gates

### Gate 1: Double-Entry Invariant Check
Execute ledger verification query:
```sql
SELECT
  SUM(CASE WHEN "direction" = 'DEBIT' THEN "amount" ELSE 0 END) AS total_debit,
  SUM(CASE WHEN "direction" = 'CREDIT' THEN "amount" ELSE 0 END) AS total_credit,
  ABS(
    SUM(CASE WHEN "direction" = 'DEBIT' THEN "amount" ELSE 0 END) -
    SUM(CASE WHEN "direction" = 'CREDIT' THEN "amount" ELSE 0 END)
  ) AS variance
FROM "LedgerEntry";
```
*Acceptance:* `variance` must equal exactly `0.0000`. Any non-zero value is a blocking incident.

### Gate 2: Booking-to-Payment Reconciliation
Verify that all bookings with status `CONFIRMED` have a captured payment:
```sql
SELECT b."id", b."reference", b."totalAmount", b."paymentStatus"
FROM "Booking" b
LEFT JOIN "Payment" p ON p."bookingId" = b."id" AND p."status" = 'SUCCESS'
WHERE b."status" = 'CONFIRMED'
  AND p."id" IS NULL;
```
*Acceptance:* Must return 0 rows.

### Gate 3: Supplier Settlement Batch Reconciliations
1. Ingest supplier statement using `SupplierStatementService.ingestStatement()`.
2. Generate settlement lines comparing booking net cost vs supplier invoiced amount.
3. If variance <= 0.5%, approve settlement batch.
4. If variance > 0.5%, escalate to Exception Center for supplier contract dispute.

---

## 3. Period-Close Execution

1. Post periodic revenue and tax liability closing entries using `JournalService.createJournalEntry()`.
2. Generate financial report snapshot via `FinancialAnalyticsService.getFinancialMetrics()`.
3. Sign and archive the immutable period report.

---

## 4. Sign-off & Audit Seal

- **Financial Controller:** ___________________ **Date:** _____________
- **Chief Financial Officer:** ___________________ **Date:** _____________
