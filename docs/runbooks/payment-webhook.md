# Runbook — Payment Webhook Operations

Scope: `POST /api/payments/webhook` → `PaymentDomainService.processWebhook` (+ `gateway-port.ts`).
Related: `docs/PRODUCTION_ENV_CONTRACT.md`, `docs/PRODUCTION_ARCHITECTURE.md`.

## Behaviour contract (what the code guarantees)

1. Signature: HMAC-SHA256 over the **exact raw body** with `SHETAB_SECRET_KEY`. **Fails closed** —
   missing secret, missing signature, or bad signature ⇒ 401.
2. Replay: event timestamps outside a 5-minute window ⇒ rejected.
3. Idempotency: unique `(gatewayName, eventId)` on `WebhookEvent` — replays return `DUPLICATE`.
4. Per-booking capture idempotency (PAY-010): a *valid* fresh eventId for an already-captured
   booking collapses to `DUPLICATE`; **no second Payment row is ever minted**.
5. Terminal-state guard: captures against `EXPIRED/CANCELLED/REFUNDED/FAILED` bookings are rejected.
6. Amount/currency tamper checks run BEFORE the duplicate collapse — tampered events are loudly
   rejected even for captured bookings.
7. Every accepted capture writes: `Payment` (SUCCESS), `Booking→CONFIRMED/CAPTURED`,
   `BookingStatusHistory`, `AuditLog(PAYMENT_CAPTURED)`.

## Failure triage

| HTTP | Reason (message) | Meaning | Action |
|---|---|---|---|
| 401 | `WEBHOOK_FAIL_CLOSED: Missing required cryptographic signature` | PSP hit the endpoint without a signature header (`x-signature`/`x-shaparak-signature`) | Check PSP integration sends the header; do NOT loosen verification |
| 401 | `Invalid webhook cryptographic signature` | Signature mismatch | Confirm both sides sign the **raw body bytes** with the same `SHETAB_SECRET_KEY`; check for proxy body rewrites |
| 401 | `...signature secret is not configured` | `SHETAB_SECRET_KEY` unset in the runtime | Fix env; see env contract. Until fixed, captures cannot be trusted |
| 401 | `...terminal state ... — capture rejected` | Late capture for an expired/cancelled/refunded booking | Money must flow back via PSP refund; do not force-accept |
| 401 | `Webhook timestamp outside 5-minute replay window` | Clock skew or replay | Check server/NTP and PSP timestamp; re-delivery from PSP is the correct retry |
| 400 | `amount tampering detected` / `currency mismatch` | Payload ≠ booking facts | Verify the booking's `totalAmount`/`currency`; investigate the discrepancy before re-delivery |
| 200 | `status: DUPLICATE` | Idempotent replay — correct behaviour | Nothing to do |

## Diagnostics

```sql
-- Latest webhook attempts and why they were rejected
SELECT "eventId", "eventType", status, "rejectionReason", "createdAt"
FROM "WebhookEvent"
ORDER BY "createdAt" DESC LIMIT 50;

-- All captures for a booking (must be exactly 1)
SELECT id, "idempotencyKey", status, amount, "gatewayRef" FROM "Payment" WHERE "bookingId" = '<id>';

-- Sensitive-action trail
SELECT * FROM "AuditLog" WHERE action = 'PAYMENT_CAPTURED' ORDER BY "createdAt" DESC LIMIT 20;
```

Health: `GET /api/health/ready` → `checks.paymentGateway` shows
`mode: PRODUCTION_CONFIGURED` / `MISSING_MERCHANT_ID` / `DEMO_SANDBOX`.

## Hard rules

- Never disable signature verification, widen the replay window, or accept captures for
  terminal-state bookings to "make a payment go through".
- Never set `DEMO_MODE=true` in production — the demo gateway is unreachable at runtime AND the
  production build refuses to compile with it (CI-012).
