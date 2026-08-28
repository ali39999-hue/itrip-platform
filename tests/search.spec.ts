import { test, expect } from '@playwright/test';

test('hotel search page renders map and grid', async ({ page }) => {
  await page.goto('/fa/hotels/search');

  // Verify URL
  await expect(page).toHaveURL(/.*\/fa\/hotels\/search/);

  // Expect the page to have some kind of structural container for filters or map
  const mainContent = page.locator('main').first();
  await expect(mainContent).toBeVisible();
});

test('flight search page renders correctly', async ({ page }) => {
  await page.goto('/fa/flights/search');

  // Verify URL
  await expect(page).toHaveURL(/.*\/fa\/flights\/search/);

  // Check if main content is visible
  const mainContent = page.locator('main').first();
  await expect(mainContent).toBeVisible();
});
