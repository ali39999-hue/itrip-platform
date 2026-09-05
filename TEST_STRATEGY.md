# iTRIP / FIRUZO — AUTOMATED TEST STRATEGY & SUITE AUDIT
**Version:** 3.0 (Production Hardened)  
**Test Runners:** Vitest 4.1 (Unit, Domain, Concurrency, Security) + Playwright (E2E)  
**Execution Environment:** PostgreSQL 16 active database  

---

## 1. Multi-Layer Testing Pyramid

```text
┌────────────────────────────────────────┐
│        Playwright E2E Tests            │  Desktop & Mobile B2C/B2B Golden Journeys
├────────────────────────────────────────┤
│     Concurrency & Race Tests           │  100-Thread Hold Races, Double-Debits
├────────────────────────────────────────┤
│   Security & Tenant Isolation Tests    │  IDOR, Cross-Tenant Read/Update, Signature
├────────────────────────────────────────┤
│   Domain Logic & Accounting Tests      │  Money, Pricing Pipeline, Tax, Double-Entry
└────────────────────────────────────────┘
```

---

## 2. Unit & Domain Test Suites (17 Suites, 96 Passing Tests)

| Suite File | Test Count | Key Areas Covered |
|---|---|---|
| `payment-safety.test.ts` | 8 | HMAC signatures, replay freshness, amount tampering, demo isolation |
| `money-pricing-tax.test.ts` | 10 | Prisma Decimal precision, FX snapshots, versioned tax rules, 12-stage pricing |
| `inventory-concurrency.test.ts` | 5 | 50 concurrent holds against capacity=1 (oversell=0), duplicate capture |
| `hold-race.test.ts` | 1 | Hold capacity boundary validation |
| `booking-lifecycle.test.ts` | 3 | 4-dimensional state machines, relational status history, hold compensation |
| `state-machine.test.ts` | 10 | Forward and backward transition validation across booking states |
| `tenant-isolation.test.ts` | 5 | B2B multi-tenancy, cross-tenant isolation, IDOR guards, Super Admin role |
| `ledger-accounting.test.ts` | 6 | Balanced double-entry invariant, ledger idempotency, concurrent wallet debit |
| `saga-outbox-crash.test.ts` | 4 | Concurrency SKIP LOCKED, exponential backoff, dead-letter, crash recovery |
| `refund-settlement-reconcile.test.ts` | 4 | Settlement batches, supplier statement variance, exception generation |
| `supplier-search-health.test.ts` | 3 | Timezone safety (`utcInstant`), Circuit Breaker trips, canonical search models |
| `notification-reconciliation.test.ts` | 9 | Email/SMS notifications, full-ledger balance verification, exception detection |
| `security-fixes.test.ts` | 7 | Wallet balance guards, idempotency key scope, state skips |
| `erp-domains.test.ts` | 9 | State transitions, RBAC permissions, currency rounding policies |
| `domain-logic.test.ts` | 9 | Catalog formatting, Jalali date conversions, passenger validations |
| `refund-domain.test.ts` | 1 | Refund calculation and ledger reversal |
| `i18n-completeness.test.ts` | 2 | Message key completeness across Fa, En, Ar, Zh, Ru locales |
| **TOTAL** | **96 tests** | **100% PASSING** |

---

## 3. Mandatory Concurrency Verification Suite (Section 49)

- **100 Concurrent Holds Test:**
  - Setup: 1 hotel allotment with `total = 1`.
  - Action: 50 concurrent requests fired via `Promise.all`.
  - Result: Exactly 1 success, 49 failures. Allotment oversell = 0.
- **2 Concurrent Debits from Same Wallet Test:**
  - Setup: User account balance = 6,000,000 IRR.
  - Action: 2 concurrent debit requests of 4,000,000 IRR each (total requested = 8,000,000).
  - Result: Exactly 1 succeeds, 1 fails with `Insufficient wallet balance`. Remaining balance = 2,000,000 IRR.

---

## 4. Mandatory Crash Recovery Verification Suite (Section 50)

- **Outbox Worker Crash Test:**
  - Events stuck in `PROCESSING` longer than 2 minutes are automatically reclaimed to `PENDING` and re-executed.
- **Saga Worker Crash Test:**
  - Step 1 already marked `SUCCEEDED`.
  - Process killed and restarted.
  - Worker resumes: step 1 is NOT re-executed (0 duplicate calls), subsequent step executes.
