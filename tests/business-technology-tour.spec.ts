import { test, expect } from '@playwright/test';
import { apiLogin, E2E_ADMIN } from './helpers/e2e-auth';

test.describe('Business Technology Tour — End-to-End Verification Suite', () => {
  test.describe.configure({ mode: 'serial' });

  test('Scenario 1: Happy Path — Complete Technology Tour Journey to Issued Voucher', async ({
    page,
    request,
  }) => {
    test.setTimeout(90000);

    // 1. Visit /fa/business
    await page.goto('/fa/business', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/fa\/business/);

    // Verify Business Landing hero elements
    const heroTitle = page.locator('h1.fz-hero__title');
    await expect(heroTitle).toBeVisible({ timeout: 10000 });

    // GoalWheel interaction: pick first available goal / cta
    const ctaLink = page.locator('a.fz-btn--action, a.fz-btn--brand').first();
    await expect(ctaLink).toBeVisible();
    await ctaLink.click();

    // 2. Arrive at tour package details page (/fa/business/tours/[slug])
    await expect(page).toHaveURL(/\/fa\/business\/tours\/[\w-]+/, { timeout: 15000 });
    await expect(page.locator('h1')).toBeVisible();

    // Select departure date
    const departureButton = page.locator('button.fz-option, button[role="radio"]').first();
    await expect(departureButton).toBeVisible({ timeout: 10000 });
    await departureButton.click();

    // Click submit CTA on package detail page
    const tourSubmitBtn = page.locator('button[type="submit"].fz-btn--action, button:has-text("ثبت درخواست و ادامه")').first();
    await expect(tourSubmitBtn).toBeVisible({ timeout: 5000 });
    await tourSubmitBtn.click();

    // 3. Arrive at request form page (/fa/business/requests/new)
    await expect(page).toHaveURL(/\/fa\/business\/requests\/new/, { timeout: 15000 });
    await expect(page.locator('h1')).toBeVisible();

    // Fill Company Info
    await page.locator('#company-name').fill('شرکت بین‌المللی نوآوران پیشرو');
    await page.locator('#company-nationalId').fill('14008765432');
    await page.locator('#company-repName').fill('مهندس علی رضایی');
    await page.locator('#company-repPhone').fill('09121112233');

    // Ensure 2 travelers exist
    const travelerRows = page.locator('.fz-card--sub');
    let count = await travelerRows.count();
    if (count < 2) {
      const addTravelerBtn = page.locator('button:has-text("افزودن مسافر")');
      if (await addTravelerBtn.isVisible()) {
        await addTravelerBtn.click();
      }
    }

    // Fill Traveler 1
    const tr0Name = page.locator('#tr-0-name');
    await expect(tr0Name).toBeVisible({ timeout: 5000 });
    await tr0Name.fill('Ali Rezaei');
    await page.locator('#tr-0-passport').fill('A12345678');
    await page.locator('#tr-0-expiry').fill('2029-11-20');

    // Fill Traveler 2
    const tr1Name = page.locator('#tr-1-name');
    if (await tr1Name.isVisible()) {
      await tr1Name.fill('Mohammad Mohammadi');
      await page.locator('#tr-1-passport').fill('B87654321');
      await page.locator('#tr-1-expiry').fill('2029-11-20');
    }

    // Accept Terms & Conditions
    const termsCheckbox = page.locator('input[type="checkbox"]').first();
    await termsCheckbox.check();

    // Submit Request to proceed to deposit
    const formSubmitBtn = page.locator('button.fz-btn--action:has-text("ثبت و رفتن به پیش‌پرداخت"), button.fz-btn--action').first();
    await expect(formSubmitBtn).toBeEnabled({ timeout: 5000 });
    await formSubmitBtn.click();

    // 4. Arrive at deposit page (/fa/business/requests/[id]/deposit)
    await expect(page).toHaveURL(/\/fa\/business\/requests\/[^/]+\/deposit/, { timeout: 20000 });
    const depositUrl = page.url();
    const requestIdMatch = depositUrl.match(/\/requests\/([^/]+)\/deposit/);
    expect(requestIdMatch).toBeTruthy();
    const requestId = requestIdMatch![1];

    // Pay Deposit
    const payDepositBtn = page.locator('button.fz-btn--action:has-text("پرداخت پیش‌پرداخت"), button.fz-btn--action').first();
    await expect(payDepositBtn).toBeVisible({ timeout: 10000 });
    await payDepositBtn.click();

    // 5. Arrive at Status Tracking page (/fa/business/requests/[id])
    await expect(page).toHaveURL(new RegExp(`/fa/business/requests/${requestId}$`), { timeout: 20000 });
    await expect(page.locator('.fz-status-tag, .fz-timeline, h1, h2').first()).toBeVisible({ timeout: 10000 });

    // 6. Review approval via the official operator endpoint. SEC-P0: the
    // endpoint is permission-guarded, so the reviewer signs in first and the
    // call rides the browser session cookie (page.request, not the bare
    // APIRequestContext fixture).
    const loggedIn = await apiLogin(page, E2E_ADMIN);
    expect(loggedIn).toBe(true);
    // The CSRF middleware requires an Origin on cookie-carrying state-changing
    // requests — a real browser always sends one; the bare API context does not.
    const reviewRes = await page.request.post(`/api/v1/business/requests/${requestId}/review`, {
      data: { decision: 'approve', note: 'Approved in E2E automated test' },
      headers: { Origin: 'http://localhost:3000' },
    });
    expect(reviewRes.ok()).toBe(true);

    // 7. Proceed to settlement page (/fa/business/requests/[id]/settlement)
    await page.goto(`/fa/business/requests/${requestId}/settlement`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(`/fa/business/requests/${requestId}/settlement`), { timeout: 15000 });

    // Complete final settlement payment
    const paySettlementBtn = page.locator('button.fz-btn--action:has-text("پرداخت و نهایی‌سازی رزرو"), button.fz-btn--action').first();
    await expect(paySettlementBtn).toBeVisible({ timeout: 10000 });
    await paySettlementBtn.click();

    // 8. Arrive at Voucher page (/fa/business/requests/[id]/voucher)
    await expect(page).toHaveURL(new RegExp(`/fa/business/requests/${requestId}/voucher`), { timeout: 20000 });

    // Verify Voucher Card, QR code, and Travelers
    const voucherCard = page.locator('.fz-voucher');
    await expect(voucherCard).toBeVisible({ timeout: 15000 });
    const qrElement = page.locator('.fz-voucher__qr, svg, canvas').first();
    await expect(qrElement).toBeVisible();
    await expect(page.locator('.fz-voucher__code').first()).toBeVisible();
  });

  test('Scenario 2: Invalid Transition Guard — direct URL access to /settlement fails before approval', async ({
    page,
    request,
  }) => {
    // 1. Create a fresh draft request via API
    const pkgsRes = await request.get('/api/v1/business/packages');
    const pkgsJson = await pkgsRes.json();
    const pkg = pkgsJson.data?.[0];
    expect(pkg).toBeTruthy();

    const pkgDetailRes = await request.get(`/api/v1/business/packages/${pkg.slug}`);
    const pkgDetailJson = await pkgDetailRes.json();
    const departure = pkgDetailJson.data?.departures?.[0];
    expect(departure).toBeTruthy();

    const createRes = await request.post('/api/v1/business/requests', {
      data: {
        packageId: pkg.id,
        departureId: departure.id,
        paxCount: 1,
        companyName: 'شرکت تست گارد ترنزیشن',
        nationalId: '14009999999',
        repName: 'نماینده تست',
        repPhone: '09120000000',
      },
    });
    const createJson = await createRes.json();
    const unapprovedReqId = createJson.data?.id;
    expect(unapprovedReqId).toBeTruthy();

    // 2. Direct attempt to open /settlement URL without approval
    await page.goto(`/fa/business/requests/${unapprovedReqId}/settlement`, { waitUntil: 'domcontentloaded' });

    // Guard rule: client redirects back to /business/requests/[id]
    await expect(page).toHaveURL(new RegExp(`/fa/business/requests/${unapprovedReqId}$`), { timeout: 10000 });
  });

  test('Scenario 3: Mobile Responsiveness — 375x812 viewport with zero horizontal overflow', async ({
    page,
  }) => {
    // Mobile Viewport (iPhone / compact device)
    await page.setViewportSize({ width: 375, height: 812 });

    // Verify Business Home Page
    await page.goto('/fa/business', { waitUntil: 'domcontentloaded' });
    const homeOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(homeOverflow).toBe(false);

    // Verify Package Details Page
    await page.goto('/fa/business/tours/canton-fair', { waitUntil: 'domcontentloaded' });
    const tourOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(tourOverflow).toBe(false);

    // Verify Request Stepper is rendered
    const stepper = page.locator('.fz-stepper');
    await expect(stepper).toBeVisible({ timeout: 10000 });
  });
});
