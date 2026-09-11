# OPS-107: PostgreSQL Point-In-Time Recovery (PITR) & Disaster Recovery Runbook

**Severity:** P0 — Critical Infrastructure & Database Recovery  
**Target Architecture:** PostgreSQL 16, WAL Archiving (wal-g / pgBackRest), S3/MinIO Cold Storage, `GeneralLedgerService`  
**SLA Targets:**  
- **RTO (Recovery Time Objective):** < 15 minutes to restored operational state  
- **RPO (Recovery Point Objective):** < 60 seconds of financial transaction loss (zero ledger loss)  

---

## 1. Objective & Scope

This runbook defines the authoritative operational procedure to recover the Firuzo / iTrip production database in the event of catastrophic data corruption, hardware failure, accidental drops, or ransomware events. It covers restoring to a consistent state using continuous Write-Ahead Log (WAL) archiving and daily base backups.

---

## 2. Pre-Incident Infrastructure Architecture

1. **Continuous WAL Archiving:**
   - PostgreSQL `archive_mode = on`
   - `archive_command = 'wal-g wal-push %p'` (shipping to private S3 bucket `s3://firuzo-db-backups/wal/`)
   - `archive_timeout = 60` (ensures RPO < 60 seconds even during low traffic)
2. **Daily Base Backups:**
   - Scheduled every night at 02:00 UTC via cron:
     ```bash
     wal-g backup-push /var/lib/postgresql/data
     ```
3. **Immutability & Retention:**
   - Backups are retained for 30 days with S3 Object Lock (Compliance Mode) to prevent unauthorized deletion.

---

## 3. Emergency Restoration Procedure (Step-by-Step)

### Phase 1: Isolation & Maintenance Gate
1. Put the public ingress into Maintenance Mode immediately:
   ```bash
   kubectl set env deployment/firuzo-app MAINTENANCE_MODE=true
   kubectl scale deployment/firuzo-worker --replicas=0
   ```
2. Verify that no active mutations or webhook processing are in flight.

### Phase 2: Identify Target Recovery Target Time
Determine the exact UTC timestamp `YYYY-MM-DD HH:MM:SS.MS+00` immediately prior to the corrupting event (e.g. from audit logs or Sentry alert).
Example: `'2026-09-11 14:15:30 UTC'`

### Phase 3: Provision Target Database Pod / Container
1. Stop PostgreSQL service on target host:
   ```bash
   systemctl stop postgresql
   # Or in K8s:
   kubectl scale statefulset/postgres --replicas=0
   ```
2. Clean existing corrupted data directory (archive old directory to `/var/lib/postgresql/corrupted_backup`):
   ```bash
   mv /var/lib/postgresql/data /var/lib/postgresql/data_corrupted_$(date +%s)
   mkdir -p /var/lib/postgresql/data
   chown -R postgres:postgres /var/lib/postgresql/data
   chmod 700 /var/lib/postgresql/data
   ```

### Phase 4: Fetch Base Backup & Replay WAL Logs
1. Restore the latest base backup preceding the target time:
   ```bash
   su - postgres -c "wal-g backup-fetch /var/lib/postgresql/data LATEST"
   ```
2. Configure `recovery.signal` and target parameters in `postgresql.conf` (or `postgresql.auto.conf`):
   ```ini
   restore_command = 'wal-g wal-fetch %f %p'
   recovery_target_time = '2026-09-11 14:15:30 UTC'
   recovery_target_action = 'promote'
   ```
   Create signal file:
   ```bash
   su - postgres -c "touch /var/lib/postgresql/data/recovery.signal"
   ```
3. Start PostgreSQL and monitor WAL replay logs:
   ```bash
   systemctl start postgresql
   # Follow recovery log
   tail -f /var/log/postgresql/postgresql-16-main.log
   ```
   *Look for message: `recovery stopping at restore point or target time; database system was not properly shut down; redo starts ... consistent recovery state reached ... archive recovery complete; database system is ready to accept read-write connections`.*

---

## 4. Post-Restoration Verification & Ledger Sanity Gates

Before re-enabling web and worker traffic, execute mandatory sanity gates:

### Gate 1: Double-Entry Balance Invariant Check
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
*Acceptance:* `variance` must equal exactly `0.0000`.

### Gate 2: Integrity of Active Holds and Bookings
```sql
SELECT COUNT(*) FROM "Booking" WHERE "status" = 'PENDING_PAYMENT' AND "holdToken" IS NOT NULL;
```
*Acceptance:* Must return positive non-corrupted row counts without database read errors.

### Gate 3: Webhook Event Deduplication Audit
```sql
SELECT "gatewayName", "eventId", COUNT(*)
FROM "WebhookEvent"
GROUP BY "gatewayName", "eventId"
HAVING COUNT(*) > 1;
```
*Acceptance:* Must return 0 rows (unique constraint preserved).

---

## 5. Traffic Restoration & Worker Resumption

1. Scale workers back up:
   ```bash
   kubectl scale deployment/firuzo-worker --replicas=2
   ```
2. Disable maintenance mode on web app:
   ```bash
   kubectl set env deployment/firuzo-app MAINTENANCE_MODE=false
   ```
3. Perform end-to-end smoke test on staging/production:
   ```bash
   node scripts/deployment-smoke-check.mjs
   ```

---

## 6. Sign-off & Audit Log

- **Lead DevOps Engineer:** ___________________ **Timestamp:** _____________
- **Principal Software Architect:** ___________________ **Timestamp:** _____________
