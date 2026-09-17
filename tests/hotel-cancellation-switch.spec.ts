import { test, expect } from '@playwright/test';

for (const [locale, name] of [['fa', 'فقط کنسلی رایگان'], ['en', 'Free Cancellation Only']]) {
  test(`free cancellation switch has a name and keyboard support: ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/${locale}/hotels/search`);
    const toggle = page.getByRole('switch').first();
    await expect(toggle).toBeVisible({ timeout: 60000 });
    await expect(toggle).toHaveAccessibleName(name);
    const bounds = await toggle.boundingBox();
    expect(bounds?.width).toBeGreaterThanOrEqual(44);
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await toggle.focus();
    await page.keyboard.press('Space');
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('Space');
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
  });
}
