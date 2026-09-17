import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

for (const locale of ['fa', 'en']) {
  for (const theme of ['light', 'dark'] as const) {
    for (const width of [390, 1440]) {
      test(`flight card contrast ${locale} ${theme} ${width}`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme: theme });
        await page.addInitScript((value) => localStorage.setItem('firuzo-theme', value), theme);
        await page.goto(`/${locale}/flights/search`);
        await expect(page.locator('article').first()).toBeVisible({ timeout: 60000 });
        await page.evaluate(() => document.fonts.ready);
        const result = await new AxeBuilder({ page }).include('article').withRules(['color-contrast']).analyze();
        expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, reason: n.failureSummary })) }))).toEqual([]);
        const card = page.locator('article').first();
        const details = card.locator('button[aria-expanded]:visible').first();
        await details.click();
        await expect(details).toHaveAttribute('aria-expanded', 'true');
        await card.evaluate(async (element) => {
          await Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})));
        });
        const expanded = await new AxeBuilder({ page }).include('article').withRules(['color-contrast']).analyze();
        if (expanded.violations.length) {
          await testInfo.attach('expanded-card', { body: await card.screenshot(), contentType: 'image/png' });
          await testInfo.attach('contrast-failures', { body: JSON.stringify(expanded.violations, null, 2), contentType: 'application/json' });
        }
        expect(expanded.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, reason: n.failureSummary })) }))).toEqual([]);
      });
    }
  }
}
