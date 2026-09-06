# iTrip / Firuzo Platform — Agent Operating Guidelines

This document outlines the architectural rules, coding standards, and operational guidelines for autonomous AI agents working in the `itrip-platform` repository.

---

## 1. Core Architecture & Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript (Strict Mode)
- **Styling:** Tailwind CSS v4 + Semantic Design Tokens (`text-ink`, `text-sub`, `bg-surface`, `bg-brand`, `bg-action`, etc.)
- **Database:** Prisma ORM with **PostgreSQL 16 canonical** (see `docs/PRODUCTION_ENV_CONTRACT.md` — no SQLite in any environment)
- **Authentication:** NextAuth v5 (Beta) with multi-channel credentials and SHA-256 HMAC OTP
- **Internationalization:** `next-intl` with 5 supported locales: `fa` (default), `en`, `ar`, `zh`, `ru`
- **State Management:** Zustand with client-side persistence and strict PII exclusion

---

## 2. Mandatory Rules for Agents

### 1. Security & Authentication
- **NEVER** introduce static bypasses or hardcoded passwords (`1234`, `Admin@...`) anywhere in the codebase.
- `DEMO_MODE` must ALWAYS be guarded by `process.env.NODE_ENV !== 'production'`.
- All OTP operations must store and verify hashes (`HMAC-SHA256`) — never plaintext codes in the database or outbox events.
- Never leak internal error messages or passwords in API/Server Action responses.

### 2. Double-Entry General Ledger
- Every financial movement (top-up, payment, refund, FX conversion) MUST balance: `SUM(DEBIT) === SUM(CREDIT)`.
- All dual-entry operations that do not receive an existing transaction client (`tx`) MUST execute inside `prisma.$transaction`.
- Revenue realization in the Saga Orchestrator must aggregate costs and taxes across **ALL** booking items (`booking.items`), never just the first item.
- Reconciliation queries must use database-level aggregation (`prisma.ledgerEntry.groupBy`) to prevent Out-Of-Memory hazards.

### 3. Internationalization (i18n)
- **Zero hardcoded text in UI components:** All user-facing strings must use `useTranslations()` or `getTranslations()`.
- Every key must exist in all 5 locale files: `messages/{fa,en,ar,zh,ru}.json`.
- Run `node scripts/i18n-audit.js` before submitting changes: missing and extra keys must be **0**.
- Respect RTL/LTR: Use logical CSS properties (`start`, `end`, `ms-`, `me-`, `ltr:`, `rtl:`) instead of hardcoded `left`/`right`.

### 4. Code Quality & Verification Gates
Before completing any task, verify that all three automated gates pass:
1. `npm run typecheck` (`tsc --noEmit`) → **0 errors**
2. `npm run lint` (`eslint src/`) → **0 errors** (legacy admin pages carry accepted prisma-import *warnings* pending the BASE-006 ratchet)
3. `npm run test:unit` (`vitest run`) → **100% tests passing**

### 5. Domain & Money Invariants (2026-09-06 hardening — never bypass)
- **Inventory:** ALL `Allotment`/`InventoryHold` mutations go through `InventoryEngine`
  (`createHold`/`captureHold`/`releaseHold`/`setAllotmentPolicy`/`compensateCapturedHold`).
  Direct `allotment.update` / `inventoryHold.updateMany` in actions or pages is a regression.
- **Booking:** status changes only via `BookingStateMachine` transitions (walk the full legal chain —
  no jumps). Refunds go through `RefundDomainService.processRefund` with a deterministic
  `idempotencyKey`; the refund releases inventory via engine compensation inside the same transaction.
- **Money:** `Prisma.Decimal` end-to-end. `Number()`/`Math.round` on amounts inside domain/financial
  paths is a violation — aggregate with Decimal, convert once at a display boundary if needed.
- **Payments:** webhook HMAC must be verified over the EXACT raw body and FAILS CLOSED when
  `SHETAB_SECRET_KEY` is missing; one capture per booking (fresh eventIds for a captured booking
  collapse to `DUPLICATE`); terminal-state bookings are never resurrected; the demo gateway is
  unreachable when `NODE_ENV=production` (also enforced at build time by `next.config.ts`).
- **Exceptions:** file OperationalExceptions ONLY via `OperationalExceptionService.raiseException`
  (ERP-009 dedupe — repeated detections collapse onto the open record).
- **Logging:** use `createLogger(component, correlationId)` from `@/lib/observability/logger`;
  never log credentials, OTP codes, or PII (the logger redacts known keys, but do not rely on it).
- **OTP delivery:** the outbox payload carries the code AES-256-GCM sealed (`encryptSensitive`);
  the consumer unseals at delivery time — never put plaintext codes in the outbox.
- **Startup:** `assertProductionConfig()` (BASE-008) throws on invalid production configuration —
  never weaken it to make a broken environment boot.

---

## 3. Directory Layout Standards

```
src/
├── actions/       # Server Actions (orchestration, validation, auth gates)
├── app/           # Next.js App Router ([locale] segmented routes)
├── components/    # Reusable React components organized by feature
├── domains/       # Domain-driven business logic (booking, ledger, payments, inventory)
├── hooks/         # Custom React client hooks
├── i18n/          # next-intl routing and request configuration
├── lib/           # Shared stateless utilities, Prisma client, validation schemas
├── services/      # Data access layer for external APIs / catalogs
└── stores/        # Zustand client stores
```

---

## 4. Testing Contract

- **Unit tests** reside in `src/**/*.test.ts` and run in isolated in-memory or transactional environments.
- **E2E tests** reside in `tests/*.spec.ts` and test complete user journeys via Playwright.
- Test suites must clean up any database records they create to maintain idempotency and zero database pollution.
