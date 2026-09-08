# OPS-102: PSP Gateway Certification Checklist & Security Acceptance Runbook

**Document Owner:** Payments Engineering & Finance Ops  
**Version:** 2.0.0  
**Target Architecture:** `ShetabPspAdapter` & `PaymentDomainService`

---

## 1. Overview & Objective

This runbook outlines the formal certification protocol required to activate any Payment Service Provider (PSP) gateway (e.g. Saman/SEP, Pasargad/PEP, Asan Pardakht, Mellat/Behpardakht) on the Shetab / Shaparak network.

---

## 2. Mandatory Verification Protocol

### Stage 1: Configuration & Fail-Closed Integrity
- [ ] `validateLivePspConfiguration()` executes at service startup.
- [ ] If `NODE_ENV === 'production'` and live merchant secrets are missing, server **must fail closed** and refuse initialization.
- [ ] Merchant ID, Terminal ID, and Secret Keys are encrypted in database or loaded from secret manager.

### Stage 2: Webhook HMAC Signature Verification
- [ ] Valid HMAC-SHA256 signature returns HTTP 200 with `{ status: 'PROCESSED' }`.
- [ ] Missing, expired, or tampered signature returns HTTP 401 with `{ error: 'INVALID_SIGNATURE' }` (Strictly Fail-Closed).
- [ ] Replay protection enforces timestamp window <= 300 seconds (5 minutes).

### Stage 3: Triple Idempotency Delivery Test (PAY-106)
- [ ] Send identical webhook payload 3 times consecutively.
- [ ] Invariant: Exactly **one** Payment record is created/captured.
- [ ] Invariant: Exactly **one** double-entry group posted to General Ledger.
- [ ] Invariant: Subsequent 2 requests return `{ status: 'DUPLICATE' }` with identical payload.

### Stage 4: Inconclusive & Timeout Gateway Reconciliations (PAY-105)
- [ ] Gateway response timeout or network drop does **not** assume success.
- [ ] Attempt status transitioned to `PENDING_CUSTOMER`.
- [ ] High-severity exception `PAYMENT_TIMEOUT` raised in `OperationalException` table for manual or worker verification.

### Stage 5: Refund & Reverse Protocol (PAY-109)
- [ ] Pre-settlement reverse (`reversePayment`) voids transaction before 23:59 batch cut-off.
- [ ] Customer refund adapter verifies Iranian Sheba (IRxxxxxxxxxxxxxxxxxxxxxxxx) format using ISO 7064 Mod 97-10 checksum before initiating Paya/Satna transfer.

---

## 3. Certification Sign-off

- **Payments Lead:** ___________________ **Date:** _____________
- **Chief Risk Officer / Finance Lead:** ___________________ **Date:** _____________
