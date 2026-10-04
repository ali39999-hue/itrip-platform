# FIRUZO CHILD — OBSERVABILITY & OPERATIONS CONTRACT

**Authority:** Section 22 of Master Roadmap  
**Status:** Canonical Observability Contract  

---

## 1. Logging Standards

### 1.1 Structured Logging Format
All logs are emitted as JSON with the following schema:

```json
{
  "ts": "2026-10-02T18:00:00.000Z",
  "level": "info",
  "component": "BusinessDomainService",
  "message": "Business request submitted and locked",
  "fields": {
    "requestId": "cm401req",
    "code": "[REDACTED]",
    "idempotencyKey": "sub_api_1790963933028",
    "termsAccepted": true
  },
  "correlationId": "req-abc123",
  "actorId": "usr_123",
  "tenantId": "org_456"
}
```

### 1.2 Log Levels
- **error:** Unrecoverable failures (payment gateway down, database connection lost).
- **warn:** Recoverable issues (rate limit exceeded, validation failure).
- **info:** Business events (request created, payment captured, voucher issued).
- **debug:** Detailed execution traces (only in development).

### 1.3 PII Redaction
- **Rule:** All logs must redact PII (passport numbers, national IDs, phone numbers, email addresses).
- **Implementation:** `src/lib/observability/redacted-logger.ts` automatically redacts sensitive fields.
- **Fields Redacted:** `passportNo`, `nationalId`, `repPhone`, `email`, `fullNameLatin`.

---

## 2. Metrics & Dashboards

### 2.1 Business Metrics
- **Metric:** `business.request.created` — Counter of draft requests created.
- **Metric:** `business.request.submitted` — Counter of submitted requests.
- **Metric:** `business.payment.captured` — Counter of successful payments.
- **Metric:** `business.payment.failed` — Counter of failed payments.
- **Metric:** `business.voucher.issued` — Counter of vouchers issued.
- **Metric:** `business.checkout.conversion_rate` — Gauge of conversion rate (submitted / created).

### 2.2 Performance Metrics
- **Metric:** `api.latency` — Histogram of API response times (p50, p95, p99).
- **Metric:** `api.error_rate` — Gauge of error rate per endpoint.
- **Metric:** `db.query_duration` — Histogram of database query times.
- **Metric:** `payment.gateway_latency` — Histogram of PSP callback response times.

### 2.3 Critical Dashboards
1. **Booking Success Rate:** Percentage of requests that reach `issued` status.
2. **Payment Failure Rate:** Percentage of payment attempts that fail.
3. **Search Latency:** p95 latency for package listing queries.
4. **Checkout Conversion:** Percentage of users who complete payment after viewing tour.
5. **Qualification Completion:** Percentage of users who complete traveler roster.
6. **Event Lag:** Time between event emission and consumer processing.
7. **Queue Failures:** Count of dead-letter queue events.
8. **API Error Rate:** Percentage of API requests returning 5xx errors.
9. **Deployment Health:** Uptime and error rate post-deployment.

---

## 3. Distributed Tracing

### 3.1 Correlation ID Propagation
- **Header:** `X-Correlation-ID` propagated through all requests.
- **Implementation:** Middleware extracts or generates correlation ID and attaches to all logs and events.
- **Usage:** Enables tracing a request across Child domain, Firuzo Core, and external services.

### 3.2 Trace Spans
- **Span:** `business.request.create` — Duration of draft request creation.
- **Span:** `business.payment.callback` — Duration of PSP callback processing.
- **Span:** `firuzo.core.hold.create` — Duration of inventory hold creation.
- **Span:** `firuzo.core.ledger.post` — Duration of ledger revenue realization.

---

## 4. Alerting & SLOs

### 4.1 Service Level Objectives (SLOs)
- **Booking Success Rate:** > 95% of submitted requests reach `issued` status within 7 days.
- **Payment Success Rate:** > 98% of payment attempts succeed on first try.
- **API Availability:** > 99.9% uptime for business API endpoints.
- **Search Latency:** p95 < 200ms for package listing.
- **Payment Latency:** p95 < 500ms for payment intent creation.

### 4.2 Alert Rules
- **Critical:** Payment failure rate > 5% for 5 minutes → PagerDuty alert.
- **Critical:** API error rate > 1% for 5 minutes → PagerDuty alert.
- **High:** Booking success rate < 90% for 1 hour → Slack alert.
- **High:** Search latency p95 > 500ms for 10 minutes → Slack alert.
- **Medium:** Dead-letter queue > 10 events → Slack alert.

---

## 5. Error Tracking & Incident Response

### 5.1 Error Tracking
- **Tool:** Sentry for error aggregation and stack traces.
- **Integration:** All unhandled exceptions and API errors reported to Sentry.
- **Context:** Correlation ID, actor ID, tenant ID, request payload (redacted) attached to errors.

### 5.2 Incident Response
- **Runbook:** `docs/RUNBOOK.md` contains step-by-step procedures for common incidents.
- **Playbook:** `docs/RELEASE_PLAN.md` contains rollback and recovery procedures.
- **Communication:** Slack channel `#firuzo-incidents` for real-time updates.
- **Post-Mortem:** Root cause analysis within 24 hours of incident resolution.
