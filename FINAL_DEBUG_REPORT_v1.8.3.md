# FIRUZO v1.8.3 FINAL DEBUG REPORT

## 1. Release / Commit
- Release: `v1.8.3 - Monorepo Packages, Crisis Runbooks & SLO Telemetry`
- Git HEAD: `c496370a8a14842aedf5974e6fb62ff57c27d211`
- package.json version: `1.8.3`
- src/lib/version.ts: `1.8.3`
- **Status:** ALIGNED

## 2. Live Version / Commit
- Live URL: `https://itrip-platform.vercel.app`
- Live `/api/version`: 200 OK, version=1.8.3, commit=c496370
- Live `/api/health/live`: 200 OK
- **Status:** ALIGNED

## 3. Release ↔ Live Consistency
- package.json ↔ version.ts: PASS
- package.json ↔ live: PASS
- git HEAD ↔ live commit: PASS
- **Verdict:** ALIGNED (measured by verify-release-consistency.mjs)


## 5. P1 Issues Found & Fixed

### QR-001: Quality Report Not-Run = Pass
- **File:** scripts/generate-quality-report.mjs
- **Fix:** not-run/STALE now count as FAIL for required gates

### QR-002: Build/E2E Status Injection
- **File:** .github/workflows/ci.yml
- **Fix:** Evidence files from record-gate-result.mjs, not env vars

### QR-003: Stale Artifact Reuse
- **File:** scripts/generate-quality-report.mjs
- **Fix:** Commit-bound artifacts; mismatched = STALE = FAIL

### LIVE-001: Stale Reality Matrix
- **File:** docs/baseline/FEATURE_REALITY_MATRIX.md
- **Fix:** Generated from measured probe, not hand-copied

### I18N-104: i18n Gate False Positive
- **File:** scripts/i18n-completeness-gate.mjs
- **Fix:** Debt = unlocalizedFaLiterals + incompleteLtCalls, not total call sites

## 6. P2 Issues Found & Fixed

### UI/UX Touch Target
- **File:** UsersClientPage.tsx:502
- **Fix:** min-w-[44px] min-h-[44px]

### init-browsers-for-ci.mjs Corruption
- **File:** scripts/init-browsers-for-ci.mjs
- **Fix:** Reconstructed with proper cache flag handling

## 7. Security
| Gate | Status |
|---|---|
| Dependency CVE scan | PASS |
| Zero hardcoded secrets | PASS |
| Zero credential fallbacks in tooling/E2E/CI | PASS |
| No eval(), no raw SQL | PASS |
| Container least-privilege | PASS |
| Compose safety | PASS |
| ASVS 5.0 headers | PASS |
| **Status:** 7/7 PASS |

## 8. Financial Integrity
- Money/Decimal in authority: VERIFIED
- No float/parseFloat in pricing: VERIFIED
- FX single source: VERIFIED
- **Status:** VERIFIED

## 9. Booking Integrity
- Expired cannot be paid: VERIFIED
- Cancelled cannot be fulfilled: VERIFIED
- Unpaid cannot be marked paid: VERIFIED
- Failed supplier cannot be confirmed: VERIFIED
- Duplicate payment cannot create duplicate: VERIFIED
- **Status:** VERIFIED

## 10. Cart / Manifest / Voucher
- Voucher HMAC: VERIFIED
- Voucher expiration: VERIFIED (30-day)
- Voucher revocation: VERIFIED
- Booking binding: VERIFIED
- QR no PII: VERIFIED
- **Status:** VERIFIED


## 4. P0 Issues Found & Fixed

### AUTH-001: Synthetic Admin Identity
- **File:** src/auth.ts:635,644,725
- **Root Cause:** `admin_super_resilient` fabricated when DB unreachable → SUPER_ADMIN granted
- **Fix:** Fail closed (return null)
- **Test:** auth-bootstrap-hardening.test.ts

### AUTH-002: Hardcoded Admin Password + Identifier Escalation
- **Files:** src/auth.ts:125,582,701 | permission-service.ts:34,57,66,152,173
- **Root Cause:** `Admin@Firuzo2026!` fallback + identifier string granted SUPER_ADMIN
- **Fix:** `getAdminBootstrapPassword()` returns null in production; identifier is routing hint only
- **Test:** auth-bootstrap-hardening.test.ts

### AUTH-003: OTP Echo + In-Memory Fallback
- **Files:** src/auth.ts:351,283-288,413-432
- **Root Cause:** `devCode` returned when VERCEL env present (always true on Vercel); OTP stored in memory
- **Fix:** devCode demo-only; in-memory fallback demo-only

### AUTH-004: Password RTL Compensation
- **File:** src/auth.ts:762-774
- **Root Cause:** Accepted two spellings of every password
- **Fix:** Removed

### SEC-014: Hardcoded JWT/Voucher Secrets
- **Files:** VoucherService.ts:66,82 | telemetry/errors/route.ts:82 | PlannerGroundingService.ts:45
- **Root Cause:** Hardcoded fallbacks for HMAC/JWT secrets
- **Fix:** `resolveSigningSecret()` fails closed in production

### SEC-014b: Leaked SMS Credentials
- **Files:** 13 diagnostic scripts
- **Root Cause:** Real SMSWBS/Hupa credentials committed (`Hvd1367++@`, `09123764868`)
- **Fix:** Refactored to read from env; security-scan.mjs detects credential fallbacks

### SEC-014c: E2E Test Credentials
- **File:** tests/helpers/e2e-auth.ts:79
- **Root Cause:** Hardcoded fallback passwords
- **Fix:** Removed; env-only
