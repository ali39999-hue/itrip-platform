# BASE-003 — Feature Reality Matrix

Generated 2026-09-06 against baseline `0fc1a105`. Labels: **PRODUCTION-READY / COMPLETE / PARTIAL /
LEGACY / MOCK / SIMULATED / BROKEN / MISSING**. Every claim below is evidence-backed (file:line).
This matrix supersedes the optimistic claims in README/PRODUCTION_READINESS/SECURITY_AUDIT where they conflict.

## Area verdicts

| Area | Status | Evidence & gaps |
|---|---|---|
| DB / migrations | PRODUCTION-READY (canonical PostgreSQL) | 51 models, 15 migrations, `migrate deploy` reproducible in CI; leftover `prisma/dev.db` SQLite is dead weight |
| Relational RBAC | **CANONICAL (runtime)** | `requirePermission`/`getUserPermissions`/`hasErpRole` resolve solely via the relational chain; JWT `role` claim now relational (IAM-002); legacy `Role.permissions` JSON never read and writers neutralized to `'[]'` (IAM-003); IAM-008 deny/grant/revoke matrix test added. Remaining: physical DROP of legacy columns + `OrganizationMembership.roleId` FK (IAM-004) deferred until the user's staged schema work merges; permission catalog seeded relationally (IAM-005) |
| Tenant isolation | PARTIAL | 3 layers (middleware JWT gate, layout `hasErpRole`, `requirePermission`/`assertTenantAccess`); tenant-scoped Prisma extension exists but only `getAdminBookings` uses it; `api/admin/search` unscoped; **tenant-scoper scopes `Invoice`/`TravelDocument` by non-existent `organizationId` column** (`tenant-scoper.ts:15`) → would throw |
| Money/pricing kernel | COMPLETE | `Money` over `Prisma.Decimal` (`lib/finance/index.ts`), 12-stage Decimal pricing pipeline (`lib/pricing/engine.ts`), no float Math.round on money in pricing/finance |
| Tax engine | COMPLETE (engine) / orphan DB | versioned date-effective `TaxEngine` (`lib/finance/tax-engine.ts:106`); `TaxJurisdiction` model unused |
| FX | SIMULATED | `CurrencyService` uses `StaticRateProvider` (hardcoded rates); no FX snapshot persistence; wallet FX exchange posts spread to ledger |
| Booking lifecycle | COMPLETE (engine) | 4 decoupled lifecycles + transition tables (`state-machine.ts`), `BookingStatusHistory` on every transition, `PriceSnapshot` persisted; **but admin refund (`actions/admin.ts:146-232`) re-implements flow inline and `BookingDomainService` is test-only** |
| Inventory | COMPLETE (engine) / bypassed | row-locked atomic holds, 100-thread oversell test passes (`inventory-concurrency.test.ts`); **`actions/admin.ts:210-218` and `actions/booking.ts:323` mutate Allotment/InventoryHold directly, bypassing the engine** |
| Payments core | PARTIAL | PaymentIntent/Attempt/GatewayTransaction/WebhookEvent models wired; webhook has replay window + idempotency + amount/currency validation (`PaymentDomainService.ts:281-480`); **signature verification fail-open when `SHETAB_SECRET_KEY` unset** (`gateway-port.ts:176→231`); HMAC computed over re-serialized JSON (`:374`) instead of raw body; demo gateway gated on env var only (no NODE_ENV check at `gateway-port.ts:337`) |
| PSP integration | MISSING | zero HTTP calls in payments domain; "Shetab" adapter fabricates a local ref and redirects to Shaparak URL that can never complete (`gateway-port.ts:89-111`); payments fail closed without creds (good) but no real PSP exists |
| Refund | **WIRED (admin path)** | `refundBookingAdmin` delegates to `RefundDomainService.processRefund` (2026-09-06): full `Refund`+`RefundItem`+policy snapshot+approval+attempt rows, booking status walks the full legal chain, payment status follows its own machine, ledger reversal + hold release atomic, deterministic idempotency key + P2002 collapse (REF-001..008); customer-side refund adapters still stubbed |
| Ledger/accounting | COMPLETE | double-entry invariant enforced (`GeneralLedgerService`), unbalanced-journal rejection tested; templates for wallet/gateway/revenue/FX/refund; balance math duplicated in 2 other layers (wallet actions) |
| Invoice/Commission/Settlement | MOCK (unwired) | services exist and are tested, but **no production caller creates invoices, commission accruals, or settlement batches** |
| Outbox/Saga/workers | COMPLETE (in-process) | transactional outbox + `FOR UPDATE SKIP LOCKED` + backoff + DLQ; saga persistence + compensation + stale-lease recovery; **all workers run inside the web process via `instrumentation.ts`** — no dedicated worker deployment; saga uses `Number()` float math on amounts (`saga-orchestrator.ts:40,61-68`) |
| Suppliers | MOCK | ports + canonical models + circuit breaker + health aggregation exist and are tested, but both adapters (`GdsFlightSupplierAdapter`, `BedBankHotelSupplierAdapter`) return local catalog data; `SupplierConnection/Credential/Health` models orphan; credentials not stored/encrypted anywhere real |
| ERP Travel File | PARTIAL | travel-files UI reads `Trip` dossiers — but **nothing in production writes `Trip`** (seed-only); Exception Center read/write works (OperationalException) with **ERP-009 dedupe** (repeated detections collapse onto the open exception, SLA re-armed) |
| Documents | PARTIAL | `TravelDocument` model + AES-GCM encryption + `auditDocumentAccess`; upload path/signed retrieval not audited here; tenant-scoper bug applies |
| B2C search UX | COMPLETE | loading/empty/error/retry + abort-stale-fetch on flights/hotels search; server-side reprice in `createBookingDraft` (client amounts never trusted) |
| Quote expiry | MISSING | `PriceSnapshot` has no `expiresAt`; no price-change/re-quote state (only hold 15min + intent TTL 15min) |
| i18n | PARTIAL | next-intl canonical, 5 locales × 851 keys in sync, RTL via `dir` on `<html>`; **parallel `lt()` inline-text mechanism in ~90 files / ~1,125 call sites**; ar/zh/ru silently fall back to English inside `lt` |
| OTP/auth | PARTIAL | hashed OTP (HMAC w/ AUTH_SECRET), 5-min TTL, max 5 attempts, rate limits (3/10min id + 10/5min IP); **IP limit never invoked with IP (`actions/auth.ts:38`); limiter is in-memory; production delivery broken — consumer sends `***` because outbox payload carries only `codeHash`** (`auth.ts:55` → `OutboxConsumer.ts:134-141`); missing SMS keys silently report success (`NotificationProvider.ts:148-153`) |
| Observability | PARTIAL → improving | `health/live` + `health/ready` (ledger check cached 5 min); **structured JSON logger with PII redaction adopted in webhook + outbox paths (OBS-003/004)**; **every response carries `x-correlation-id` (OBS-001-lite)**; critical operations already stamp correlationId on saga/outbox/history records. Remaining: logger adoption across all domains, request-scoped propagation into server actions, business metrics, alerts |
| CI | PARTIAL | Postgres 16 + lint + typecheck + unit + build enforced; **E2E gate `continue-on-error: true`; no DEMO_MODE-in-prod guard; no schema drift check; no secrets scan; `NEXT_PUBLIC_DEMO_MODE=true` baked into CI build bundle** |
| Docs | PARTIAL | comprehensive but version-drifted (v1.1.0 vs v2.0 vs v2.0-rc2 vs v3.0; test counts 96/106/113; migration counts 9/10/12/15) |

## Top P0 gaps (ranked — these gate the "Critical production gate")

1. **Webhook forgery when `SHETAB_SECRET_KEY` unset** — signature check skipped, returns `valid: true`
   (`gateway-port.ts:176→231`); a forged webhook with any real `bookingId` + `totalAmount` confirms the booking
   free of charge (`PaymentDomainService.ts:431-473`). Fail-open in the money path. Also `verifyPayment` fail-open
   when signature absent (`:146→162`). → PAY-006/007/008
2. **No real PSP** — production payments can never complete (`gateway-port.ts:89-111`). → PAY-004/005
3. **Production OTP delivery broken** — users receive "کد: ***" (payload has only `codeHash`); with real SMS keys
   login is functionally dead; missing keys silently fake success. → SEC-003, ASYNC-002
4. **Demo payment path reachable in production via one env var** — `gateway-port.ts:337`, `PaymentDomainService.ts:59,358`
   check `DEMO_MODE` but never `NODE_ENV`; no CI/build guard. → CI-012, BASE-008
5. **Webhook HMAC over re-serialized JSON** — real PSP signatures can never validate
   (`PaymentDomainService.ts:374` vs raw body read at `route.ts:13`). → PAY-006
6. ~~**Refund aggregate unwired**~~ — **FIXED 2026-09-06:** admin refund now delegates to
   `RefundDomainService` (Refund row + policy snapshot + attempt + ledger + hold release in one
   transaction, idempotent by `admin_full_refund_${bookingId}` + P2002 race collapse).
7. **Tenant-scoper references non-existent columns** (`Invoice`, `TravelDocument` + `organizationId`) — latent
   runtime break of every non-superadmin scoped query on those models (`tenant-scoper.ts:15`). → IAM-007
8. **CI gate holes** — E2E non-blocking, no DEMO_MODE build guard, no drift/secrets checks
   (`.github/workflows/ci.yml`). → CI-012/014/009
9. **health/ready self-DoS** — full ledger aggregate per probe (`ready/route.ts:57`). → OBS-007
10. **Rate limiting in-memory + OTP IP layer dead** (`rate-limiter.ts:6`, `actions/auth.ts:38`). → SEC-003

## Second-tier gaps (P1)

- Quote/price TTL + price-change UX (B2C-007/009) — missing.
- Admin surfaces rely on permission checks without `assertTenantAccess` (only `getAdminBookings` scopes).
- ~~Saga float math on money~~ — **FIXED 2026-09-06** (saga aggregation now Prisma.Decimal end-to-end).
- `BookingDomainService` unused by its own action (`createBookingDraft` still inline — file carries
  the user's staged travel-date work, deferred to avoid conflict).
- Wallet balance computed in 3 places (GLS + 2 action paths).
- Workers in web process only; no external scheduler/cron fallback.
- `lt()` legacy layer with 1,125 call sites (I18N-002).
- Demo wallet seeding in client store gated on build-time `NEXT_PUBLIC_DEMO_MODE`.
- ~~`updateAllotment` bypasses InventoryEngine~~ — **FIXED 2026-09-06** (`setAllotmentPolicy` with
  row-lock + capacity invariant); remaining bypass: booking.ts hold-link updateMany (user-staged file).
