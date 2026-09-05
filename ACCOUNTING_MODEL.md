# iTRIP / FIRUZO — DOUBLE-ENTRY ACCOUNTING & GENERAL LEDGER SPECIFICATION
**Domain:** Chart of Accounts, Journal Entries, Balanced Postings & Wallet Ledger  
**Version:** 3.0 (Production Hardened)  

---

## 1. Fundamental Accounting Invariants

1. **Double-Entry Balance Invariant:**
   $$\sum \text{DEBIT} \equiv \sum \text{CREDIT}$$
   Every financial transaction must contain at least two entries whose debits and credits balance to the exact cent/Rial. Unbalanced posting attempts throw `Accounting Invariant Violation`.
2. **Immutable Posting History:**
   Posted entries are immutable. No financial record may ever be updated or deleted in place. Corrections must use:
   $$\text{Original Entry} + \text{Reversal Entry} + \text{Corrective Entry}$$
3. **Deterministic Idempotency:**
   Posting operations are identified by unique group IDs (`groupId`). Duplicate requests with the same group ID return immediately without duplicating ledger entries.

---

## 2. Standard Chart of Accounts (FIN-001)

| Account Code | Account Name | Category | Normal Balance | Purpose |
|---|---|---|---|---|
| `1010` | Operating Cash & Bank | ASSET | DEBIT | Gateway settlements and operating funds |
| `1020` | Customer Wallet Liability | LIABILITY | CREDIT | Funds deposited by customers |
| `2010` | Platform Customer Escrow | LIABILITY | CREDIT | Funds held between payment and travel completion |
| `2020` | Supplier Accounts Payable | LIABILITY | CREDIT | Accrued net costs owed to airlines and hotels |
| `2030` | Tax & VAT Payable | LIABILITY | CREDIT | Value Added Tax collected for tax authorities |
| `4010` | Platform Service Revenue | REVENUE | CREDIT | Markups and booking fees earned |
| `5010` | Supplier Travel Expense | EXPENSE | DEBIT | Supplier costs incurred on confirmed bookings |

---

## 3. Standard Posting Templates

### 3.1 Customer Wallet Top-Up
- **DEBIT:** `1010 Operating Cash & Bank` (Inflow from PSP)
- **CREDIT:** `1020 Customer Wallet Liability` (Customer wallet balance)

### 3.2 Booking Payment via Wallet
- **DEBIT:** `1020 Customer Wallet Liability` (Customer funds spent)
- **CREDIT:** `2010 Platform Customer Escrow` (Held in escrow pending travel)

### 3.3 Booking Payment via Gateway (PSP)
- **DEBIT:** `1010 Operating Cash & Bank` (Gateway receivable)
- **CREDIT:** `2010 Platform Customer Escrow` (Held in escrow pending travel)

### 3.4 Revenue Realization & Settlement Accrual
Upon booking confirmation or departure:
- **Leg 1 (Escrow Release):**
  - **DEBIT:** `2010 Platform Customer Escrow` (Total Sell Price)
  - **CREDIT:** `4010 Platform Service Revenue` (Total Sell Price)
- **Leg 2 (Supplier Liability):**
  - **DEBIT:** `5010 Supplier Travel Expense` (Net Cost)
  - **CREDIT:** `2020 Supplier Accounts Payable` (Net Cost)
- **Leg 3 (Tax Accrual):**
  - **DEBIT:** `4010 Platform Service Revenue` (Tax Amount)
  - **CREDIT:** `2030 Tax & VAT Payable` (Tax Amount)

### 3.5 Refund Posting
- **DEBIT:** `2010 Platform Customer Escrow` (or Revenue Reversal)
- **CREDIT:** `1020 Customer Wallet Liability` (Net Refund to Customer)

---

## 4. Wallet Concurrency Protection (WAL-001)

To prevent simultaneous debit attempts from exceeding customer wallet balances, `GeneralLedgerService.postWalletPayment` locks the customer account row in PostgreSQL:
```sql
SELECT "id" FROM "Account" WHERE "id" = $1 FOR UPDATE;
```
Balance is verified under lock. Concurrent requests are serialized, completely preventing overdraft attacks.
Verified by automated test: 2 concurrent 4M IRR debits against a 6M IRR balance allow exactly 1 debit and reject the second.
