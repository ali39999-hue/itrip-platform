import { test, expect } from '@playwright/test';
import { apiLogin, E2E_USER } from './helpers/e2e-auth';

test.describe('Tours Booking & Checkout Journey', () => {
  test('Tour detail -> configure travelers & dates -> checkout -> create draft without errors', async ({ page }) => {
    test.setTimeout(60000);

    // 1. Authenticate user so checkout has an authenticated session
    await page.goto('/fa/auth', { waitUntil: 'domcontentloaded' });
    const loggedIn = await apiLogin(page, E2E_USER);
    expect(loggedIn).toBe(true);

    // 2. Open tour detail page (t1)
    await page.goto('/fa/tours/t1', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

    // 3. Click visible booking CTA (handles both desktop card and mobile sticky bar)
    const bookBtn = page.locator('button:has-text("رزرو"):visible').first();
    await expect(bookBtn).toBeVisible({ timeout: 10000 });
    await bookBtn.click();

    // 4. Arrive at checkout page
    await page.waitForURL(/\/fa\/checkout/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/fa\/checkout/);

    // 5. Fill passenger form via OCR scan button
    const scanBtn = page.locator('button:has-text("اسکن هوشمند پاسپورت")').first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();
    await page.waitForTimeout(2200);

    // 6. Submit passenger details to create draft
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await submitBtn.click();

    // 7. Verification: Phase must transition to payment successfully
    const paymentView = page.locator('h2:has-text("روش"), h2:has-text("پرداخت"), h3:has-text("محاسبات")').first();
    await expect(paymentView).toBeVisible({ timeout: 20000 });
  });

  test('Tours listing page -> click book on card -> checkout succeeds', async ({ page }) => {
    test.setTimeout(60000);

    // 1. Authenticate user
    await page.goto('/fa/auth', { waitUntil: 'domcontentloaded' });
    const loggedIn = await apiLogin(page, E2E_USER);
    expect(loggedIn).toBe(true);

    // 2. Open tours catalog
    await page.goto('/fa/tours', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 });

    // 3. Click book button on the first tour card
    const firstTourBookBtn = page.locator('button:has-text("رزرو تور"):visible').first();
    await expect(firstTourBookBtn).toBeVisible({ timeout: 10000 });
    await firstTourBookBtn.click();

    // 4. Arrive at checkout page
    await page.waitForURL(/\/fa\/checkout/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/fa\/checkout/);

    // 5. Fill passenger details via OCR scan
    const scanBtn = page.locator('button:has-text("اسکن هوشمند پاسپورت")').first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();
    await page.waitForTimeout(2200);

    // 6. Submit and verify payment phase is reached
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    const paymentView = page.locator('h2:has-text("روش"), h2:has-text("پرداخت"), h3:has-text("محاسبات")').first();
    await expect(paymentView).toBeVisible({ timeout: 20000 });
  });
});
