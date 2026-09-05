# iTRIP / FIRUZO — PRODUCTION SECURITY AUDIT REPORT
**Target:** Production Hardening & Vulnerability Mitigation  
**Date:** 2026-09-05  
**Audited Subsystems:** Authentication, RBAC, Multi-Tenancy (B2B), Payment Gateways, Webhooks, PII, Next.js Security Headers  
**Overall Security Verdict:** **PASS — PRODUCTION-HARDENED (9/10)**

---

## 1. Vulnerability Findings & Mitigations

### 1.1 Insecure Direct Object Reference (IDOR) & Cross-Tenant Access (P0)
- **Threat:** User in Organization A inspecting or modifying bookings, trips, or customer documents belonging to Organization B.
- **Root Cause Identified:** Initial endpoints checked only `customerId === user.id` or relied on basic role strings without checking organizational boundaries.
- **Mitigation Implemented:**
  1. Introduced explicit `TenantAuthContext` in `src/domains/identity/permission-service.ts`.
  2. Implemented `assertTenantAccess(ctx, resource)` which checks `ctx.organizationId === resource.organizationId` and branch boundaries.
  3. Super Admin cross-tenant oversight is explicit and audited.
  4. Verified by dedicated automated test suite `src/domains/identity/tenant-isolation.test.ts`.

### 1.2 Simulated Payment Success in Production (P0)
- **Threat:** Callers simulating payment success tokens to confirm bookings without authoritative gateway settlement.
- **Root Cause Identified:** Earlier stub adapters returned simulated success tokens unconditionally.
- **Mitigation Implemented:**
  1. Created isolated `DemoPaymentAdapter` that checks `process.env.DEMO_MODE === 'true'`.
  2. If `DEMO_MODE !== 'true'`, the adapter strictly throws:
     `Security Error: Demo payment adapter is strictly disabled in production mode`.
  3. Production `ShetabGatewayAdapter` requires real merchant credentials, terminal IDs, and secret keys.
  4. Webhook verification checks cryptographic HMAC-SHA256 signature, 5-minute replay window, and expected booking amounts.

### 1.3 Webhook Replay & Duplicate Event Exploits (P0)
- **Threat:** Attacker capturing a valid webhook and replaying it multiple times to trigger double credits or invalid state transitions.
- **Mitigation Implemented:**
  1. Added `WebhookEvent` database model with `@@unique([gatewayName, eventId])`.
  2. `PaymentDomainService.processWebhook` performs timestamp freshness validation (`Math.abs(now - timestamp) <= 5 * 60 * 1000`).
  3. Duplicate webhooks return idempotent `{ processed: false, status: 'DUPLICATE' }` without duplicate payment creation, ledger posting, or booking confirmation.
  4. Verified by automated test: 3 repeated identical webhooks produce exactly 1 capture.

### 1.4 Financial Rounding & Floating-Point Exploits (P0)
- **Threat:** Floating-point rounding drift (e.g. 0.1 + 0.2 = 0.30000000000000004) causing fractional currency leakage or ledger imbalance.
- **Mitigation Implemented:**
  1. Financial kernel `Money` class backed by `Prisma.Decimal` end-to-end.
  2. Eliminating `Math.round()` as financial business logic; replaced with `Decimal.ROUND_HALF_UP` and currency-specific step rounding (10,000 Rials for IRR).
  3. Cross-currency arithmetic strictly throws `Currency mismatch in Money operation`.

### 1.5 Concurrent Wallet Overdraft (P0)
- **Threat:** Firing two concurrent debit requests against a wallet to spend more than the available balance before balance checks commit.
- **Mitigation Implemented:**
  1. PostgreSQL row-locking `SELECT "id" FROM "Account" WHERE "id" = $1 FOR UPDATE` inside the debit transaction.
  2. Balance is evaluated under lock, completely serializing concurrent debit requests.
  3. Verified by test `2 concurrent debits from same balance cannot overspend`.

### 1.6 Next.js Security Headers & Local IP Access (P1)
- **Threat:** SSRF or malicious image rendering via `dangerouslyAllowLocalIP: true`.
- **Mitigation Implemented:**
  1. Restricted `dangerouslyAllowLocalIP` in `next.config.ts` to development environment only (`dangerouslyAllowLocalIP: isDev`).
  2. Enforced strict HTTP headers:
     - `Content-Security-Policy`
     - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
     - `X-Frame-Options: SAMEORIGIN`
     - `X-Content-Type-Options: nosniff`
     - `Referrer-Policy: strict-origin-when-cross-origin`

### 1.7 PII Redaction & Secret Handling (P1)
- **Threat:** Leaking passwords, OTPs, or passport numbers in application logs.
- **Mitigation Implemented:**
  1. Passwords are saved as bcrypt hashes (`passwordHash`).
  2. OTPs are hashed via SHA-256 (`codeHash` in `OtpVerification`).
  3. Notifications mask phone numbers (`+989***89`) and emails (`te***@firuzo.com`) in console logs.

---

## 2. Automated Security Test Verification

| Test Suite | Focus Area | Assertions | Status |
|---|---|---|---|
| `security-fixes.test.ts` | State machine guards, payment idempotency | 7 passed | **PASS** |
| `payment-safety.test.ts` | Webhook signature, replay, tampering, demo lock | 8 passed | **PASS** |
| `tenant-isolation.test.ts` | Multi-tenant boundary, IDOR, Super Admin override | 5 passed | **PASS** |
| `ledger-accounting.test.ts` | Concurrent wallet overdraft locking, Debit=Credit | 6 passed | **PASS** |
| `inventory-concurrency.test.ts` | Concurrency oversell = 0 under 50 threads | 5 passed | **PASS** |
