# OPS-103: Payment Gateway Emergency Kill-Switch & Rollback Runbook

**Severity:** P0 Emergency Operation  
**Target Architecture:** `PaymentDomainService`, `ShetabPspAdapter`, `AlertingService`

---

## 1. When to Trigger Payment Kill-Switch

Trigger this procedure immediately upon detecting any of the following critical conditions:
1. **Critical Alert:** `RULE_HIGH_PAYMENT_FAILURE` triggered (> 15% failure rate in 5 minutes).
2. **Fraud / Anomalous Volume:** Sudden surge of duplicate unauthorized debit attempts.
3. **Gateway Settlement Freeze:** Shaparak or PSP upstream issuing emergency maintenance notice.
4. **General Ledger Discrepancy:** Debit != Credit variance detected on payment capture postings.

---

## 2. Emergency Action: Activating Gateway Kill-Switch

### Step 1: Drain & Disable Gateway Inbound Ingress
Set the gateway operational flag in Redis / environment:
```bash
# Set emergency stop in Redis
redis-cli SET "GATEWAY_KILL_SWITCH:SHETAB_SAMAN" "ACTIVE" EX 86400
redis-cli SET "GLOBAL_PAYMENT_KILL_SWITCH" "ACTIVE" EX 86400
```

### Step 2: Immediate Invariant Verification
1. All in-flight checkout sessions attempting payment must receive a polite localized message:
   - *فارسی:* «درگاه پرداخت در حال به‌روزرسانی زیرساخت است. لطفا دقایقی دیگر تلاش کنید یا از موجودی کیف‌پول استفاده نمایید.»
2. No booking records may be marked `FAILED` without releasing underlying inventory holds via `InventoryEngine.releaseHold()`.
3. In-flight payment attempts must remain in `PENDING_CUSTOMER` until confirmed by bank reconciliation.

---

## 3. Post-Incident Reconciliation & Safe Resumption

1. Run automated reconciliation report:
   ```bash
   npx tsx scripts/payment-reconciliation-run.ts
   ```
2. Verify all unmatched payment intents via `PaymentReconciliationReportService`.
3. Inspect `OperationalException` queue for `PAYMENT_MISMATCH` tickets.
4. Disable kill-switch once bank confirms gateway stabilization:
   ```bash
   redis-cli DEL "GATEWAY_KILL_SWITCH:SHETAB_SAMAN"
   redis-cli DEL "GLOBAL_PAYMENT_KILL_SWITCH"
   ```
