# BASE-007 — Production Environment Contract

Every variable the runtime reads, its owner, and what happens when it is missing.
Validation: `assertProductionConfig()` (`src/lib/runtime-mode.ts`) runs at boot via
`src/instrumentation.ts` — **a production process that violates this contract refuses to start.**

## Mandatory in production

| Variable | Consumer | Contract |
|---|---|---|
| `DATABASE_URL` | Prisma (`prisma/schema.prisma`) | PostgreSQL 16 connection string. **PostgreSQL is canonical** — no SQLite in any environment. |
| `AUTH_SECRET` (or `NEXTAUTH_SECRET`) | next-auth, OTP hashing, crypto-vault fallback | `openssl rand -base64 32`. Rotation invalidates sessions and previously issued OTP hashes. |
| `SHETAB_MERCHANT_ID` + `SHETAB_SECRET_KEY` + `SHETAB_TERMINAL_ID` | `src/domains/payments/gateway-port.ts` | Real PSP credentials. Without them payments **fail closed** — or set `GATEWAY_MODE=internal_wallet` for a wallet-only launch (then no PSP is expected). |

## Forbidden in production (startup throws)

| Variable | Rule |
|---|---|
| `DEMO_MODE=true` | Simulated payment/demo paths are unreachable in production (`NODE_ENV` guard in gateway + factory + `assertProductionConfig` + `next.config.ts` build gate, CI-012). |
| `NEXT_PUBLIC_DEMO_MODE=true` | Demo wallet seeding is inlined into the client bundle at build time — must be `false` for production builds (CI enforces). |

## Required for full functionality (degrade → fail-closed per operation)

| Variable | Consumer | Missing-key behaviour |
|---|---|---|
| `KAVENEGAR_API_KEY` or `SMS_PROVIDER_API_KEY` | `NotificationProvider` | SMS delivery **fails closed in production** (OTP outbox event retries → DLQ). Non-production simulates to console. |
| `RESEND_API_KEY` | `NotificationProvider.sendEmail` | Email delivery **fails closed in production**. |
| `EMAIL_FROM` | Resend | Defaults to `Firuzo <noreply@firuzo.com>`. |
| `ENCRYPTION_KEY` | `crypto-vault` AES-256-GCM master key | Falls back to `AUTH_SECRET`. Set a dedicated key so AUTH_SECRET rotation doesn't orphan encrypted PII/OTP payloads. ⚠️ Rotating it makes existing `enc:v1:` ciphertext (traveler PII) unreadable — plan key management before go-live. |
| `NEXTAUTH_URL` | Payment callback URL | Defaults to `http://localhost:3000` (wrong in prod — always set). |

## Optional

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for metadata. |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_GA_ID` | Client analytics/metadata. |
| `GATEWAY_MODE=internal_wallet` | Declares a wallet-only deployment (skips PSP credential requirement). |
| `TEST_DATABASE_URL` | Vitest reroutes the Prisma client here so tests never touch the dev DB. |

## Environment separation rules (BASE-008)

1. `.env` / `.env.local` in the repo working copy currently carry `DEMO_MODE=true` — **they are dev-only files and must never reach a production host** (they are git-ignored; provisioning systems must inject prod values).
2. Demo behaviour requires **both** `DEMO_MODE=true` **and** `NODE_ENV !== production`. Every demo consumer re-checks this pair (`auth.ts`, `actions/booking.ts`, gateway factory, webhook service, notification provider).
3. Startup order: `instrumentation.register()` → `assertProductionConfig()` → workers start. A misconfigured production boot dies before accepting traffic.
4. CI runs tests with `DEMO_MODE=true` (test runtime), but the **build** step forces `DEMO_MODE=false`/`NEXT_PUBLIC_DEMO_MODE=false`, and a dedicated CI-012 job proves a production build with `DEMO_MODE=true` fails.
