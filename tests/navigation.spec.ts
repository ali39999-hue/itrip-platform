import { test, expect } from '@playwright/test';

test('navigation between main pages', async ({ page }) => {
  // Start at homepage
  await page.goto('/fa');
  
  // Wait for the app to be fully hydrated
  await page.waitForLoadState('networkidle');

  // Navigate to tours page directly to ensure routing works
  await page.goto('/fa/tours');
  await expect(page).toHaveURL(/.*\/fa\/tours/);

  // Check if the page content loads
  const mainContent = page.locator('main').first();
  await expect(mainContent).toBeVisible();

  // Navigate to visa page
  await page.goto('/fa/visa');
  await expect(page).toHaveURL(/.*\/fa\/visa/);
});
