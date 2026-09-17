import { test, expect } from '@playwright/test';

for (const locale of ['fa', 'en']) {
  for (const width of [320, 390, 430, 768, 1024, 1440]) {
    test(`hotel controls reflow and scroll ${locale} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/${locale}/hotels/search`);
      const pill = page.locator('div.fixed').filter({ has: page.locator('button', { hasText: locale === 'fa' ? 'مرتب' : 'Sort' }) }).first();
      await expect(page.locator('article').first()).toBeVisible({ timeout: 60000 });
      await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      if (width >= 1024) {
        await expect(pill).toBeHidden();
        return;
      }
      await expect(pill).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 800));
      await expect(pill).toBeHidden();
      const filter = pill.locator('button').first();
      await filter.evaluate((el: HTMLElement) => el.focus());
      await expect(filter).not.toBeFocused();
      await page.evaluate(() => window.scrollTo(0, 700));
      await expect(pill).toBeVisible();
      await filter.click();
      const dialog = page.getByRole('dialog', { name: locale === 'fa' ? 'فیلترهای پیشرفته اقامتگاه' : 'Advanced Hotel Filters', exact: true });
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(filter).toBeFocused();
    });
  }
}
