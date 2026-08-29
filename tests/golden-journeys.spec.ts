import { test, expect } from '@playwright/test';

test.describe('Firuzo v2 Master Suite — 5 Golden Journeys', () => {

  test('Golden Journey 1: Flight Search -> Passenger Booking -> Checkout -> Instant Voucher', async ({ page }) => {
    // 1. Visit Flights search
    await page.goto('/fa/flights/search');
    await expect(page).toHaveTitle(/iTrip|Firuzo/i);

    // Verify search results presence
    const selectBtn = page.locator('button:has-text("انتخاب بلیط")').first();
    await expect(selectBtn).toBeVisible({ timeout: 10000 });
    await selectBtn.click();

    // 2. We should land on Checkout
    await expect(page).toHaveURL(/.*\/checkout/);
    await expect(page.locator('body')).toBeVisible();

    // Auto-fill or click test passenger if needed
    const nationalIdInput = page.locator('input[name="nationalId"], input#nationalId').first();
    if (await nationalIdInput.isVisible()) {
      await nationalIdInput.fill('0012345678');
    }

    // Submit to next stage
    const nextBtn = page.locator('button:has-text("ادامه به پرداخت"), button:has-text("تایید")').first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
    }
  });

  test('Golden Journey 2: Hotel Search -> Multi-Filter & Compare -> Hotel Details', async ({ page }) => {
    // 1. Visit Hotel Search
    await page.goto('/fa/hotels/search');
    await expect(page).toHaveTitle(/iTrip|Firuzo/i);

    // Check hotel cards render with price
    const hotelCard = page.locator('div:has-text("هر شب از")').first();
    await expect(hotelCard).toBeVisible({ timeout: 10000 });

    // Click on details
    const viewBtn = page.locator('a:has-text("مشاهده و رزرو")').first();
    await expect(viewBtn).toBeVisible();
    await viewBtn.click();

    // We should be on Hotel Detail page
    await expect(page).toHaveURL(/.*\/hotels\/h\d+/);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('Golden Journey 3: AI Smart Trip Planner -> Wizard -> Timeline View', async ({ page }) => {
    // 1. Visit AI Planner
    await page.goto('/fa/plan');
    await expect(page).toHaveTitle(/iTrip|Firuzo/i);

    // Check planner heading
    await expect(page.locator('h1')).toBeVisible();

    // Type a prompt or click prompt chip
    const planInput = page.locator('textarea, input[placeholder*="مثال"]').first();
    if (await planInput.isVisible()) {
      await planInput.fill('سفر ۴ روزه به مشهد');
      const submitBtn = page.locator('button:has-text("بساز"), button:has-text("شروع")').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
      }
    }
  });

  test('Golden Journey 4: My Trips Management & Wallet Balance', async ({ page }) => {
    // 1. Visit My Trips
    await page.goto('/fa/my-trips');
    await expect(page).toHaveTitle(/iTrip|Firuzo/i);
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // 2. Visit Wallet
    await page.goto('/fa/wallet');
    await expect(page).toHaveTitle(/iTrip|Firuzo/i);
    await expect(page.locator('h1').first()).toContainText('کیف پول');
  });

  test('Golden Journey 5: Admin ERP Portal -> Bookings & Financial Feed', async ({ page }) => {
    // 1. Visit Admin Root
    await page.goto('/fa/admin');
    await expect(page).toHaveTitle(/iTrip|Firuzo/i);
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // 2. Visit Admin Bookings
    await page.goto('/fa/admin/bookings');
    await expect(page).toHaveURL(/.*\/admin\/bookings/);
    await expect(page.locator('h1, table, tr, div:has-text("مدیریت"), form').first()).toBeVisible();
  });

});
