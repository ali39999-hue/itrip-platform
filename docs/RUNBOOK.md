# FIRUZO CHILD — OPERATIONAL RUNBOOK & INCIDENT PLAYBOOK

**Authority:** Section 14 of Master Roadmap  
**Status:** Canonical Operations Contract  

---

## 1. Incident Classification & Response Times

| Severity | Description | Response Time | Resolution Time | Escalation |
|:---|:---|:---|:---|:---|
| **Critical** | Payment gateway down, data breach, service outage | 15 minutes | 1 hour | CTO, Security Team |
| **High** | API error rate > 1%, booking failure rate > 5% | 30 minutes | 4 hours | Engineering Lead |
| **Medium** | Non-critical bug, performance degradation | 1 hour | 24 hours | On-Call Engineer |
| **Low** | UI glitch, minor UX issue | 4 hours | 1 week | Product Team |

---

## 2. Common Incidents & Procedures

### 2.1 Payment Gateway Failure
**Symptoms:** Payment callback failures, users unable to complete payment.
**Steps:**
1. Check Shetab gateway status page.
2. Verify HMAC signature configuration in `.env`.
3. Check `business_payments` table for failed transactions.
4. If gateway is down, notify users via SMS and email.
5. Rollback to last stable version if issue persists.
6. Post-incident: Root cause analysis within 24 hours.

### 2.2 Database Connection Lost
**Symptoms:** API returns 500 errors, logs show connection timeout.
**Steps:**
1. Check PostgreSQL connection pool status.
2. Verify database credentials in `.env`.
3. Restart application pods: `kubectl rollout restart deployment/firuzo-child`.
4. If database is down, failover to replica.
5. Post-incident: Review connection pool configuration.

### 2.3 Capacity Full Error
**Symptoms:** Users see "ظرفیت تاریخ حرکت انتخاب‌شده تکمیل است" error.
**Steps:**
1. Check `business_departures` table for `bookedCount` vs `capacity`.
2. Verify capacity hold logic in `BusinessDomainService.createDraftRequest`.
3. If capacity is incorrect, manually adjust `bookedCount`.
4. Post-incident: Review capacity calculation logic.

### 2.4 Voucher Verification Failure
**Symptoms:** Public verification endpoint returns 404 or invalid voucher.
**Steps:**
1. Check `business_vouchers` table for voucher code.
2. Verify HMAC signature in `qrPayload`.
3. Check if voucher is revoked (`revokedAt` is not null).
4. Post-incident: Review voucher issuance logic.

---

## 3. Monitoring & Alerting

### 3.1 Critical Alerts
- **Payment Failure Rate > 5%:** PagerDuty alert to on-call engineer.
- **API Error Rate > 1%:** PagerDuty alert to on-call engineer.
- **Database Connection Lost:** PagerDuty alert to infrastructure team.

### 3.2 High Alerts
- **Booking Success Rate < 90%:** Slack alert to engineering channel.
- **Search Latency p95 > 500ms:** Slack alert to engineering channel.
- **Dead-Letter Queue > 10 Events:** Slack alert to engineering channel.

### 3.3 Medium Alerts
- **User Satisfaction Score < 4.0:** Slack alert to product channel.
- **Mobile UX Violation:** Slack alert to design channel.

---

## 4. Support Procedures

### 4.1 User Support
- **Channel:** In-app support chat, email support@firuzo.com, phone +98-21-1234-5678.
- **SLA:** Critical issues: 1 hour response, 4 hours resolution. High issues: 4 hours response, 24 hours resolution.
- **Escalation:** If issue cannot be resolved within SLA, escalate to engineering lead.

### 4.2 Operator Support
- **Channel:** Slack channel `#firuzo-ops`.
- **SLA:** Critical issues: 15 minutes response, 1 hour resolution. High issues: 30 minutes response, 4 hours resolution.
- **Escalation:** If issue cannot be resolved within SLA, escalate to CTO.

---

## 5. Backup & Recovery

### 5.1 Database Backup
- **Frequency:** Daily full backup, hourly incremental backup.
- **Retention:** 30 days for full backups, 7 days for incremental backups.
- **Storage:** Encrypted S3 bucket with versioning enabled.
- **Recovery:** `pg_restore` from backup file.

### 5.2 Application Backup
- **Frequency:** Git tags for every release.
- **Retention:** Indefinite.
- **Recovery:** `git checkout <tag>` and redeploy.

---

## 6. Post-Incident Review

### 6.1 Root Cause Analysis
- **Timeline:** Within 24 hours of incident resolution.
- **Participants:** On-call engineer, engineering lead, product manager.
- **Output:** Incident report with root cause, impact, and remediation steps.

### 6.2 Remediation
- **Timeline:** Within 48 hours of incident resolution.
- **Actions:** Update security controls, improve monitoring, add tests.
- **Verification:** Deploy remediation to staging and verify with smoke tests.
