import { test } from '@playwright/test';

test.describe('Search Widget Visual Alignment', () => {
  test('Capture high-res screenshots for all 4 search tabs', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/fa', { waitUntil: 'networkidle' });

    // 1. Plan Tab
    const planTab = page.getByRole('tab', { name: /برنامه‌ریزی هوشمند/i });
    await planTab.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/widget-01-plan.png' });

    // 2. Flights Tab
    const flightsTab = page.getByRole('tab', { name: /پروازها/i });
    await flightsTab.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/widget-02-flights.png' });

    // 3. Hotels Tab
    const hotelsTab = page.getByRole('tab', { name: /هتل‌ها/i });
    await hotelsTab.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/widget-03-hotels.png' });

    // 4. Tours Tab
    const toursTab = page.getByRole('tab', { name: /گشت‌ها و تورها/i });
    await toursTab.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/widget-04-tours.png' });

    // 5. Mobile Viewport (Flights)
    await page.setViewportSize({ width: 375, height: 812 });
    await flightsTab.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/widget-05-mobile-flights.png' });
  });
});
