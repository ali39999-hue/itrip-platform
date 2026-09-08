# OPS-101: Flight Supplier Certification Checklist & Production Acceptance Runbook

**Document Owner:** DevOps / Supplier Integration Engineering  
**Version:** 2.0.0  
**Target Architecture:** Canonical Supplier Adapter via `SupplierTransport` & `CryptoVault`

---

## 1. Overview & Objective

This runbook defines the mandatory verification gates required before any flight GDS/Aggregator (e.g. Parto, Nira, Amadeus, Travelport) can be activated in production traffic. A supplier must pass all 6 certification stages in a sandbox environment before credentials are encrypted and stored in `SupplierCredential`.

---

## 2. Certification Pre-Requisites

1. **Credentials & Secrets:**
   - Client ID, API Key, and Secret provisioned by the GDS partner.
   - Credentials stored in database encrypted via `CryptoVault.encryptSensitive()`. Plaintext secrets in code or `.env` are strictly prohibited.
2. **Network Egress Whitelisting:**
   - Production egress static IPs whitelisted on partner firewall.
   - Mutual TLS (mTLS) client certificates installed if required.
3. **Canonical Normalization:**
   - Adapter implements `IFlightSupplierAdapter` interface.
   - Raw response mapped to `CanonicalFlightOffer` and monetary values represented exclusively as `Money`.

---

## 3. The 6-Stage Certification Test Matrix

| Stage | Action | Test Case | Expected Outcome | Mandatory Pass |
|---|---|---|---|---|
| **S1** | **Search & Availability** | Query THR to MHD for dates D+7 to D+14 | HTTP 200, valid flights returned with valid fare basis and cabin class. | [ ] PASS |
| **S2** | **Offer Reprice / Quote** | Reprice selected outbound flight | Canonical quote matches within ±0.1% or returns explicit PRICE_CHANGE. | [ ] PASS |
| **S3** | **Soft Lock / Hold** | Create 15-minute inventory hold | External PNR / Hold token received; hold expires cleanly after 15m. | [ ] PASS |
| **S4** | **Ticketing / Issue** | Issue ticket against held PNR | E-ticket numbers (13-digit) received for all passengers; status = ISSUED. | [ ] PASS |
| **S5** | **Cancellation / Void** | Void ticket within legal void window | Ticket status transitioned to VOIDED; penalty verified against policy. | [ ] PASS |
| **S6** | **Refund & Settlement** | Submit refund calculation request | Net refund amount matches contract rules; refund transaction ref logged. | [ ] PASS |

---

## 4. Operational Invariants & SLA Guards

- **Timeout:** Maximum HTTP timeout set to `8000ms`. Calls taking longer than 8s must abort and fail closed.
- **Circuit Breaker:** 5 consecutive 5xx errors or timeouts within 60s transitions circuit breaker to `OPEN`.
- **Degradation Routing:** If primary flight GDS enters `DEGRADED` or `DOWN`, traffic automatically routes to secondary provider per `PredictiveSupplierRoutingService`.

---

## 5. Certification Sign-off

- **Certified by (Ops Lead):** ___________________ **Date:** _____________
- **Production Activation Approval:** ___________________ **Date:** _____________
