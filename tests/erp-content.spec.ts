import { test, expect } from '@playwright/test';
import { apiLogin, E2E_ADMIN } from './helpers/e2e-auth';

test.describe('ERP Content Management (CMS) Suite', () => {
  test('ERP CMS: Access /admin/content, switch tabs, create and manage tours, experiences, travelogues, guides', async ({ page }) => {
    // 1. Login with Admin
    const loggedIn = await apiLogin(page, E2E_ADMIN);
    expect(loggedIn).toBe(true);

    // 2. Navigate to /fa/admin/content
    await page.goto('/fa/admin/content', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/fa\/auth/);
    await expect(page.getByRole('heading', { name: /مدیریت تورها|Content Management/i, level: 1 })).toBeVisible({ timeout: 15000 });

    // 2b. The CMS now opens on the "site pages" tab — switch to tours first.
    await page.getByRole('tab', { name: /تورهای مسافرتی/i }).click();

    // 3. Tab 1: Tours modal check
    await page.getByRole('button', { name: /افزودن تور جدید/i }).first().click();
    await expect(page.getByRole('heading', { name: /افزودن پکیج تور مسافرتی جدید/i })).toBeVisible();
    await page.getByRole('button', { name: /انصراف/i }).click();

    // 4. Tab 2: Experiences
    await page.getByRole('tab', { name: /تجربه‌های اصیل/i }).click();
    await expect(page.getByRole('button', { name: /افزودن تجربه اصیل/i })).toBeVisible();

    // 5. Tab 3: Travelogues
    await page.getByRole('tab', { name: /سفرنامه‌ها/i }).click();
    await expect(page.getByRole('button', { name: /افزودن سفرنامه/i })).toBeVisible();

    // 6. Tab 4: Guides
    await page.getByRole('tab', { name: /راهنمای سفر/i }).click();
    await expect(page.getByRole('button', { name: /افزودن راهنمای سفر/i })).toBeVisible();
  });
});
