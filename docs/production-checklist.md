# iTrip / Firuzo Platform — Production Deployment Checklist

Before opening the platform to real customer traffic and actual financial transactions, complete every check below:

---

## 1. Database & Persistence
- [ ] Set `DATABASE_URL` to a high-availability PostgreSQL cluster (with PgBouncer connection pooling).
- [ ] Run `npm run db:deploy` (`prisma migrate deploy`) to ensure all migrations are applied.
- [ ] Verify that no uncommitted schema changes exist (`prisma migrate status`).
- [ ] Configure automated daily WAL backups and point-in-time recovery (PITR).

---

## 2. Security & Credentials
- [ ] Generate a cryptographically secure 32-byte `AUTH_SECRET`: `openssl rand -base64 32`.
- [ ] Ensure `NODE_ENV=production` is set in the runtime environment.
- [ ] Verify `DEMO_MODE` is unset or explicitly set to `"false"`.
- [ ] Verify `NEXT_PUBLIC_DEMO_MODE` is unset or `"false"`.
- [ ] Confirm no default passwords exist in production database seed scripts.
- [ ] Check security headers: HSTS, CSP, X-Frame-Options, and nosniff enabled via `next.config.ts`.

---

## 3. Financial Ledger & Settlement
- [ ] Trigger manual reconciliation (`runLedgerReconciliation()`) in Admin Finance to verify that `mismatches.length === 0`.
- [ ] Confirm background reconciliation worker is running periodically via `instrumentation.ts`.
- [ ] Verify real PSP webhook endpoint with digital signature validation and strict idempotency keys.

---

## 4. Third-Party Integrations
- [ ] Configure `RESEND_API_KEY` or production SMTP credentials for real customer email delivery.
- [ ] Configure `KAVENEGAR_API_KEY` for official SMS OTP dispatch.
- [ ] Verify SSL certificate on the production domain (`https://firuzo.com`).

---

## 5. Automated Health & Verification
- [ ] Run `npm run typecheck` → 0 errors.
- [ ] Run `npm run lint` → 0 errors, 0 warnings.
- [ ] Run `npm run test:unit` → 100% tests pass (concurrency, ledger, state machine, notifications).
- [ ] Run `node scripts/i18n-audit.js` → 0 missing, 0 extra across all 5 languages.
- [ ] Verify production Next.js build: `npm run build` succeeds cleanly with `output: 'standalone'`.
