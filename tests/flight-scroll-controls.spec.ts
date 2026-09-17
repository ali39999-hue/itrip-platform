import { test, expect } from '@playwright/test';

for (const locale of ['fa', 'en']) {
  for (const width of [320, 390, 430, 768, 1024, 1440]) {
    test(`flight controls reflow and scroll ${locale} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/${locale}/flights/search`);
      const pill = page.locator('div.fixed').filter({ has: page.locator('button', { hasText: locale === 'fa' ? 'مرتب' : 'Sort' }) }).first();
      await expect(page.locator('article').first()).toBeVisible({ timeout: 60000 });
      await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      if (width >= 1024) return;
      await expect(pill).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 800));
      await expect(pill).toBeHidden();
      const hiddenButton = pill.locator('button').first();
      await hiddenButton.evaluate((el: HTMLElement) => el.focus());
      await expect(hiddenButton).not.toBeFocused();
      await page.evaluate(() => window.scrollTo(0, 700));
      await expect(pill).toBeVisible();
      await expect(pill.locator('button').first()).toBeEnabled();
    });
  }
}
