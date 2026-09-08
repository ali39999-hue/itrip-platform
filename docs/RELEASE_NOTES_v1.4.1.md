# iTrip / Firuzo Platform Release Notes — v1.4.1

**Release Tag:** `v1.4.1`  
**Release Date:** 2026-09-07  
**Target Environment:** Node.js 22+ / PostgreSQL 16 / Next.js 16.3 (App Router) / React 19  
**Previous Release:** `v1.4.0` (`5325fb6`)  

---

## 🚀 Key Highlights & What's New

### 1. CI/CD & Runtime Environment Modernization
- **Node.js 22 LTS Alignment:** Upgraded GitHub Actions runtime across all workflow gates (`Production Gate CI`, `Enterprise Release Full-Test Gate`, `PR Smoke Gate`) from Node 20 to Node 22. This eliminates the `TypeError: webidl.util.markAsUncloneable is not a function` error under `jsdom@30.0.1` and `undici`.
- **Database Credential Synchronization:** Aligned PostgreSQL test container authentication credentials (`itrip_secure_password`) across all CI workflow jobs, ensuring zero authentication drift in automated pipeline runs.
- **Next.js 16 Config Guard:** Removed deprecated `eslint` field from `next.config.ts` to maintain strict compatibility and type safety with Next.js 16.3 and Turbopack.

### 2. Security & Secrets Management
- **Gitleaks Allowlist & Secret Sanitization:** Configured `.gitleaks.toml` allowlist rules for verified test fixtures and sanitized dummy authentication tokens in CI test pipelines.
- **Dependency & Vulnerability Audit:** Verified zero critical or high severity vulnerabilities across all production dependencies.

### 3. Feature Reality Matrix & Documentation
- **Dynamic Version Introspection:** Updated `scripts/generate-reality-matrix.mjs` to dynamically resolve versioning directly from `package.json`, ensuring consistency across release artifacts.
- **Automated Matrix Regeneration:** Regenerated `FEATURE_REALITY_MATRIX.md` against HEAD `v1.4.1`.

---

## 🧪 Quality Assurance & Gates Passed

| Gate | Status | Command / Details |
|---|---|---|
| **ESLint Architecture Guardrails** | ✓ PASS | `npm run lint` (0 errors) |
| **Strict TypeScript Compilation** | ✓ PASS | `npm run typecheck` (0 errors) |
| **I18N Completeness (5 Locales)** | ✓ PASS | `node scripts/i18n-completeness-gate.mjs` (844 keys, 100% parity) |
| **Security Vulnerability Scan** | ✓ PASS | `node scripts/security-scan.mjs` (0 critical / high) |
| **Feature Reality Matrix** | ✓ PASS | `node scripts/generate-reality-matrix.mjs` |
