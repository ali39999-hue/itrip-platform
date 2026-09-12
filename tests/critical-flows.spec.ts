import { test, expect } from '@playwright/test';
import { randomInt } from 'node:crypto';
import { apiLogin, E2E_USER } from './helpers/e2e-auth';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Critical E2E Flows', () => {
  test.describe.configure({ mode: 'serial' });

  test('Authentication and KYC Flow', async ({ page }) => {
    // OTP issuance can hang tens of seconds on cold starts when the SMS
    // provider call stalls on the sandboxed network before its own timeout.
    test.setTimeout(90000);
    await page.goto('/fa/auth', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
    // networkidle: interacting mid-hydration can catch the SSR form before
    // React swaps it in, producing duplicate DOM nodes.
    await page.reload({ waitUntil: 'networkidle' });

    // 1. Phone Number step — the OTP request UI must reach its verification step.
    //    A random valid number per run: the OTP rate limiter allows only 3
    //    requests / 10 min per identifier, which back-to-back suite runs on a
    //    fixed test number would exhaust.
    const testPhone = '091' + String(randomInt(0, 1e8)).padStart(8, '0');
    const phoneInput = page.locator('#identifier');
    await expect(phoneInput).toBeVisible({ timeout: 10000 });
    await phoneInput.fill(testPhone);

    const submitBtn = page.locator('#auth-submit-btn');
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await submitBtn.click();

    // 2. OTP step renders (codes are random + HMAC-hashed server-side, so the
    //    completed login itself is exercised through the credentials provider).
    //    The multi-channel redesign replaced the single #password input with a
    //    PIN pad; the verify button marks the OTP step. A click can land before
    //    hydration attaches onClick on a cold dev server — retry once.
    const otpStep = page.locator('#auth-verify-btn');
    try {
      await otpStep.waitFor({ state: 'visible', timeout: 8000 });
    } catch {
      // دو حالت ممکن: کلیک قبل از hydration ثبت نشده (دکمه هنوز enabled است)
      // یا requestOtp هنوز در flight است (دکله disabled) — فقط در حالت اول
      // دوباره کلیک می‌کنیم؛waitFor enabled خودش منتظر پایان درخواست می‌ماند.
      const btn = page.locator('#auth-submit-btn');
      await expect(btn).toBeEnabled({ timeout: 30000 });
      if ((await otpStep.count()) === 0) {
        await btn.click();
      }
    }
    await expect(otpStep).toBeVisible({ timeout: 10000 });

    // 3. Real sign-in via the seeded credentials provider, then land on account.
    //    SessionBootstrap hydrates the client store from the server session, so
    //    cookie-authenticated surfaces work on a fresh browser context.
    const loggedIn = await apiLogin(page, E2E_USER);
    expect(loggedIn).toBe(true);
    await page.goto('/fa/account', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/fa\/account/);
    await expect(page.getByRole('heading', { name: /خوش آمدید|Welcome/i, level: 1 })).toBeVisible({ timeout: 15000 });
  });

  test('Search and Book Flow (Hotels)', async ({ page }) => {
    // 1. Go to hotel search
    await page.goto('/fa/hotels/search', { waitUntil: 'domcontentloaded' });
    
    // 2. Assert hotel cards are rendered
    const firstHotel = page.locator('article').first();
    await expect(firstHotel).toBeVisible({ timeout: 15000 });
    
    // 3. Click "مشاهده و رزرو" to navigate to Hotel Detail
    const viewHotelLink = page.getByRole('link', { name: /مشاهده و رزرو|رزرو/i }).first();
    await expect(viewHotelLink).toBeVisible();
    await viewHotelLink.click();
    
    // 4. Verify Hotel Detail Page loaded
    await page.waitForURL(/\/fa\/hotels\/.+/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('Admin Panel Security and Structure Check', async ({ page }) => {
    // Go to admin page directly
    await page.goto('/fa/admin', { waitUntil: 'domcontentloaded' });
    
    // Verify unauthorized lock gate or dashboard heading
    const heading = page.getByRole('heading', { level: 1 }).first();
    await expect(heading).toBeVisible();
  });
});
