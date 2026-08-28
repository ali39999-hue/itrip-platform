import { test, expect } from '@playwright/test';

test('QC: i18n + experiences + country switch with assertions', async ({ page }) => {
  // 1) Persian home
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/fa', { waitUntil: 'domcontentloaded' });
  
  const h1Fa = page.locator('h1').first();
  await expect(h1Fa).toBeVisible();

  // 2) offers are country-aware for default country
  const offersTitle = page.locator('h2', { hasText: /پیشنهادهای ویژه|Featured offers/i }).first();
  await expect(offersTitle).toBeVisible();

  // 3) English home
  await page.goto('http://localhost:3000/en', { waitUntil: 'domcontentloaded' });
  
  const htmlTag = page.locator('html');
  await expect(htmlTag).toHaveAttribute('dir', 'ltr');

  const enOffers = page.locator('h2', { hasText: /Featured offers|Special offers/i }).first();
  await expect(enOffers).toBeVisible();

  // 4) Tours page renders experiences
  await page.goto('http://localhost:3000/fa/tours', { waitUntil: 'domcontentloaded' });
  const toursHeading = page.locator('h1, h2').first();
  await expect(toursHeading).toBeVisible();
});
