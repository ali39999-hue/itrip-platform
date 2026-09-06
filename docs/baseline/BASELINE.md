# BASE-001 — Frozen Baseline Record

**Task:** BASE-001 (Master Task List v1.0) — Freeze current baseline and record commit.
**Recorded:** 2026-09-06
**Recorded by:** ZCode production-hardening run (W0)

## Repository identity

| Field | Value |
|---|---|
| Working copy | `C:\Users\Lenovo\Desktop\firouzo\itrip-platform` |
| HEAD SHA | `0fc1a1056bf103e922b674601557c5c622c55451` |
| Branch | `feat/booking-travel-date` |
| HEAD date | 2026-09-05 (see `git log -1` for exact timestamp) |
| package.json version | `1.1.0` |

## Working-tree state at freeze

The freeze is the HEAD commit above. The working tree was **dirty** when the hardening run started
(these changes predate this run and are preserved untouched):

- Staged (feature work): booking travel-date migration `20260905233000_add_booking_travel_date`,
  `prisma/schema.prisma`, `src/actions/booking.ts`, `src/app/[locale]/my-trips/page.tsx`, `README.md`.
- Unstaged edits: flights checkout page, plan pages, travelogues, admin components, layout/BottomNav,
  `payment-safety.test.ts`, `CountryExperiences.tsx`.
- Untracked transient tooling: `responsive-390.png`, `scripts/check-responsive*.js`, `scripts/scan-overflow.js`,
  `scripts/test-home-mobile.js`, `scripts/test-navs.js`.
- Leftover artifact: `prisma/dev.db` (SQLite) — obsolete, PostgreSQL is canonical (see BASE-007).

**Rule applied:** the hardening run never commits or reverts pre-existing user changes; all new work is
additive and recorded in its own changelog (`docs/baseline/HARDENING-W0-CHANGELOG.md`).

## Environment assumptions

| Component | Version at freeze |
|---|---|
| Node.js | v24.18.0 |
| npm | 11.16.0 |
| Next.js | 16.3.2 (App Router) |
| React | 19.2.8 |
| Prisma | 5.22.0 — datasource **postgresql** (canonical) |
| TypeScript | ^5 (strict `tsc --noEmit` gate) |
| Test stack | Vitest 4 (unit/domain, include `src/**/*.{test,spec}.ts`), Playwright 1.62 (E2E, `tests/`) |
| Locales | en, fa, ar, zh, ru — default `fa`; RTL for fa/ar |
| Auth | next-auth 5 beta (credentials + OTP), JWT sessions |

## Verification commands available at freeze

```
npm run lint          # eslint (flat config)
npm run typecheck     # tsc --noEmit
npm run test:unit     # node scripts/run-unit-tests.mjs  → isolated itrip_test DB
npm run test:e2e      # playwright test
npm run db:deploy     # prisma migrate deploy
npm run prisma:seed   # tsx prisma/seed.ts
```

## Pointer to W0 outputs

- BASE-002 → `docs/baseline/ARCHITECTURE_INVENTORY.md`
- BASE-003 → `docs/baseline/FEATURE_REALITY_MATRIX.md`
- BASE-004 → `docs/baseline/DB_MODEL_OWNERSHIP.md`
- BASE-005 → `docs/baseline/COMMAND_QUERY_MAP.md`
- BASE-007 → `docs/PRODUCTION_ENV_CONTRACT.md`
- BASE-008 → implemented guard: `src/lib/runtime-mode.ts` + `docs/PRODUCTION_ENV_CONTRACT.md`
- BASE-009 → `docs/RELEASE_CHECKLIST.md`
- BASE-010 → version consistency fixes recorded in `docs/baseline/HARDENING-W0-CHANGELOG.md`
