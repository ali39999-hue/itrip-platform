# iTRIP / FIRUZO — PAYMENT FLOW SPECIFICATION
**Domain:** Payment Lifecycle, Gateways, Webhooks & Ledger Integration  
**Version:** 3.0 (Production Hardened)  

---

## 1. Canonical Payment Lifecycle

```text
  Customer Checkout
          │
          ▼
┌──────────────────┐
│  PaymentIntent   │ ──► Generates authoritative intent with idempotencyKey & TTL (15m)
└─────────┬────────┘
          │
          ▼
┌──────────────────┐
│  PaymentAttempt  │ ──► Resolves GatewayPort (Shetab, Wallet, Demo) & generates gatewayRef
└─────────┬────────┘
          │
          ▼
┌──────────────────┐
│GatewayTransaction│ ──► Records outbound SALE transaction attempt & audit payload
└─────────┬────────┘
          │
          ▼
   Customer Browser
   (PSP Payment Form)
          │
          ▼
┌──────────────────┐
│   WebhookEvent   │ ──► Inbound Webhook: validates timestamp freshness (<5m)
└─────────┬────────┘     Checks @@unique([gatewayName, eventId]) for replay
          │
          ▼
┌──────────────────┐
│ Cryptographic    │ ──► HMAC-SHA256 signature verification & merchant ID check
│  Verification    │
└─────────┬────────┘
          │
          ▼
┌──────────────────┐
│ Financial Audit  │ ──► Verifies Settled Amount === Expected Amount (Decimal check)
│   Validation     │     Verifies Settled Currency === Booking Currency
└─────────┬────────┘
          │
          ▼
┌──────────────────┐
│  Atomic Capture  │ ──► Updates PaymentIntent -> CAPTURED
└─────────┬────────┘     Creates Payment row with idempotencyKey
          │              Updates Booking -> CONFIRMED, paymentStatus -> CAPTURED
          ▼
┌──────────────────┐
│  Ledger Posting  │ ──► DEBIT Gateway Settlement -> CREDIT Platform Escrow
└─────────┬────────┘     SUM(DEBIT) === SUM(CREDIT)
          │
          ▼
┌──────────────────┐
│ Outbox & Voucher │ ──► Emits BOOKING_CONFIRMED OutboxEvent
└──────────────────┘     Generates GDS PNR & sends SMS/Email voucher notification
```

---

## 2. Webhook & Callback Verification Architecture

### 2.1 Cryptographic HMAC Signature
```typescript
const computed = crypto
  .createHmac('sha256', this.secretKey)
  .update(rawBody)
  .digest('hex');

if (!crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature))) {
  throw new Error('Invalid cryptographic signature');
}
```

### 2.2 Replay Freshness Window (PAY-006)
- Webhook timestamp must be within 5 minutes of server time:
  `Math.abs(Date.now() - timestamp) <= 300_000 ms`
- Protects against delayed or replayed network payloads.

### 2.3 Idempotency Enforcement (PAY-007)
- Webhooks are keyed by `@@unique([gatewayName, eventId])`.
- If an event has already been marked `PROCESSED`:
  - Returns `{ processed: false, status: 'DUPLICATE' }`.
  - Exactly one capture record, one ledger debit/credit pair, and one booking confirmation side-effect occur.

---

## 3. Demo vs Production Isolation (PAY-001)

| Feature | Demo Adapter (`DEMO_GATEWAY`) | Production Adapter (`SHETAB_GATEWAY`) |
|---|---|---|
| Enabled Condition | `process.env.DEMO_MODE === 'true'` | `process.env.DEMO_MODE !== 'true'` |
| Verification | Mock instant verification | Cryptographic HMAC-SHA256 + Shaparak token |
| Production Behavior | **FAILS CLOSED** (Throws Security Error) | Connects to authenticated banking endpoints |
| Replay Protection | Checked | Checked (5-minute timestamp window) |
