# FIRUZO CHILD — RELEASE & PRODUCTION DEPLOYMENT PLAN

**Authority:** Section 42 of Master Roadmap  
**Status:** Canonical Release & Deployment Contract  

---

## 1. Release Checklist

Before any production release, the following checklist must be completed:

- [ ] **Clean Git State:** `git status` shows no uncommitted changes.
- [ ] **Version Updated:** `package.json` version incremented (e.g., `1.8.7` → `1.8.8`).
- [ ] **Changelog Updated:** `CHANGELOG.md` updated with release notes.
- [ ] **Migration Tested:** `prisma migrate deploy` tested on staging database.
- [ ] **Build Passes:** `npm run build` completes without errors.
- [ ] **Lint Passes:** `npm run lint` returns 0 warnings and 0 errors.
- [ ] **Typecheck Passes:** `npm run typecheck` returns 0 errors.
- **Unit Tests Pass:** `npm run test:unit` returns 100% pass rate.
- **Integration Tests Pass:** `npx vitest run src/app/api/v1/business src/domains/business/core` returns 100% pass rate.
- **Contract Tests Pass:** `npx vitest run src/domains/business/core/firuzo-core-client.test.ts` returns 100% pass rate.
- **E2E Tests Pass:** `npx playwright test` passes on desktop and mobile viewports.
- **Mobile Smoke Test:** Manual verification of critical flows on iPhone 14 and Pixel 7.
- **Accessibility Passes:** `npm run gate:a11y` returns 0 violations.
- **Security Checks Pass:** `npm run security:scan` returns 0 critical vulnerabilities.
- **Production Config Verified:** Environment variables set correctly in production.
- **Monitoring Active:** Grafana dashboards and PagerDuty alerts configured.
- **Rollback Tested:** Rollback procedure verified on staging.
- **Post-Deploy Smoke Test:** Critical flows verified in production within 15 minutes of deployment.

---

## 2. Deployment Strategy

### 2.1 Environment Separation
- **Development:** Local Next.js dev server with hot reload.
- **Staging:** Docker containerized environment with production-like configuration.
- **Production:** Kubernetes cluster with multi-stage Docker builds.

### 2.2 Deployment Process
1. **Build:** `docker build -t firuzo-child:latest .`
2. **Push:** `docker push registry.firuzo.com/firuzo-child:latest`
3. **Deploy:** `kubectl apply -f k8s/deployment.yaml`
4. **Migrate:** `kubectl exec -it <pod> -- npx prisma migrate deploy`
5. **Verify:** Run smoke tests against production endpoints.

### 2.3 Rollback Procedure
1. **Identify:** Determine last stable version from `git log`.
2. **Rollback:** `kubectl rollout undo deployment/firuzo-child`
3. **Verify:** Run smoke tests to confirm rollback success.
4. **Investigate:** Root cause analysis within 24 hours.

---

## 3. Production Verification

### 3.1 Smoke Tests
- **Test 1:** `GET /fa/business` returns 200 OK with package list.
- **Test 2:** `GET /fa/business/tours/china-canton-fair-tech-2026` returns 200 OK with tour details.
- **Test 3:** `POST /api/v1/business/requests` creates draft request with 48h hold.
- **Test 4:** `POST /api/v1/business/requests/:id/submit` transitions to `submitted`.
- **Test 5:** `POST /api/v1/business/payments/callback` verifies HMAC and transitions to `deposit_paid`.

### 3.2 Monitoring & Alerting
- **Dashboard:** Grafana dashboard for booking success rate, payment failure rate, API latency.
- **Alerts:** PagerDuty alerts for critical errors (payment failure rate > 5%, API error rate > 1%).
- **Logs:** Structured JSON logs with correlation IDs in Elasticsearch.

---

## 4. Post-Release Audit

### 4.1 Metrics to Track
- **Booking Success Rate:** Target > 95%.
- **Payment Success Rate:** Target > 98%.
- **API Error Rate:** Target < 0.1%.
- **User Satisfaction:** Post-trip survey score > 4.5/5.

### 4.2 Incident Response
- **Critical Incident:** Payment gateway down → Immediate rollback, notify users, investigate root cause.
- **High Incident:** API error rate spike → Investigate logs, apply hotfix, deploy within 1 hour.
- **Medium Incident:** Non-critical bug → Schedule fix for next release.

---

## 5. Release Notes Template

```markdown
## Version 1.8.8 (2026-10-02)

### Added
- New specialist tour package: "China Canton Fair Tech 2026".
- Enhanced mobile UX with sticky bottom action bar.

### Fixed
- Payment callback idempotency issue resolved.
- RTL typography clipping on Persian text fixed.

### Changed
- Updated pricing engine to use integer Rials only.
- Improved error messages for capacity full scenarios.

### Security
- Added HMAC verification for all payment callbacks.
- Updated dependencies to patch CVE-2026-1234.
```
