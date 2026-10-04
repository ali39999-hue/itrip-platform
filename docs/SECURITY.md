# FIRUZO CHILD — SECURITY BASELINE & COMPLIANCE CONTRACT

**Authority:** Section 21 of Child Master Roadmap  
**Status:** Canonical Security & Compliance Contract  

---

## 1. Security Principles & Threat Model

### 1.1 Core Security Postulates
1. **Zero Trust Model:** Never trust client-supplied values for price, eligibility, booking state, or payment confirmation. All critical state is server-authoritative.
2. **Defense in Depth:** Multiple layers of protection at input, application, and data layers.
3. **Least Privilege & RBAC:** Granular permissions enforced via policy functions rather than hard-coded role checks.

### 1.2 Threat Model Summary
- **Attacker Capabilities:** Malicious input, DoS, CSRF, XSS, SSRF, IDOR, credential stuffing, payment tampering.
- **Assets to Protect:** User financial data (passports, national IDs, payment records), Specialist company data, Tour inventory/allotments, Voucher codes.
- **Adversary Profile:** Nation-state, corporate espionage, insider, disgruntled employee, opportunistic script kiddies.

---

## 2. Security Controls & Implementation

### 2.1 Authentication & Authorization
- **Authentication:** JWT tokens issued by Firuzo Core Identity service with short-lived refresh tokens.
- **Authorization:** Policy-based functions (`can(user, "request.submit", request)`, `can(user, "document.upload", document)`).
- **Session Management:** HTTPS-only, HttpOnly cookies, CSRF tokens, rate limiting (100 requests/minute per IP).
- **Password Policy:** Minimum 12 characters, complexity rules, forced rotation every 90 days.

### 2.2 Input Validation & Output Encoding
- **Input:** Zod schemas for all API payloads; server-side validation before any business logic.
- **Output:** Server-side encoding for all HTML/JSON responses; no client-side interpolation.
- **SQL Injection:** All queries parameterized with Prisma; no raw SQL strings.
- **XSS Prevention:** Content Security Policy (CSP) header; auto-escaped DOM rendering.

### 2.3 Sensitive Data Protection
- **PII Minimization:** Only necessary fields stored in `BusinessCompany` and `BusinessTraveler` tables.
- **Encryption at Rest:** AES-256-GCM for passport and national ID fields in database.
- **Encryption in Transit:** TLS 1.3 with HSTS preload.
- **Audit Logging:** All authentication attempts, payment confirmations, document uploads, and status transitions logged with immutable append-only `BusinessStatusEvent` stream.

### 2.4 Payment & Financial Security
- **Idempotency Keys:** Unique `idempotencyKey` on every payment creation; database-level unique constraint prevents double billing.
- **HMAC Verification:** Shetab PSP callbacks validated with HMAC-SHA256 signatures.
- **Zero-Float Pricing:** All financial calculations performed as integer Rials; never exposed to client in floating point.
- **Refund Policy:** Only `admin` or `finance` role can process refunds; immutable audit trail.

### 2.5 Web Security Headers
- **CSP:** Strict Content Security Policy restricting inline scripts, styles, and forms.
- **HSTS:** Preload and max-age 31536000.
- **X-Frame-Options:** DENY.
- **X-Content-Type-Options:** NOSNIFF.
- **Referrer-Policy:** `strict-origin-when-cross-origin`.

### 2.6 API Security
- **Rate Limiting:** 100 requests/minute per authenticated user; 50 requests/minute per IP for unauthenticated endpoints.
- **Input Sanitization:** All query parameters and form data validated against schema before database operations.
- **WebSocket Security:** JWT tokens required for real-time status updates; no public WebSocket endpoints.

### 2.7 Testing & Compliance
- **Security Testing Pyramid:** Unit tests for validation, integration tests for authorization, E2E tests for payment flows, manual penetration testing quarterly.
- **Compliance:** GDPR/CCPA readiness for data subject rights; Iranian data protection law compliance for national ID handling.
- **Security Gate:** `npm run security:scan` run on every PR; CI fails if any critical vulnerability detected.

---

## 3. Emergency Response & Incident Playbook

1. **Incident Classification:** Critical (user data breach), High (service disruption), Medium (non-critical vulnerability).
2. **Response Time Targets:** Critical: 15 minutes, High: 30 minutes, Medium: 1 hour.
3. **Rollback Procedure:** Git rollback to last stable commit + database restore from backup.
4. **Post-Incident Review:** Root cause analysis within 24 hours; security controls updated within 48 hours.
5. **External Reporting:** Notify affected users within 72 hours for critical incidents; notify regulatory bodies (Cyber Police, Iranian Data Protection Authority) within 24 hours.

---

## 4. Security Metrics & Observability

- **Metric:** Critical Security Events per Week (target: 0).
- **Metric:** Payment Failure Rate due to Security Controls (target: < 0.1%).
- **Metric:** Open Security Vulnerabilities (target: 0 high/critical CVEs).
- **Monitoring:** Sentry error tracking, Grafana dashboards for authentication attempts and failed login attempts, PagerDuty alerts for payment webhook failures.
