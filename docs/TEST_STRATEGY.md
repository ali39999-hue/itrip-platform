# FIRUZO CHILD — TESTING STRATEGY & QUALITY ENGINEERING CONTRACT

**Authority:** Section 23 of Master Roadmap  
**Status:** Canonical Testing & Quality Contract  

---

## 1. Testing Pyramid & Coverage Targets

### 1.1 Unit Tests (70% of Test Suite)
- **Focus:** Business rules, pricing logic, state machine transitions, validation schemas, permission checks, data transformations.
- **Coverage Target:** 100% of domain logic in `src/domains/business/**`.
- **Framework:** Vitest with TypeScript.
- **Files:** `src/domains/business/*.test.ts`, `src/domains/business/core/*.test.ts`, `src/lib/observability/*.test.ts`.
- **Execution:** `npm run test:unit` (runs all unit tests in parallel).

### 1.2 Integration Tests (20% of Test Suite)
- **Focus:** Database interactions, payment adapter callbacks, Firuzo Core contract adapters, event outbox handling, notification adapter.
- **Coverage Target:** All API routes and database transactions.
- **Framework:** Vitest with Prisma test database (`itrip_test`).
- **Files:** `src/app/api/v1/business/*.test.ts`, `src/domains/business/core/*.test.ts`.
- **Execution:** `npx vitest run src/app/api/v1/business src/domains/business/core`.

### 1.3 Contract Tests (5% of Test Suite)
- **Focus:** Versioned API contracts between Child and Firuzo Core (`FiruzoCoreClient` interface).
- **Coverage Target:** All methods in `FiruzoCoreClient` interface.
- **Framework:** Vitest with mocked Core responses.
- **Files:** `src/domains/business/core/firuzo-core-client.test.ts`.
- **Execution:** `npx vitest run src/domains/business/core/firuzo-core-client.test.ts`.

### 1.4 E2E Tests (5% of Test Suite)
- **Focus:** Critical user journeys (Discovery → Booking → Payment → Voucher), mobile responsiveness, accessibility.
- **Coverage Target:** All 7 frontend routes and 13 API endpoints.
- **Framework:** Playwright with Chromium, Firefox, WebKit.
- **Files:** `tests/business-technology-tour.spec.ts`.
- **Execution:** `npx playwright test tests/business-technology-tour.spec.ts`.

---

## 2. Automated Quality Gates

### 2.1 CI Pipeline Gates
1. **Typecheck:** `npm run typecheck` — 0 TypeScript errors.
2. **Lint:** `npm run lint` — 0 ESLint warnings and errors.
3. **Unit Tests:** `npm run test:unit` — 100% pass rate.
4. **Integration Tests:** `npx vitest run src/app/api/v1/business src/domains/business/core` — 100% pass rate.
5. **E2E Tests:** `npx playwright test` — All critical flows pass on desktop and mobile viewports.
6. **Security Scan:** `npm run security:scan` — 0 critical vulnerabilities.
7. **Accessibility:** `npm run gate:a11y` — WCAG 2.2 AA compliance.
8. **i18n Completeness:** `npm run gate:i18n` — All user-visible strings translated in 5 locales.

### 2.2 Pre-Commit Hooks
- **Husky + lint-staged:** Runs `npm run lint` and `npm run typecheck` on staged files before commit.
- **Pre-push Hook:** Runs `npm run test:unit` before pushing to remote.

---

## 3. Test Data & Fixtures

### 3.1 Seed Data
- **Script:** `scripts/seed-business.ts` — Seeds 3 sample packages, 5 departures, 2 addons, 1 company.
- **Execution:** `npm run prisma:seed`.
- **Purpose:** Local development and E2E test setup.

### 3.2 Test Fixtures
- **Location:** `src/domains/business/__fixtures__/` — JSON fixtures for package, departure, request, traveler, payment.
- **Usage:** Vitest tests import fixtures for deterministic test data.
- **Cleanup:** Tests use `beforeEach` to reset database state with `prisma.businessRequest.deleteMany()`.

---

## 4. Visual Regression & Accessibility

### 4.1 Visual Regression
- **Tool:** Playwright with `toHaveScreenshot()` assertions.
- **Coverage:** Homepage, tour detail, request form, deposit page, voucher page.
- **Baseline:** Screenshots stored in `tests/__screenshots__/`.
- **Execution:** `npx playwright test --update-snapshots` to update baselines.

### 4.2 Accessibility Testing
- **Tool:** `@axe-core/playwright` integrated into Playwright tests.
- **Coverage:** All interactive elements, form labels, contrast ratios, keyboard navigation.
- **Execution:** `npm run gate:a11y` runs axe-core checks on all pages.

---

## 5. Performance & Load Testing

### 5.1 Performance Budgets
- **Initial JS:** < 150KB gzipped for business routes.
- **Image Weight:** < 500KB total per page.
- **API Latency:** < 200ms for catalog queries, < 500ms for payment intents.
- **Search Response:** < 100ms for package listing.

### 5.2 Load Testing
- **Tool:** k6 or Artillery for API load testing.
- **Scenarios:** 100 concurrent users creating requests, 50 concurrent payment callbacks.
- **Execution:** `npm run benchmark:search` for search performance.

---

## 6. Test Reporting & Observability

- **Coverage Report:** `npm run test:unit -- --coverage` generates HTML coverage report.
- **Test Results:** Vitest outputs JUnit XML for CI integration.
- **E2E Reports:** Playwright generates HTML report with screenshots and traces.
- **Metrics:** Test execution time, flaky test rate, coverage percentage tracked in Grafana.
