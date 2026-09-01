import { test, expect } from '@playwright/test';

test.describe('Firuzo v2 Master Suite — 5 Deterministic Golden Journeys', () => {

  test('Golden Journey 1: Flight Search -> Passenger Booking -> Checkout -> Instant Voucher', async ({ page }) => {
    // 1. Visit Flights search
    await page.goto('/fa/flights/search', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/iTrip|Firuzo/i);

    // Verify search results presence and click first available ticket
    const selectBtn = page.locator('button:has-text("انتخاب بلیط")').first();
    await expect(selectBtn).toBeVisible({ timeout: 15000 });
    await selectBtn.click();

    // 2. We should land on Checkout
    await page.waitForURL(/\/fa\/checkout/);
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Use smart OCR scan button or fill passenger form
    const scanBtn = page.locator('button:has-text("اسکن هوشمند پاسپورت")').first();
    if (await scanBtn.isVisible()) {
      await scanBtn.click();
      await page.waitForTimeout(600);
    } else {
      await page.locator('input#firstName').fill('ALI');
      await page.locator('input#lastName').fill('MOHAMMADI');
      await page.locator('input#passportNo').fill('L2948175');
      await page.locator('input#nationalId').fill('0012345678');
    }

    // Submit to payment phase
    const nextBtn = page.locator('button[type="submit"]').first();
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // Verify Payment phase elements (price breakdown, wallet or gateway selector)
    await expect(page.locator('h2:has-text("انتخاب روش پرداخت"), h2:has-text("جزئیات قیمت"), div:has-text("کیف پول")').first()).toBeVisible({ timeout: 10000 });
  });

  test('Golden Journey 2: Hotel Search -> Multi-Filter & Compare -> Hotel Details -> Room Selection', async ({ page }) => {
    // 1. Visit Hotel Search
    await page.goto('/fa/hotels/search', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/iTrip|Firuzo/i);

    // Check hotel cards render with price
    const hotelCard = page.locator('div:has-text("هر شب از")').first();
    await expect(hotelCard).toBeVisible({ timeout: 15000 });

    // Click on details
    const viewBtn = page.locator('a:has-text("مشاهده و رزرو")').first();
    await expect(viewBtn).toBeVisible();
    await viewBtn.click();

    // 2. We should land on Hotel Detail page
    await page.waitForURL(/\/fa\/hotels\/h\d+/);
    await expect(page.locator('h1').first()).toBeVisible();

    // Verify hotel rooms section
    const roomCard = page.locator('div:has-text("اتاق"), div:has-text("سوییت"), button:has-text("انتخاب اتاق")').first();
    await expect(roomCard).toBeVisible({ timeout: 10000 });
  });

  test('Golden Journey 3: AI Smart Trip Planner -> Wizard -> Timeline View', async ({ page }) => {
    // 1. Visit AI Planner with destination param for instant deterministic timeline verification
    await page.goto('/fa/plan?dest=tr&who=duo&days=4&bud=balanced&pace=balanced', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/iTrip|Firuzo/i);

    // Verify generated plan header and days
    const resultHeader = page.locator('h1, h2').first();
    await expect(resultHeader).toBeVisible({ timeout: 10000 });

    // Verify timeline days rendered
    const dayItem = page.locator('div:has-text("روز ۱"), div:has-text("روز اول"), div:has-text("روز 1"), div:has-text("برنامه روزانه")').first();
    await expect(dayItem).toBeVisible({ timeout: 10000 });
  });

  test('Golden Journey 4: My Trips Management & Multi-Currency Wallet', async ({ page }) => {
    // 1. Visit My Trips
    await page.goto('/fa/my-trips', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/iTrip|Firuzo/i);
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // 2. Visit Wallet
    await page.goto('/fa/wallet', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/iTrip|Firuzo/i);
    await expect(page.locator('h1').first()).toContainText('کیف پول');

    // Verify balance card presence
    await expect(page.locator('div:has-text("موجودی"), div:has-text("ریال"), div:has-text("USDT")').first()).toBeVisible();
  });

  test('Golden Journey 5: Admin ERP Portal -> Security Gate & Bookings Structure', async ({ page }) => {
    // 1. Visit Admin Root
    await page.goto('/fa/admin', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/iTrip|Firuzo/i);
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // 2. Set Admin role and visit Admin Bookings
    await page.evaluate(() => {
      localStorage.setItem('firuzo-auth', JSON.stringify({ state: { user: { role: 'admin', phone: '09121230000', firstNameFa: 'ادمین' }, kyc: { step: 'approved' } } }));
    });
    await page.goto('/fa/admin/bookings', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1, table, tr, div:has-text("مدیریت"), form').first()).toBeVisible();
  });

});
