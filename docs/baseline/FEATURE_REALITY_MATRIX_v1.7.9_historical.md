# iTRIP / Firuzo Platform — Feature Reality Matrix (v1.7.9) [HISTORICAL]

**Version:** v1.7.9  
**Commit:** `c3e6074` (`c3e6074e13757b27bae192b278ff59defa8e2cf5` — chore(release): bump version to v1.7.9 [release train])  
**Branch:** release/v1.7.9 (main HEAD: `6439603`, live deployment: `0d798f4`)  
**Audit Date:** 2026-09-16  
**Authoritative Baseline:** v1.7.9 / `c3e6074`  
**Status:** ARCHIVED / HISTORICAL — Superseded by `FEATURE_REALITY_MATRIX.md` (v1.8.0 / `63b549f`)

---

## 1. System Baseline Metrics

- **Runtime & Framework:** Node.js 22.x · Next.js 16.3.4 (App Router) · React 19.2.8 · TypeScript 5 · Tailwind CSS v4
- **Database & Persistence:** Prisma 5.22.0 · **78 Relational Models** · **32 Migrations** (strictly PostgreSQL 16, zero SQLite drift)
- **Unit & Domain Tests:** 133 test files / **861 verified tests** (100% passing in `results/unit.json` / `vitest run`)
- **E2E Test Specifications:** 27 Playwright test suites in `tests/*.spec.ts` (including golden journeys, mobile chromium, audit suites)
- **Internationalization:** 5 supported languages (`fa`, `en`, `ar`, `zh`, `ru`) with key parity enforced via `scripts/i18n-completeness-gate.mjs`
- **Design System & Primitives:** Semantic tokens (`text-ink`, `text-sub`, `bg-surface`, `bg-brand`, `bg-action`), Shadcn primitives, glassmorphism, responsive 320px–1440px
- **Capability Registry:** `src/lib/capabilities/index.ts` controlling customer-facing claim states
- **Live Deployment State:** `https://itrip-platform.vercel.app/` running build timestamp `2026-09-16T10:35:21.402Z`, probed via `/api/version`, `/api/health/live`, `/api/health/ready`, `/api/capabilities`

---

## 2. Release & Deployment Provenance Audit

| Artifact / Environment | Target / Expected | Observed Reality | Status | Evidence / Notes |
|---|---|---|---|---|
| **Git Release Tag** | `v1.7.9` | `refs/tags/v1.7.9` -> `9e24c20` -> `c3e6074` | **ALIGNED** | Tag points to commit `c3e6074` |
| **Release Commit** | `c3e6074` | `c3e6074e13757b27bae192b278ff59defa8e2cf5` | **ALIGNED** | Primary release train commit |
| **Local Repository HEAD** | `c3e6074` | `64396038c54fb4460dee2cd939722cc78e491159` | **RELEASE DRIFT (+4)** | Local main has 4 post-release commits (`c16a97e`, `4b243f9`, `3fadc2f`, `6439603`) |
| **Live Vercel Deployment** | `c3e6074` | `0d798f42b449da2e0ff2ffb047ba0836130b1a44` | **LIVE DRIFT (+5)** | Live runs commit `0d798f4` deployed on 2026-09-16T10:35:21Z |
| **package.json Version** | `1.7.9` | `1.7.9` | **ALIGNED** | Line 3 of `package.json` |
| **src/lib/version.ts** | `1.7.9` | `1.7.9` | **ALIGNED** | `APP_VERSION = '1.7.9'` |
| **Live /api/version** | `1.7.9` | `1.7.9` (commit `0d798f4`) | **ALIGNED VERSION** | Production runtime reports v1.7.9 |
| **Live /api/health/live** | 200 OK | 200 OK (uptime: 410s, memory: 114MB) | **HEALTHY** | Node process alive |
| **Live /api/health/ready** | 200 OK | Database healthy (1171ms), Redis: IN_MEMORY, Gateway: PRODUCTION_ECARDO, Ledger: 0 unbalanced | **HEALTHY** | Database & Ledger healthy |
