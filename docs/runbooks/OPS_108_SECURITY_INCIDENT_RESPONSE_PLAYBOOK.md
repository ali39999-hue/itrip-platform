# OPS-108: Security Incident Response Playbook (IRP)

**Severity:** P0 / P1 / P2 — Security Operations & Threat Remediation  
**Standard:** NIST SP 800-61 Rev. 2 / OWASP ASVS 5.0  
**Target Subsystems:** Payment Gateways, NextAuth v5, Redis Rate Limiter, `crypto-vault.ts`, `ssrf-protection.ts`  

---

## 1. Incident Classification & Severity Levels

| Severity | Definition | Response Time (SLA) | Escalation Path |
| :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | Active financial ledger discrepancy, confirmed private key leak, unauthorized database exfiltration, payment gateway signature bypass | < 15 minutes | CTO, Lead Architect, Lead FinOps |
| **SEV-2 (High)** | Sustained DDoS on OTP/SMS endpoints, repeated webhook signature tampering attacks, SSRF attempt to internal metadata | < 1 hour | Security Engineer, On-Call Backend |
| **SEV-3 (Medium)** | Isolated credential stuffing, bot scraping of hotel prices, rate limiter threshold triggers | < 4 hours | Platform Engineer |

---

## 2. Playbook A: Secret or Credential Exposure Incident (SEV-1)

**Triggers:** Gitleaks alert, commit of `.env`, third-party disclosure of `AUTH_SECRET`, `ECARDO_SECRET_KEY`, `SHETAB_SECRET_KEY`, or `DATABASE_URL`.

### Immediate Containment Steps:
1. **Identify the compromised scope:** Check Git history or logs for the exposed commit SHA or leaked log payload.
2. **Issue Replacement Secret:** Generate cryptographically random 256-bit secret:
   ```bash
   openssl rand -hex 32
   ```
3. **Rotate in Secret Manager / Orchestrator:**
   - Update Kubernetes secret or Doppler / Vault entry:
     ```bash
     kubectl create secret generic firuzo-secrets --from-literal=AUTH_SECRET="<new-secret>" --dry-run=client -o yaml | kubectl apply -f -
     ```
4. **Trigger Rolling Deployment:** Force all existing pods to restart and load the new secret:
   ```bash
   kubectl rollout restart deployment/firuzo-app deployment/firuzo-worker
   ```
5. **Revoke Old Sessions & Access Tokens:**
   - Terminate active session records in database:
     ```sql
     DELETE FROM "Session";
     UPDATE "User" SET "updatedAt" = NOW();
     ```
6. **Provider Revocation:** If a PSP or cloud provider key was leaked, immediately invalidate it in the provider console (eCardo / Shaparak / AWS / Telegram BotFather).

---

## 3. Playbook B: Webhook Signature Tampering & Fraud Attempts (SEV-1 / SEV-2)

**Triggers:** `PaymentDomainService` logs `WEBHOOK_FAIL_CLOSED` or `Payment webhook amount tampering detected`.

### Immediate Containment Steps:
1. **Inspect Log Correlation:** Extract the `eventId` and `gatewayRef` from structured logs:
   ```bash
   kubectl logs -l app=firuzo-app --tail=500 | grep "WEBHOOK_FAIL_CLOSED"
   ```
2. **Verify Booking Status:** Confirm that the associated booking was **NOT** marked as `CONFIRMED`:
   ```sql
   SELECT id, reference, status, "paymentStatus", "totalAmount"
   FROM "Booking"
   WHERE id = '<targeted_booking_id>';
   ```
3. **Check WebhookEvent Audit Trail:**
   ```sql
   SELECT * FROM "WebhookEvent" WHERE "eventId" = '<suspicious_event_id>';
   ```
4. **IP Blacklisting:** If attack originates from an unauthorized IP claiming to be a gateway, block the IP in Cloudflare / WAF immediately.
5. **Report to PSP:** Contact the gateway security desk with the timestamp, origin IP, and payload for upstream inspection.

---

## 4. Playbook C: OTP & SMS Abuse / Brute-Force Wave (SEV-2)

**Triggers:** High frequency of `429 Too Many Requests` on `/api/auth/otp/request` or SMS gateway bill spike.

### Immediate Containment Steps:
1. **Enforce Global Strict Rate-Limiting:**
   - Verify that `RedisRateLimiter.checkRateLimit` is active.
   - Adjust threshold in Redis:
     ```bash
     redis-cli SET firuzo:config:otp_rate_limit_per_minute 1
     ```
2. **Enable Cloudflare Turnstile / Captcha Challenge:**
   - Switch authentication page protection to Interactive Challenge in Cloudflare WAF.
3. **Block Abusive Subnets:** Extract top hitting CIDRs from nginx / Ingress logs:
   ```bash
   kubectl logs -l app=ingress-nginx | grep "/api/auth" | awk '{print $1}' | sort | uniq -c | sort -nr | head -20
   ```
4. **Review Telco Delivery Costs:** Review SMS provider dashboard (Smswbs) and restrict non-Iranian or international dialing prefixes if not required.

---

## 5. Playbook D: SSRF Probing & Unsafe Fetch Mitigation (SEV-2)

**Triggers:** `safeFetch` logs `Security Error: Request to internal/private IP blocked`.

### Immediate Containment Steps:
1. **Locate Originating Request:** Identify the URL parameter or user input triggering the call (e.g. avatar upload URL or tour supplier webhook).
2. **Verify SSRF Neutralization:** Confirm that `validateUrlForSsrf` threw the error before DNS resolution or connection establishment.
3. **Review Target Endpoint:** If the user attempted to query `169.254.169.254` (cloud metadata) or `127.0.0.1`:
   - Flag user account:
     ```sql
     UPDATE "User" SET "isActive" = false WHERE id = '<caller_user_id>';
     ```
   - Record in Security Audit Log.

---

## 6. Playbook E: Financial Ledger Discrepancy & Reconciliation Break (SEV-1)

**Triggers:** `Gate 1: Double-Entry Invariant Check` variance > 0 or `ReconciliationDomainService` raises `CRITICAL` exception.

### Immediate Containment Steps:
1. **Activate Financial Kill-Switch (OPS-103):**
   - Suspend automated refunds and wallet withdrawals:
     ```bash
     kubectl set env deployment/firuzo-app KILL_SWITCH_WITHDRAWALS=true
     ```
2. **Run Differential Balance Inspection:**
   ```sql
   SELECT "accountId", SUM(CASE WHEN "direction" = 'DEBIT' THEN "amount" ELSE 0 END) -
                       SUM(CASE WHEN "direction" = 'CREDIT' THEN "amount" ELSE 0 END) AS net_balance
   FROM "LedgerEntry"
   GROUP BY "accountId"
   HAVING SUM(CASE WHEN "direction" = 'DEBIT' THEN "amount" ELSE 0 END) !=
          SUM(CASE WHEN "direction" = 'CREDIT' THEN "amount" ELSE 0 END);
   ```
3. **Isolate Corrupted Transaction:** Find the unbalancing `Transaction` record using `transactionId`.
4. **Post Compensating Adjustment Journal Entry:**
   - Execute an adjustment journal via `JournalService.createJournalEntry()` with reason `OPS_INCIDENT_RECONCILIATION_CORRECTION`.
   - Never directly run `UPDATE "LedgerEntry"` (preserves append-only audit trail).
5. **Deactivate Kill-Switch:** Once variance = 0.0000 and signed off by FinOps lead.

---

## 7. Post-Incident Review & RCA (Blameless Retrospective)

Within 48 hours of resolving any SEV-1 or SEV-2 incident:
1. Publish Root Cause Analysis (RCA) document in `docs/post-mortems/YYYY-MM-DD-incident-title.md`.
2. Add automated regression test to `security-hardening.test.ts` or `payment-safety.test.ts` ensuring the exploit vector cannot be reintroduced.
3. Verify that `npm run security:scan` and `npm run test:unit` remain 100% green.
