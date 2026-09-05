import { test, expect } from '@playwright/test';
import { apiLogin, E2E_USER } from './helpers/e2e-auth';

test.describe('Firuzo v2 Master Suite — 5 Deterministic Golden Journeys', () => {

  test('Golden Journey 1: Flight Search -> Passenger Booking -> Checkout -> Instant Voucher', async ({ page }) => {
    // Checkout requires an authenticated traveler, so sign in through the real
    // credentials provider before starting the journey.
    const loggedIn = await apiLogin(page, E2E_USER);
    expect(loggedIn).toBe(true);

    // 1. Visit Flights search
    await page.goto('/fa/flights/search', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/iTrip|Firuzo|فیروزه/i);

    // Verify search results presence and click first available ticket.
    // :visible skips hidden duplicates (e.g. mobile-only variants in the DOM).
    const selectBtn = page.locator('button:has-text("انتخاب بلیط"):visible, button:has-text("رزرو"):visible').first();
    await expect(selectBtn).toBeVisible({ timeout: 15000 });
    await selectBtn.click();

    // 2. We should land on Checkout
    await page.waitForURL(/\/fa\/checkout/);
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Fill the passenger form via the smart OCR scan (fills all required
    // fields deterministically, including birth date).
    const scanBtn = page.locator('button:has-text("اسکن هوشمند پاسپورت")').first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();
    await page.waitForTimeout(2200); // scan animation (~1.4s) fills the form

    // Submit to payment phase
    const nextBtn = page.locator('button[type="submit"]').first();
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // Verify Payment phase elements (price breakdown, wallet or gateway selector)
    await expect(page.locator('h2:has-text("انتخاب روش پرداخت"), h2:has-text("جزئیات قیمت")').first()).toBeVisible({ timeout: 10000 });

    // 4. Pay through the banking gateway (works without wallet balance) and
    // ride out the issuing animation to the final voucher.
    const gatewayRadio = page.locator('input[name="paymentMethod"]').nth(1);
    await gatewayRadio.check();
    const payBtn = page.locator('button:has-text("پرداخت نهایی و صدور آنی واچر")').first();
    await expect(payBtn).toBeVisible();
    await payBtn.click();

    // The saga confirms the booking server-side; the UI animates for ~5s
    // before showing the voucher, so allow a generous window.
    const pnrLabel = page.getByText(/کد پیگیری \(PNR\)|Tracking Code \(PNR\)/i).first();
    await expect(pnrLabel).toBeVisible({ timeout: 30000 });

    // 5. The confirmed booking must appear in the traveler's trips list.
    await page.goto('/fa/my-trips', { waitUntil: 'domcontentloaded' });
    const upcomingTab = page.locator('button:has-text("سفرهای پیش‌رو")').first();
    await expect(upcomingTab).toBeVisible({ timeout: 15000 });
    await expect(upcomingTab).not.toContainText('(0)');
  });

  test('Golden Journey 2: Hotel Search -> Multi-Filter & Compare -> Hotel Details -> Room Selection', async ({ page }) => {
    // Checkout requires an authenticated traveler (contact phone for vouchers).
    const loggedIn = await apiLogin(page, E2E_USER);
    expect(loggedIn).toBe(true);

    // 1. Visit Hotel Search
    await page.goto('/fa/hotels/search', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/iTrip|Firuzo|فیروزه/i);

    // Check hotel cards render with price
    const hotelCard = page.locator('div:has-text("هر شب از"), div:has-text("هر شب"), article').first();
    await expect(hotelCard).toBeVisible({ timeout: 15000 });

    // Click on details (:visible skips hidden duplicates; exclude the search
    // page itself, whose URL also contains "/hotels/").
    const viewBtn = page.locator('a:has-text("مشاهده و رزرو"):visible, a[href*="/hotels/"]:not([href*="/hotels/search"]):visible').first();
    await expect(viewBtn).toBeVisible();
    await viewBtn.click();

    // 2. We should land on Hotel Detail page (the URL wait must exclude the
    // search page itself, which also matches /hotels/<word>).
    await page.waitForURL(/\/fa\/hotels\/(?!search($|\?))[a-zA-Z0-9_-]+/);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
    const hotelTitle = ((await page.locator('h1').first().textContent()) || '').trim();
    expect(hotelTitle.length).toBeGreaterThan(3);
    expect(hotelTitle).not.toContain('هتل‌های همه مقاصد');

    // Deterministic booking party: 1 adult is bookable from any single-room
    // rate, independent of which hotel the search ranked first.
    const singleAdultUrl = new URL(page.url());
    singleAdultUrl.searchParams.set('adults', '1');
    singleAdultUrl.searchParams.set('children', '0');
    await page.goto(singleAdultUrl.toString(), { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

    // Verify hotel rooms section
    const roomCard = page.locator('div:has-text("اتاق"), div:has-text("سوییت"), button:has-text("انتخاب اتاق")').first();
    await expect(roomCard).toBeVisible({ timeout: 10000 });

    // Select one unit of the first available rate — the continue CTA stays
    // disabled until at least one room is selected (capacity.n > 0).
    const roomSelect = page.locator('#rooms select').first();
    if (await roomSelect.isVisible().catch(() => false)) {
      await roomSelect.selectOption('1');
    } else {
      const applyComboBtn = page.locator('button:has-text("اعمال پیشنهاد")').first();
      await expect(applyComboBtn).toBeVisible({ timeout: 5000 });
      await applyComboBtn.click();
    }

    // 3. Continue to checkout — the server must price this live-catalog hotel
    // (ir_* ids resolve through the hotels service, not the static seed list).
    const continueBtn = page.locator('button:has-text("ادامه و پرداخت")').first();
    await expect(continueBtn).toBeVisible({ timeout: 10000 });
    await expect(continueBtn).toBeEnabled({ timeout: 10000 });
    await continueBtn.click();
    await page.waitForURL(/\/fa\/checkout/, { timeout: 15000 });

    // 4. Fill the passenger form via the smart OCR scan (fills all required
    // fields, including birth date), then submit — this creates the booking
    // draft with encrypted passenger PII.
    const scanBtn = page.locator('button:has-text("اسکن هوشمند پاسپورت")').first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();
    await page.waitForTimeout(2200); // scan animation (~1.4s) fills the form
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // 5. Payment phase reached — the draft booking exists server-side.
    await expect(page.locator('h2:has-text("انتخاب روش پرداخت"), h2:has-text("جزئیات قیمت")').first()).toBeVisible({ timeout: 15000 });

    // 6. The draft appears in the traveler's trips list (server round-trip).
    await page.goto('/fa/my-trips', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('button:has-text("سفرهای پیش‌رو")').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(hotelTitle).first()).toBeVisible({ timeout: 15000 });
  });

  test('Golden Journey 3: AI Smart Trip Planner -> Wizard -> Timeline View', async ({ page }) => {
    // 1. Visit AI Planner with destination param for instant deterministic timeline verification
    await page.goto('/fa/plan?dest=turkey&who=duo&days=4&bud=balanced&pace=balanced', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/iTrip|Firuzo|فیروزه/i);

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
    await expect(page).toHaveTitle(/iTrip|Firuzo|فیروزه/i);
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // 2. Visit Wallet
    await page.goto('/fa/wallet', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/iTrip|Firuzo|فیروزه/i);
    await expect(page.locator('h1').first()).toContainText('کیف پول');

    // Verify balance card presence
    await expect(page.locator('div:has-text("موجودی"), div:has-text("ریال"), div:has-text("USDT")').first()).toBeVisible();
  });

  test('Golden Journey 5: Admin ERP Portal -> Security Gate & Bookings Structure', async ({ page }) => {
    // 1. Visit Admin Root
    await page.goto('/fa/admin', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/iTrip|Firuzo|فیروزه/i);
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // 2. Set Admin role and visit Admin Bookings
    await page.evaluate(() => {
      localStorage.setItem('firuzo-auth', JSON.stringify({ state: { user: { role: 'admin', phone: '09121230000', firstNameFa: 'ادمین' }, kyc: { step: 'approved' } } }));
    });
    await page.goto('/fa/admin/bookings', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1, table, tr, div:has-text("مدیریت"), form').first()).toBeVisible();
  });

});
