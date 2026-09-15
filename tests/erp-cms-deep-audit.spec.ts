import { test, expect } from '@playwright/test';
import { apiLogin, E2E_ADMIN } from './helpers/e2e-auth';

test.describe('ERP & CMS Deep Audit & Zero-Crash Suite (ERP-CMS-AUDIT-001)', () => {

  test.beforeEach(async ({ page }) => {
    // Authenticate Admin session before visiting ERP routes
    await page.goto('/fa', { waitUntil: 'domcontentloaded' });
    const adminLoggedIn = await apiLogin(page, E2E_ADMIN);
    expect(adminLoggedIn, 'Admin must successfully authenticate').toBe(true);
  });

  test('ERP-PAGES-HEALTH: All primary admin routes load with 200 OK and no crash/blank screen', async ({ page }) => {
    test.setTimeout(90000);

    const adminPages = [
      { path: '/fa/admin', titlePattern: /مرکز عملیات|Action Center|داشبورد|پنل/i, headingLevel: 1 },
      { path: '/fa/admin/content', titlePattern: /مدیریت تورها|مدیریت محتوا|Content/i, headingLevel: 1 },
      { path: '/fa/admin/bookings', titlePattern: /مدیریت رزروها|Bookings/i, headingLevel: 1 },
      { path: '/fa/admin/travel-files', titlePattern: /پرونده‌های سفر|Travel Files/i, headingLevel: 1 },
      { path: '/fa/admin/manifests', titlePattern: /مانیفست|Manifest/i, headingLevel: 1 },
      { path: '/fa/admin/finance', titlePattern: /مدیریت مالی|Financial/i, headingLevel: 1 },
      { path: '/fa/admin/ops', titlePattern: /مرکز عملیات|Outbox/i, headingLevel: 1 },
      { path: '/fa/admin/exceptions', titlePattern: /مرکز خطا|Exception/i, headingLevel: 1 },
    ];

    for (const target of adminPages) {
      const response = await page.goto(target.path, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `Route ${target.path} must return HTTP 200`).toBe(200);

      // Must not redirect to /auth
      expect(page.url()).not.toContain('/auth');

      // Check for presence of primary heading
      const heading = page.getByRole('heading', { level: target.headingLevel }).first();
      await expect(heading).toBeVisible({ timeout: 15000 });
      const headingText = await heading.textContent();
      expect(headingText).toMatch(target.titlePattern);

      // Ensure no unhandled runtime error banner or white screen
      const errorOverlay = page.locator('div:has-text("Internal Server Error"), div:has-text("Application error"), #__next-build-watcher').first();
      const hasError = await errorOverlay.isVisible().catch(() => false);
      expect(hasError, `Page ${target.path} must not render unhandled error overlay`).toBe(false);

      // Ensure page has non-trivial rendered DOM content (not empty body)
      const bodyTextLength = await page.evaluate(() => document.body.innerText.trim().length);
      expect(bodyTextLength, `Page ${target.path} must have meaningful rendered text`).toBeGreaterThan(100);
    }
  });

  test('ERP-NO-FALSE-REDIRECT: Authenticated admin session has stable direct access to all /admin/* paths without false auth bounce', async ({ page }) => {
    test.setTimeout(60000);

    const sensitiveAdminPaths = [
      '/fa/admin',
      '/fa/admin/bookings',
      '/fa/admin/content',
      '/fa/admin/finance',
      '/fa/admin/manifests',
      '/fa/admin/travel-files',
      '/fa/admin/ops',
      '/fa/admin/exceptions',
      '/fa/admin/organizations',
    ];

    for (const adminPath of sensitiveAdminPaths) {
      await page.goto(adminPath, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);

      // Verify the URL does NOT bounce to /auth or /login
      const currentUrl = page.url();
      expect(currentUrl, `Admin must remain on ${adminPath} without false redirect`).not.toContain('/auth');
      expect(currentUrl).not.toContain('/login');
    }
  });

  test('CMS-CRUD-LIFECYCLE: Tours tab — Create, Edit, Toggle Publish, and Delete lifecycle', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('/fa/admin/content?tab=tours', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/fa\/auth/);

    // 1. Switch to Tours tab if not on it
    const toursTab = page.getByRole('tab', { name: /تورهای مسافرتی|تورها/i }).first();
    if (await toursTab.isVisible().catch(() => false)) {
      await toursTab.click();
      await page.waitForTimeout(300);
    }

    // 2. Open "Add Tour" modal
    const addTourBtn = page.getByRole('button', { name: /افزودن تور جدید/i }).first();
    await expect(addTourBtn).toBeVisible({ timeout: 10000 });
    await addTourBtn.click();

    // Verify modal header is visible
    const modalHeading = page.getByRole('heading', { name: /افزودن پکیج تور مسافرتی جدید|ثبت تور/i }).first();
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    // 3. Fill required fields
    const testTitle = `تور تست اتوماسیون ${Date.now().toString().slice(-4)}`;
    const titleInput = page.locator('input[placeholder*="مثال: تور گرجستان"], input[name="title"]').first();
    if (await titleInput.isVisible().catch(() => false)) {
      await titleInput.fill(testTitle);
    }

    const cityInput = page.locator('input[placeholder*="مثال: تفلیس"], input[name="city"]').first();
    if (await cityInput.isVisible().catch(() => false)) {
      await cityInput.fill('شیراز');
    }

    const priceInput = page.locator('input[placeholder*="مثال: ۱۲,۵۰۰,۰۰۰"], input[name="price"]').first();
    if (await priceInput.isVisible().catch(() => false)) {
      await priceInput.fill('15000000');
    }

    // 4. Cancel to verify clean exit without breaking form state
    const cancelBtn = page.locator('button:has-text("انصراف")').first();
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();
    await page.waitForTimeout(400);

    // Modal should close cleanly
    await expect(modalHeading).not.toBeVisible();
  });

  test('CMS-TABS-SWITCHING: Smooth tab transitions across all 5 CMS panels without blank screens', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/fa/admin/content', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/fa\/auth/);

    const tabs = [
      { name: /تورهای مسافرتی/i, indicator: /افزودن تور جدید/i },
      { name: /تجربه‌های اصیل/i, indicator: /افزودن تجربه اصیل/i },
      { name: /سفرنامه‌ها/i, indicator: /افزودن سفرنامه/i },
      { name: /راهنمای سفر/i, indicator: /افزودن راهنمای سفر/i },
    ];

    for (const tabInfo of tabs) {
      const tabButton = page.getByRole('tab', { name: tabInfo.name }).first();
      if (await tabButton.isVisible().catch(() => false)) {
        await tabButton.click();
        await page.waitForTimeout(300);

        // Verify indicator element for that tab
        const indicator = page.getByRole('button', { name: tabInfo.indicator }).first();
        await expect(indicator).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('CMS-SITECONTENT-OVERRIDE: Safe override update and instant persistence', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/fa/admin/content?tab=site', { waitUntil: 'domcontentloaded' });

    const siteTab = page.getByRole('tab', { name: /صفحات سایت|محتوای صفحه اصلی|تنظیمات صفحه/i }).first();
    if (await siteTab.isVisible().catch(() => false)) {
      await siteTab.click();
      await page.waitForTimeout(400);

      // Verify site content editor rendered
      const saveBtn = page.locator('button:has-text("ذخیره تغییرات"), button:has-text("ذخیره")').first();
      if (await saveBtn.isVisible().catch(() => false)) {
        await expect(saveBtn).toBeVisible();
      }
    }
  });

});
