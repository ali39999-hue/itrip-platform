import { test, expect } from '@playwright/test';

// First-visit IP locale: CDN country header decides the initial locale,
// explicit cookie choice always wins, unknown countries keep legacy behavior.
test.describe('IP-based first-visit locale', () => {
  test('German IP lands on /en with stored choice cookie', async ({ page, context }) => {
    await context.setExtraHTTPHeaders({ 'cf-ipcountry': 'DE' });
    await page.goto('/');
    await expect(page).toHaveURL(/\/en(\/|$)/);
    const cookies = await context.cookies();
    expect(cookies.some((c) => c.name === 'NEXT_LOCALE' && c.value === 'en')).toBe(true);
  });

  test('Iranian IP lands on /fa', async ({ page, context }) => {
    await context.setExtraHTTPHeaders({ 'cf-ipcountry': 'IR' });
    await page.goto('/');
    await expect(page).toHaveURL(/\/fa(\/|$)/);
  });

  test('explicit cookie choice beats IP country', async ({ page, context }) => {
    await context.addCookies([
      { name: 'NEXT_LOCALE', value: 'fa', domain: 'localhost', path: '/' },
    ]);
    await context.setExtraHTTPHeaders({ 'cf-ipcountry': 'DE' });
    await page.goto('/');
    await expect(page).toHaveURL(/\/fa(\/|$)/);
  });

  test('explicit locale prefix is never overridden by IP', async ({ page, context }) => {
    await context.setExtraHTTPHeaders({ 'cf-ipcountry': 'DE' });
    await page.goto('/fa/tours');
    await expect(page).toHaveURL(/\/fa\/tours/);
  });

  test('no country header keeps legacy negotiation (no crash, no loop)', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/(fa|en|ar|zh|ru)(\/|$)/);
  });
});
