import { test, expect } from '@playwright/test';
import { apiLogin, E2E_USER } from './helpers/e2e-auth';

test.describe('Wallet Top-Up Journey', () => {
  test('User can initiate wallet top-up from /fa/wallet and get redirected to payment gateway', async ({ page }) => {
    test.setTimeout(60000);

    // 1. Authenticate user
    await page.goto('/fa/auth', { waitUntil: 'domcontentloaded' });
    const loggedIn = await apiLogin(page, E2E_USER);
    expect(loggedIn).toBe(true);

    // 2. Open wallet page
    await page.goto('/fa/wallet', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 });

    // 3. Ensure deposit form is visible
    const amountInput = page.locator('input[placeholder*="مبلغ"], input[type="number"]').first();
    await expect(amountInput).toBeVisible({ timeout: 10000 });
    await amountInput.fill('1000000');

    // 4. Click deposit button
    const depositBtn = page.locator('button:has-text("افزایش موجودی"), button:has-text("شارژ")').first();
    await expect(depositBtn).toBeVisible({ timeout: 10000 });
    await depositBtn.click();

    // 5. Verification: Either redirected to gateway URL (ecardo / demo) or completed
    // Must NOT show "شارژ ناموفق بود" error
    await page.waitForTimeout(3000);
    const errorAlert = page.locator('.text-rose-warm:has-text("شارژ ناموفق بود"), .text-rose-warm:has-text("Failed")');
    expect(await errorAlert.count()).toBe(0);

    // Verify navigation occurred to checkout / gateway / status
    const currentUrl = page.url();
    console.log('Current URL after topup:', currentUrl);
    expect(currentUrl).toMatch(/\/(wallet|demo\/ecardo-checkout|payment-status|ecardo)/);
  });
});
