import { test, expect } from '@playwright/test';

const PAGES_TO_TEST = [
  '/',
  '/destinations',
  '/plan',
  '/travelogues',
  '/tours',
  '/support'
];

test.describe('i18n Language Switching across pages', () => {
  for (const pagePath of PAGES_TO_TEST) {
    test(`Should be able to load and switch languages on ${pagePath}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      // Load the page in default locale (fa)
      const response = await page.goto(`/fa${pagePath === '/' ? '' : pagePath}`, { waitUntil: 'networkidle' });
      expect(response?.status()).toBe(200);

      // Check if it actually loaded without crashing
      await expect(page.locator('body')).toBeVisible();

      // Open the language switcher (button with aria-label="Language")
      const langSwitcherBtn = page.getByRole('button', { name: 'Language' }).first();
      await expect(langSwitcherBtn).toBeVisible({ timeout: 10000 });
      await langSwitcherBtn.click();
      
      const enOption = page.locator('div[role="listbox"] button').filter({ hasText: /English/i }).first();
      await expect(enOption).toBeVisible({ timeout: 5000 });
      await enOption.click();
      await page.waitForURL(new RegExp(`/en(${pagePath === '/' ? '($|\\?)' : pagePath})`), { timeout: 10000 });
      await expect(page.locator('body')).toBeVisible();

      const langSwitcherBtnAfter = page.getByRole('button', { name: 'Language' }).first();
      await expect(langSwitcherBtnAfter).toBeVisible({ timeout: 10000 });
      await langSwitcherBtnAfter.click();
      const ruOption = page.locator('div[role="listbox"] button').filter({ hasText: /Русский/i }).first();
      await expect(ruOption).toBeVisible({ timeout: 5000 });
      await ruOption.click();
      await page.waitForURL(new RegExp(`/ru(${pagePath === '/' ? '($|\\?)' : pagePath})`), { timeout: 10000 });
      await expect(page.locator('body')).toBeVisible();
    });
  }
});
