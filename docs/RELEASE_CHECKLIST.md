# Release Checklist (BASE-009)

Mandatory for every production release. A release that cannot tick a section is not a release.

## 0. Identity
- [ ] Version bumped in `package.json` and reflected in `README.md` (single source: package.json).
- [ ] Changelog entry written (`CHANGELOG…` or release notes) with the tasks/waves included.

## 1. Database
- [ ] `npx prisma migrate deploy` succeeds against a **fresh** PostgreSQL 16 database.
- [ ] Schema drift check passes: `npx prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel prisma/schema.prisma --exit-code` (CI-014 runs this on every PR).
- [ ] `npm run prisma:seed` is idempotent (re-run is safe).
- [ ] No destructive migration ships without a documented down-path / backup snapshot taken first.

## 2. Verification gates (CI `audit-and-verify` must be green)
- [ ] `npm run lint` (includes BASE-006 architecture guardrails).
- [ ] `npm run typecheck` (strict `tsc --noEmit`).
- [ ] `npm run test:unit` — unit + domain + concurrency suites on PostgreSQL.
- [ ] CI-012 demo gate: production build refuses `DEMO_MODE=true`.
- [ ] `npm run build` succeeds with `DEMO_MODE=false`, `NEXT_PUBLIC_DEMO_MODE=false`.
- [ ] E2E golden journeys green on desktop + mobile projects (now blocking).

## 3. Environment (see `docs/PRODUCTION_ENV_CONTRACT.md`)
- [ ] `AUTH_SECRET` set (32+ bytes) — and `ENCRYPTION_KEY` decision made (dedicated key recommended).
- [ ] PSP credentials set (`SHETAB_*`) **or** `GATEWAY_MODE=internal_wallet` declared.
- [ ] `DEMO_MODE` / `NEXT_PUBLIC_DEMO_MODE` **absent or false** on the production host.
- [ ] SMS (`KAVENEGAR_API_KEY`/`SMS_PROVIDER_API_KEY`) and email (`RESEND_API_KEY`) keys present — OTP delivery fails closed without them.
- [ ] `NEXTAUTH_URL` set to the public origin.

## 4. Smoke (post-deploy, on the production origin)
- [ ] `GET /api/health/live` → 200.
- [ ] `GET /api/health/ready` → 200 `ready` (database, outbox, gateway, ledger checks).
- [ ] Register/OTP login receives a real code (not `***`) and sign-in succeeds.
- [ ] One full booking flow: draft → hold → pay (sandbox PSP or wallet) → webhook → booking `CONFIRMED` with `Payment` row and ledger posting.
- [ ] Ledger balanced in admin finance view (no unbalanced groups).
- [ ] One refund path exercised end-to-end (policy → approval → ledger reversal).

## 5. Workers & queues
- [ ] Outbox consumer draining (`OutboxEvent` PENDING not growing; no DEAD_LETTER growth).
- [ ] Hold sweeper active (expired holds released within ~1 min).
- [ ] Saga worker processing (or documented idle for the deployed saga types).
- [ ] ⚠️ Workers run **inside the web process** (instrumentation). If deploying serverless or multi-node, provision a dedicated worker instance or external scheduler before relying on them (W6 gap — see `docs/baseline/FEATURE_REALITY_MATRIX.md`).

## 6. Rollback
- [ ] Previous artifact/version redeployable in one command.
- [ ] Database restore point (snapshot) taken immediately before migration.
- [ ] Feature-affecting env changes reversible without redeploy.
- [ ] Rollback owner + comms channel named for the release window.

## 7. Known-gate review
Re-check the "Critical production gate" (Master Task List §Critical production gate) against
`docs/baseline/FEATURE_REALITY_MATRIX.md` — items marked PARTIAL/MISSING there must be either fixed
in this release or explicitly accepted by the release owner, in writing, in the release notes.
