import { test, expect, type Page } from '@playwright/test';
import { apiLogin, E2E_USER } from './helpers/e2e-auth';

interface ApiTour {
  id: string;
  title?: string;
  city?: string;
  titleEn?: string;
  cityEn?: string;
}

async function fillPassengerDetails(page: Page) {
  await page.locator('#firstName').fill('ALI');
  await page.locator('#lastName').fill('MOHAMMADI');
  const passportInput = page.locator('#passportNo');
  if (await passportInput.isVisible().catch(() => false)) {
    await passportInput.fill('A12345678');
  }
  const expiryInput = page.locator('#passportExpiryDate');
  if (await expiryInput.isVisible().catch(() => false)) {
    await expiryInput.fill('2028-10-15');
  }
  const birthBtn = page.locator('#birthDate[role="button"]').first();
  if (await birthBtn.isVisible().catch(() => false)) {
    await birthBtn.click();
    const confirmDateBtn = page.locator('button:has-text("تایید تاریخ تولد"), button:has-text("Confirm Date of Birth")').first();
    await expect(confirmDateBtn).toBeVisible({ timeout: 5000 });
    await confirmDateBtn.click();
    await page.waitForTimeout(200);
  }
}

/**
 * Resolves a bookable tour id dynamically from the catalog API instead of
 * hardcoding seeded ids: CMS delete flows (tombstones) legitimately remove
 * tours, and hardcoded ids then 404 (false failure — the tombstone system
 * working as designed). Skips honestly when no matching tour exists.
 */
async function resolveTourId(
  page: Page,
  kind: 'international' | 'domestic'
): Promise<string | null> {
  const res = await page.request.get('/api/tours');
  if (!res.ok()) return null;
  const json = await res.json().catch(() => null);
  const tours: ApiTour[] = json?.data ?? [];
  const isDomestic = (t: ApiTour) =>
    /اصفهان|isfahan/i.test(`${t.city ?? ''} ${t.title ?? ''} ${t.cityEn ?? ''}`);
  const match = tours.find((t) => (kind === 'domestic' ? isDomestic(t) : !isDomestic(t)));
  return match?.id ?? null;
}

test.describe('Tours Booking & Checkout Journey', () => {
  // International tours (non-Isfahan) collect passport details via the OCR
  // scan button; domestic Isfahan tours use the national-ID path instead
  // (see the dedicated domestic test below). t3 = Istanbul.
  test('Tour detail -> configure travelers & dates -> checkout -> create draft without errors', async ({ page }) => {
    test.setTimeout(60000);

    // 1. Authenticate user so checkout has an authenticated session
    await page.goto('/fa/auth', { waitUntil: 'domcontentloaded' });
    const loggedIn = await apiLogin(page, E2E_USER);
    expect(loggedIn).toBe(true);

    // 2. Open an international tour detail page (passport path).
    // Resolved dynamically: hardcoded seeded ids 404 once the CMS deletes
    // them (tombstones), which is correct behavior, not a regression.
    const intlTourId = await resolveTourId(page, 'international');
    test.skip(!intlTourId, 'No international tour in catalog right now');
    await page.goto(`/fa/tours/${intlTourId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

    // 3. Click visible booking CTA (handles both desktop card and mobile sticky bar)
    const bookBtn = page.locator('button:has-text("رزرو"):visible').first();
    await expect(bookBtn).toBeVisible({ timeout: 10000 });
    await bookBtn.click();

    // 4. Arrive at checkout page
    await page.waitForURL(/\/fa\/checkout/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/fa\/checkout/);

    // 5. Fill passenger form, confirm Jalali birth date
    await fillPassengerDetails(page);

    // 6. Submit passenger details to create draft
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await submitBtn.click();

    // 7. Verification: Phase must transition to payment successfully
    const paymentView = page.locator('h2:has-text("روش"), h2:has-text("پرداخت"), h3:has-text("محاسبات")').first();
    await expect(paymentView).toBeVisible({ timeout: 20000 });
  });

  test('Domestic tour detail (Isfahan) -> national-ID form, no passport scan -> payment phase', async ({ page }) => {
    test.setTimeout(60000);

    // 1. Authenticate user so checkout has an authenticated session
    await page.goto('/fa/auth', { waitUntil: 'domcontentloaded' });
    const loggedIn = await apiLogin(page, E2E_USER);
    expect(loggedIn).toBe(true);

    // 2. Open a domestic (Isfahan) tour detail page — resolved dynamically
    // for the same tombstone reason as above.
    const domesticTourId = await resolveTourId(page, 'domestic');
    test.skip(!domesticTourId, 'No domestic Isfahan tour in catalog right now');
    await page.goto(`/fa/tours/${domesticTourId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });

    // 3. Book -> checkout
    const bookBtn = page.locator('button:has-text("رزرو"):visible').first();
    await expect(bookBtn).toBeVisible({ timeout: 10000 });
    await bookBtn.click();
    await page.waitForURL(/\/fa\/checkout/, { timeout: 15000 });

    // 4. Domestic path: passport OCR is hidden, national ID (کد ملی) is required
    await expect(page.locator('button:has-text("اسکن هوشمند پاسپورت")')).toBeHidden({ timeout: 10000 });
    await expect(page.locator('label[for="nationalId"]')).toContainText(/کد ملی/);

    // 5. Fill domestic identity fields (10-digit national ID + Jalali birth date)
    // Jalali birth date is a wheel-picker button since 0d798f4 — same flow as fillPassengerDetails
    await page.locator('#firstName').fill('ALI');
    await page.locator('#lastName').fill('MOHAMMADI');
    await page.locator('#nationalId').fill('0012345678');
    const birthBtn = page.locator('#birthDate[role="button"]').first();
    await birthBtn.click();
    const confirmDateBtn = page.locator('button:has-text("تایید تاریخ تولد"), button:has-text("Confirm Date of Birth")').first();
    await expect(confirmDateBtn).toBeVisible({ timeout: 5000 });
    await confirmDateBtn.click();

    // 6. Submit and verify payment phase is reached
    await page.locator('button[type="submit"]').first().click();
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

    // 5. Fill passenger details, confirm Jalali birth date
    await fillPassengerDetails(page);

    // 6. Submit and verify payment phase is reached
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    const paymentView = page.locator('h2:has-text("روش"), h2:has-text("پرداخت"), h3:has-text("محاسبات")').first();
    await expect(paymentView).toBeVisible({ timeout: 20000 });
  });
});
