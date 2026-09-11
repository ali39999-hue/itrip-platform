# Firuzo / iTrip — Feature Integration Matrix

> Verified against local working tree @ `a6d8270` (v1.6.0) + uncommitted parallel-workstream delta, 2026-09-11.
> Gates re-run during this audit: typecheck ✅ · lint ✅ · unit 559/559 ✅ · production build ✅ · gate:i18n 846×5 ✅ · gate:a11y ✅

Legend: ✅ verified integrated · 🟡 partial / simulated leg · ⛔ not implemented · 🔒 intentionally gated (COMING_SOON / fail-closed)

| Feature | UI | Frontend State | API | Backend | DB | External API | ERP | Wallet | Notifications | Analytics | Tests | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Home / Discovery | ✅ | ✅ | ✅ | ✅ (CMS) | ✅ | n/a | — | — | — | ✅ | ✅ | **REAL** |
| Flight search UX | ✅ | ✅ | ✅ `/api/flights/search` | ✅ normalization | ✅ catalog | ⛔ live GDS (MOCK catalog) | — | — | — | ✅ | ✅ | **MOCK data, REAL pipeline** |
| Hotel search / detail / map | ✅ | ✅ | ✅ `/api/hotels/search` | ✅ | ✅ | ⛔ bedbank (MOCK catalog) | — | — | — | ✅ | ✅ | **MOCK data, REAL pipeline** |
| Tours | ✅ | ✅ | ✅ `/api/tours` | ✅ inventory-backed | ✅ | real (own supply) | ✅ | ✅ | ✅ | ✅ | ✅ | **REAL** |
| Checkout funnel | ✅ (sticky CTA, soft-lock timer ✳) | ✅ | ✅ actions | ✅ server pricing + snapshot | ✅ | — | — | ✅ | ✅ | ✅ funnel | ✅ | **REAL** |
| Unified cart (multi-product) | ✅ | ✅ | ✅ | ✅ UnifiedCartService + holds | ✅ | — | — | ✅ | — | — | ✅ | **REAL** (pricing uses JS numbers ✳) |
| Payment — eCardo IPN | ✅ | ✅ | ✅ webhook+callback | ✅ HMAC capture authority | ✅ | 🔒 no live creds (fail-closed) | ✅ ledger | ✅ | ✅ | ✅ | ✅ | **BETA** (code REAL, creds pending) |
| Payment — Shetab | ✅ | ✅ | ✅ | ✅ fail-closed | ✅ | 🔒 no terminal creds | ✅ | ✅ | ✅ | ✅ | ✅ | **BETA** (code REAL, creds pending) |
| Payment — Card-to-Card | ✅ | ✅ | ✅ receipt upload | ✅ PENDING_VERIFICATION → back-office | ✅ | manual | ✅ finance verify | ✅ | ✅ | ✅ | ✅ | **BETA** |
| Payment — Visa/MC, USDT | 🔒 | — | — | — | ✅ | ⛔ | — | — | — | — | — | **COMING_SOON** |
| Wallet | ✅ | ✅ | ✅ actions | ✅ double-entry | ✅ | n/a | ✅ | ✅ | ✅ | ✅ | ✅ | **REAL** |
| Refund / cancellation | ✅ | ✅ | ✅ | ✅ RefundDomainService | ✅ | 🔒 bank payout | ✅ reversal journal | ✅ | ✅ | ✅ | ✅ | **BETA** (bank leg pending) |
| Booking lifecycle | ✅ | ✅ | ✅ | ✅ state machine + saga | ✅ | supplier leg simulated | ✅ travel file | ✅ | ✅ outbox | ✅ | ✅ | **REAL** |
| Inventory / holds | ✅ soft-lock | ✅ | ✅ | ✅ atomic | ✅ | n/a | — | — | — | — | ✅ concurrency suites | **REAL** |
| Auth / OTP | ✅ | ✅ | ✅ NextAuth v5 | ✅ hashed OTP | ✅ | 🔒 SMSWBS (dev console fallback) | — | — | — | — | ✅ | **BETA** |
| Account / travelers / docs | ✅ | ✅ | ✅ travelers actions | ✅ TravelerProfileService | ✅ | — | ✅ Customer360 | — | — | — | ✅ | **REAL** (✳ new, uncommitted) |
| My Trips / dossier | ✅ | ✅ | ✅ | ✅ ownership-checked | ✅ | — | ✅ | — | ✅ | — | ✅ | **REAL** |
| Invoices | ✅ (✳ new) | ✅ | ✅ invoices actions | ✅ official tax invoice | ✅ | — | ✅ | — | — | — | ✅ | **REAL** (✳ new, uncommitted) |
| Organizations / B2B | ✅ (✳ new) | ✅ | ✅ | ✅ tenant-scoped | ✅ | — | ✅ | ✅ credit | — | — | ✅ | **REAL** (✳ new, uncommitted) |
| ERP — Travel file / exceptions | ✅ | ✅ | ✅ | ✅ + remediation service (✳ new) | ✅ | supplier poll simulated | ✅ | ✅ | ✅ | — | ✅ | **REAL** |
| Settlement / commission | ✅ | — | — | ✅ | ✅ | manual match | ✅ | — | — | — | ✅ | **REAL** |
| Notifications | ✅ inbox | — | — | ✅ outbox-driven | ✅ | Telegram provider (real code, needs bot token) | — | — | ✅ | — | ✅ | **BETA** |
| Support | ✅ | ✅ | — | ✅ tickets | ✅ | manual channels | ✅ | — | ✅ | — | ✅ | **REAL** |
| CMS / content / SEO | ✅ | — | ✅ | ✅ internal-link engine | ✅ | — | — | — | — | — | ✅ | **REAL** |
| Loyalty streak | ✅ | ✅ | ✅ API | ✅ server-authoritative | ✅ | — | ✅ ledger | ✅ | — | ✅ | ✅ | **REAL** |
| AI planner / copilot | ✅ | ✅ | ✅ `/api/plan/refine` | ✅ router + grounding | — | ✅ provider APIs (keyed) | — | — | — | ✅ traces | ✅ | **REAL** (labels are suggestions) |
| Smart Planner funnel | ✅ | ✅ | ✅ | ✅ itinerary → cart handoff | ✅ | — | — | ✅ | — | — | ✅ | **REAL** |
| eSIM / Insurance / Visa / Transfers / Interpreter | ✅ | ✅ | ✅ | 🟡 addons priced server-side | ✅ | ⛔ carrier webhooks | ✅ travel file | ✅ | — | — | 🟡 | **PARTIAL** (vouchers simulated) |
| Analytics | ✅ opt-in | ✅ | — | ✅ trackFunnel + PostHog | — | ✅ PostHog/GA optional | — | — | — | ✅ | ✅ | **REAL** |
| Observability / health | — | — | ✅ `/api/health/*` | ✅ structured logs, PII masking | — | — | — | — | — | ✅ | ✅ | **REAL** |
| Cron / workers | — | — | ✅ `/api/cron/auto-buy` | ✅ worker runtime | ✅ | — | — | — | — | — | ✅ | **REAL in Docker/k8s · ⛔ absent on Vercel** |

✳ = shipped by the current uncommitted parallel workstream (present only in the local tree).

## Cross-cutting gates (verified this audit)

| Gate | Result |
|---|---|
| `npm run typecheck` | ✅ PASS |
| `npm run lint` | ✅ PASS (0 warnings) |
| `npm run test:unit` | ✅ 559/559 across 87 files |
| `npm run build` (production) | ✅ PASS |
| CI-012 (build must fail with DEMO_MODE=true) | ✅ present in `.github/workflows/ci.yml` |
| `npm run gate:i18n` | ✅ 846 keys × 5 locales, 0 missing |
| `npm run gate:a11y` | ✅ 0 nodes failing on audited routes |
| Gitleaks / schema-drift / concurrency / crash-recovery CI jobs | ✅ configured |

## Honest gaps (not integrated)

1. **Live flight/hotel supply** — pipeline, normalization, pricing, checkout, booking are all real; the offers themselves come from a seeded catalog. No GDS/bedbank adapter is wired (`FlightSupplierPort`/`HotelSupplierPort` implementations return catalog data).
2. **Live PSP credentials** — eCardo/Shetab adapters are production-grade in code (HMAC IPN, replay protection, fail-closed) but cannot capture real money until credentials/terminal exist.
3. **Vercel worker absence** — outbox → notifications, saga recovery, and hold sweeping do not execute on the Vercel deployment (only Docker/k8s runs the worker). Live demo may show delayed PNR stamping/notifications.
4. **eSIM/insurance/visa carrier webhooks** — vouchers are simulated GDS artifacts.
5. **`UnifiedCartService` pricing uses JS `number` + `Math.round`** while the canonical Money kernel is Decimal — precision risk on edge amounts (bug matrix BUG-003).
