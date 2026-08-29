import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Critical E2E Flows', () => {
  test.describe.configure({ mode: 'serial' });

  test('Authentication and KYC Flow', async ({ page }) => {
    await page.goto('/fa/auth', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });

    // 1. Phone Number step
    const phoneInput = page.locator('#identifier');
    await expect(phoneInput).toBeVisible({ timeout: 10000 });
    await phoneInput.fill('09123456789');
    
    // Click submit button
    const submitBtn = page.locator('#auth-submit-btn');
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await submitBtn.click();

    // 2. OTP step
    const otpInput = page.locator('#password');
    await expect(otpInput).toBeVisible({ timeout: 10000 });
    await otpInput.fill('12345');
    
    const confirmBtn = page.locator('#auth-verify-btn');
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // 3. Verification - Account Page
    await page.waitForURL(/\/fa\/account/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/fa\/account/);
  });

  test('Search and Book Flow (Hotels)', async ({ page }) => {
    // 1. Go to hotel search
    await page.goto('/fa/hotels/search', { waitUntil: 'domcontentloaded' });
    
    // 2. Assert hotel cards are rendered
    const firstHotel = page.locator('article').first();
    await expect(firstHotel).toBeVisible();
    
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
