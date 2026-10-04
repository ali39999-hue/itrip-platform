import { test, expect } from '@playwright/test';
import { apiLogin, E2E_ADMIN } from './helpers/e2e-auth';

/**
 * T1304 — Firuzo Business (specialist Child) operator queue E2E.
 * Full operator journey: a guest-created request (public API, Phase-1 funnel)
 * must appear in the /admin/business queue for staff holding
 * `business:request:review`, and the queue must fail closed for anonymous
 * visitors (the ERP shell redirects them to the organizational sign-in).
 */
test.describe('Business Operator Queue — ERP Surface', () => {
  test('guest request surfaces in the operator queue with action affordances', async ({
    page,
    request,
  }) => {
    // 0. Seed one request through the public guest funnel (T0804 allows it).
    const pkgsRes = await request.get('/api/v1/business/packages');
    expect(pkgsRes.ok()).toBeTruthy();
    const pkgsBody = await pkgsRes.json();
    const pkg = (pkgsBody.data || [])[0];
    expect(pkg, 'at least one published package must exist').toBeTruthy();

    const detailRes = await request.get(`/api/v1/business/packages/${pkg.slug}`);
    expect(detailRes.ok()).toBeTruthy();
    const detailBody = await detailRes.json();
    const departure = (detailBody.data?.departures || [])[0];
    expect(departure, 'package must have an upcoming departure').toBeTruthy();

    const createRes = await request.post('/api/v1/business/requests', {
      data: {
        packageId: pkg.id,
        departureId: departure.id,
        paxCount: 1,
        companyName: `شرکت E2E اپراتور ${Date.now().toString(36)}`,
        nationalId: `1400${String(Date.now()).slice(-7)}`,
        repName: 'تستر E2E',
        repPhone: '09120000000',
      },
    });
    expect(createRes.status()).toBe(201);
    const createBody = await createRes.json();
    const createdCode: string = createBody.data?.code;
    expect(createdCode).toBeTruthy();

    // 1. Log in as the seeded admin (SUPER_ADMIN holds both business permissions).
    const loggedIn = await apiLogin(page, E2E_ADMIN);
    expect(loggedIn).toBe(true);

    // 2. The operator queue renders the new request.
    await page.goto('/fa/admin/business', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/fa\/auth/);
    await expect(
      page.getByRole('heading', { name: /درخواست‌های تور تخصصی/i })
    ).toBeVisible({ timeout: 15000 });

    const row = page.locator('tr', { hasText: createdCode });
    await expect(row).toBeVisible({ timeout: 10000 });

    // 3. Opening the detail panel exposes the operator actions (T1003).
    await row.getByRole('button', { name: 'جزئیات و اقدام' }).click();
    await expect(page.getByRole('button', { name: /تایید مدارک/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /درخواست اصلاح مدارک/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /اعمال یارانه/i })).toBeVisible();
  });

  test('anonymous visitor is redirected to the ERP organizational sign-in', async ({ page }) => {
    await page.goto('/fa/admin/business', { waitUntil: 'domcontentloaded' });
    // The admin layout guards the whole /admin tree before our page renders —
    // the ERP login screen is the expected fail-closed surface for anonymous users.
    await expect(
      page.getByRole('heading', { name: /ورود سازمانی و مدیریت ERP/i })
    ).toBeVisible({ timeout: 15000 });
  });
});
