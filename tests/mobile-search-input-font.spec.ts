import { test, expect } from '@playwright/test';

// The mobile date fields render the selectable date inside a <span id=...>
// (JalaliDatePicker's mobile bottom-sheet branch — AGENTS.md §1.2 requires a
// bottom sheet, and a read-only date trigger has no <input> to edit). The city
// field stays an <input>. Both must be ≥16px and show their full value.
test('mobile city and date inputs use at least 16px in fa and en', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });

  for (const locale of ['fa', 'en']) {
    await page.goto(`/${locale}/hotels`);
    for (const id of ['search-dest-input', 'search-date-checkin-mobile', 'search-date-checkout-mobile']) {
      const field = page.locator(`[id="${id}"]`);
      await expect(field, `${locale}: ${id} must be visible`).toBeVisible();
      await expect.poll(
        () => field.evaluate(el => parseFloat(getComputedStyle(el).fontSize)),
        { message: `${locale}: ${id} must use at least 16px on mobile` },
      ).toBeGreaterThanOrEqual(16);
      if (id.includes('date')) {
        await page.evaluate(() => document.fonts.ready);
        const fits = await field.evaluate((el: HTMLElement) => {
          const style = getComputedStyle(el);
          const ctx = document.createElement('canvas').getContext('2d')!;
          ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          return ctx.measureText(el.textContent ?? '').width <= el.clientWidth;
        });
        expect(fits, `${locale}: ${id} must show the full date`).toBe(true);
      }
    }
  }
});
