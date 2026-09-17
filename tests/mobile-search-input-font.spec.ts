import { test, expect } from '@playwright/test';

test('mobile city and date inputs use at least 16px in fa and en', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });

  for (const locale of ['fa', 'en']) {
    await page.goto(`/${locale}/hotels`);
    for (const id of ['search-dest-input', 'search-date-checkin-mobile', 'search-date-checkout-mobile']) {
      const input = page.locator(`input[id="${id}"]`);
      await expect(input, `${locale}: ${id} must be visible`).toBeVisible();
      await expect.poll(
        () => input.evaluate(el => parseFloat(getComputedStyle(el).fontSize)),
        { message: `${locale}: ${id} must use at least 16px on mobile` },
      ).toBeGreaterThanOrEqual(16);
      if (id.includes('date')) {
        await page.evaluate(() => document.fonts.ready);
        const fits = await input.evaluate((el: HTMLInputElement) => {
          const style = getComputedStyle(el);
          const ctx = document.createElement('canvas').getContext('2d')!;
          ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          return ctx.measureText(el.value).width <= el.clientWidth;
        });
        expect(fits, `${locale}: ${id} must show the full date`).toBe(true);
      }
    }
  }
});
