# PRD — iTrip/Firuzo v2.1 Hardening & QA Cycle

> Tracker: this file (Linear not available in this environment; each task has ID, PRD, Acceptance Criteria).
> Workflow: subtasks → implementation agents (AC-gated, tests must run) → E2E QA agent (browser) → final code-audit agent.

## Context

Full-project audit of the iTrip/Firuzo platform (Next.js 16, React 19, Tailwind v4, next-intl, 5 locales).
Baseline findings (verified 2026-08-30):

- `tsc --noEmit`: **clean**
- `eslint`: 1 warning (`PlanSearchForm.tsx:3` unused `Search` import)
- `scripts/i18n-audit.js`: **ar missing 65 keys**; 6 ar values identical to fa (review); ru placeholder diffs are ICU-plural false positives (audit script must whitelist ICU `{x, plural, ...}`)
- Dead code (verified unreachable): `src/components/checkout/{constants,types}.ts`, `src/components/checkout/hooks/{useCheckoutPricing,useCheckoutWorkflow,usePassportScanner}.ts`, `src/components/ui/{Avatar,Card,Dialog,EmptyState,Sheet,Skeleton,Tabs,Tooltip}.tsx`, `src/components/ui/index.ts`, `src/components/home/HomeSections.tsx` (1-line re-export used by home page — wire directly instead)
- Duplicate `global-error.tsx` in `src/app/` and `src/app/[locale]/`
- `src/app/[locale]/admin/page.tsx`: hardcoded Persian KPI strings bypassing i18n
- `src/app/[locale]/my-trips/[id]/page.tsx`: 5× `<img>` with eslint-disable (must be `next/image`)
- `next.config.ts`: `serverActions.allowedOrigins: ['*']`, `images.dangerouslyAllowLocalIP: true`
- Repo hygiene: `cloudflared.exe`, `screenshots/`, `playwright-report/`, `test-results/`, `tsconfig.tsbuildinfo` tracked in git

---

## ITR-101 — Build & Lint Baseline
**PRD:** All three gates must pass before any fix lands.
**AC:**
- [ ] `npm run build` exits 0
- [ ] `npm run lint` → 0 errors, 0 warnings
- [ ] `npx tsc --noEmit` → 0 errors

## ITR-102 — Complete Arabic translations + i18n audit hardening
**PRD:** Add the 65 missing `ar` keys (professional Arabic, RTL-appropriate), review the 6 fa-identical values (currency terms like «تومان» may stay if natural in Arabic; `Interpreter.sos`, `Flights.stops` must be localized). Extend `scripts/i18n-audit.js` to treat ICU `{var, plural, ...}` / `{var, select, ...}` as valid placeholders so ru plural messages stop flagging.
**AC:**
- [ ] `node scripts/i18n-audit.js` → 0 missing / 0 extra keys for all 5 locales
- [ ] ru placeholder mismatches: 0 (ICU-aware)
- [ ] All 6 ar fa-identical values either localized or explicitly justified (currency)
- [ ] `npm run build` still exits 0

## ITR-103 — Extract hardcoded strings (i18n leaks)
**PRD:** Sweep `src/**` for user-visible hardcoded strings (starting with `admin/page.tsx` KPIs). Extract into message namespaces across all 5 locales. Persian-character grep on `src/**/*.tsx|ts` must only match intentional cases (e.g., Jalali date-picker locale import, HTML `lang` attrs).
**AC:**
- [ ] No hardcoded user-visible Persian/English copy in `src/**` pages/components outside allowed exceptions
- [ ] Admin dashboard renders translated in `en`, `zh`, `ru` (spot-check keys exist)
- [ ] `node scripts/i18n-audit.js` still reports 0 structural problems

## ITR-104 — Dead code removal + dedup
**PRD:** Delete the unreachable files listed above; home page imports sections directly (drop `HomeSections.tsx`); keep exactly one `global-error.tsx` (root `src/app/`); remove unused `Search` import in `PlanSearchForm.tsx`.
**AC:**
- [ ] No imports referencing deleted files (`grep` verification)
- [ ] `npm run build` + `tsc` pass; `npm run lint` → 0 warnings
- [ ] Home page renders unchanged (sections intact)

## ITR-105 — Image handling (`next/image`)
**PRD:** Replace the 5 `<img>` usages + eslint-disables in `src/app/[locale]/my-trips/[id]/page.tsx` with `next/image`.
**AC:**
- [ ] 0 occurrences of `no-img-element` disable comments in `src/`
- [ ] `npm run build` passes; voucher/voucher-detail page renders images correctly

## ITR-106 — Config security hardening + repo hygiene
**PRD:** `next.config.ts`: replace `allowedOrigins: ['*']` with explicit localhost/dev origins; drop `dangerouslyAllowLocalIP` unless a concrete local need remains. `.gitignore`: add `screenshots/`, `playwright-report/`, `test-results/`, `tsconfig.tsbuildinfo`, `cloudflared.exe`; `git rm --cached` those artifacts (keep on disk).
**AC:**
- [ ] `git status` shows artifacts untracked; `git ls-files` no longer lists them
- [ ] `npm run build` passes with tightened config
- [ ] No new dev-server origin breakage (dev origins list kept)

## ITR-107 — UI/UX consistency pass
**PRD:** Visual audit of core pages (`/`, `/flights/search`, `/hotels/search`, `/hotels/[id]`, `/tours`, `/plan`, `/checkout`, `/wallet`, `/admin`) in `fa` (RTL), `ar` (RTL), `en` (LTR): token compliance (no raw hex, consistent radii/shadows), spacing rhythm, heading hierarchy, focus-visible states, mobile bottom-nav safe areas, empty/loading states, RTL mirroring (no unmirrored icons/positions).
**AC:**
- [ ] Screenshot review of the above pages in fa+ar+en — no visual defects left open
- [ ] No raw hex colors outside `globals.css` tokens (grep, excluding map/third-party)
- [ ] RTL pages: direction, numbers (`fa` digits), and icons render correctly

## ITR-108 — E2E QA (browser agent)
**PRD:** After fixes land: run full Playwright suite + browser QA of core flows (search→hotel→checkout→voucher, wallet, plan) in fa + en, including console-error scan.
**AC:**
- [ ] `npx playwright test` — all suites green
- [ ] Browser pass on core flows with 0 console errors
- [ ] Defects found are fixed or filed as follow-ups with evidence

## ITR-109 — Final code audit (standards + security)
**PRD:** Independent agent audits: architecture conformance (App Router patterns, server/client boundaries), type safety, mock-data boundaries clearly marked, security (headers, OTP/auth mock exposure, server-action validation), performance (bundle, images, fonts).
**AC:**
- [ ] Audit report produced with severity-rated findings
- [ ] Critical/high findings fixed or explicitly accepted with rationale

---

## Status board

| Task | Owner | Status |
|---|---|---|
| ITR-101 | main | ✅ done (tsc clean, lint 1 warning → folded into ITR-104) |
| ITR-102 | agent-translations | pending |
| ITR-103 | agent-translations | pending |
| ITR-104 | agent-refactor | pending |
| ITR-105 | agent-refactor | pending |
| ITR-106 | agent-infra | pending |
| ITR-107 | main | pending |
| ITR-108 | qa-agent | pending |
| ITR-109 | audit-agent | pending |
