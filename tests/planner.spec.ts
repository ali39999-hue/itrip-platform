import { test, expect } from '@playwright/test';

test('planner conversational flow e2e', async ({ page }) => {
  await page.goto('/fa/plan', { waitUntil: 'domcontentloaded' });

  // 1. Step 1: Destination Selection
  const step1Heading = page.locator('h1').first();
  await expect(step1Heading).toBeVisible();

  const destBtn = page.getByRole('button', { name: /ترکیه|Turkey|ایران|Iran|امارات|UAE/i }).first();
  await expect(destBtn).toBeVisible();
  await destBtn.click();

  // 2. Step 2: Trip Type (round trip vs one way)
  const roundTripBtn = page.getByRole('button', { name: /رفت و برگشت|Round trip/i }).first();
  await expect(roundTripBtn).toBeVisible({ timeout: 10000 });
  await roundTripBtn.click();

  // 3. Step 3: Who
  const whoBtn = page.getByRole('button', { name: /تنها|دونفره|خانواده|دوستان|Solo|Duo|Family|Friends/i }).first();
  await expect(whoBtn).toBeVisible({ timeout: 10000 });
  await whoBtn.click();

  // 4. Step 4: Days / Duration
  const daysOption = page.locator('button').filter({ hasText: /^[۳-۷3-7]$/ }).first();
  if (await daysOption.isVisible()) {
    await daysOption.click();
  } else {
    const nextBtn = page.getByRole('button', { name: /ادامه|بعدی|Skip|رد کن/i }).first();
    if (await nextBtn.isVisible()) await nextBtn.click();
  }

  // 5. Step 5: Interests
  const continueBtn = page.getByRole('button', { name: /ادامه|Continue/i }).first();
  if (await continueBtn.isVisible()) {
    await continueBtn.click();
  } else {
    const skipBtn = page.getByRole('button', { name: /رد کن|Skip/i }).first();
    if (await skipBtn.isVisible()) await skipBtn.click();
  }

  // 6. Step 6: Budget
  const budgetBtn = page.getByRole('button', { name: /اقتصادی|متعادل|لوکس|Balanced|Economy|Luxury/i }).first();
  if (await budgetBtn.isVisible()) {
    await budgetBtn.click();
  } else {
    const skipBtn = page.getByRole('button', { name: /رد کن|Skip/i }).first();
    if (await skipBtn.isVisible()) await skipBtn.click();
  }

  // 7. Step 7: Pace
  const paceBtn = page.getByRole('button', { name: /آرام|متعادل|فشرده|Relaxed|Balanced|Packed/i }).first();
  if (await paceBtn.isVisible()) {
    await paceBtn.click();
  } else {
    const skipBtn = page.getByRole('button', { name: /رد کن|Skip/i }).first();
    if (await skipBtn.isVisible()) await skipBtn.click();
  }

  // 8. Verify Result Page
  const timelineResult = page.getByRole('heading', { level: 1 });
  await expect(timelineResult).toBeVisible({ timeout: 10000 });

  // Verify Total Price and Action CTA
  const bookAllBtn = page.getByRole('button', { name: /ثبت کل پکیج|ادامه پرداخت|رزرو|Book All/i }).first();
  await expect(bookAllBtn).toBeVisible({ timeout: 10000 });

  // Round-trip selection must surface the return flight card
  await expect(page.getByText('پرواز برگشت').first()).toBeVisible({ timeout: 10000 });
});

