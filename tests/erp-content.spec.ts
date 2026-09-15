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

  test('ERP CMS: tour create -> list -> delete round-trip (server-action path)', async ({ page }) => {
    test.setTimeout(90000);
    const loggedIn = await apiLogin(page, E2E_ADMIN);
    expect(loggedIn).toBe(true);

    // Fail loudly on server-action / RSC breakage (e.g. invalid-use-server-value 500s).
    const serverErrors: string[] = [];
    page.on('pageerror', (e) => serverErrors.push(String(e).slice(0, 200)));
    page.on('response', (r) => {
      if (r.status() >= 500) serverErrors.push(`HTTP ${r.status()} ${r.url().slice(0, 100)}`);
    });

    await page.goto('/fa/admin/content?tab=tours', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/fa\/auth/);
    await expect(page.getByRole('tab', { name: /تورهای مسافرتی/i })).toBeVisible({ timeout: 15000 });

    const title = `E2E CMS Probe ${Date.now()}`;
    await page.getByRole('button', { name: /افزودن تور جدید/i }).first().click();
    await page.getByPlaceholder(/تور VIP شیراز/).fill(title);
    await page.getByPlaceholder('شیراز', { exact: true }).fill('تهران');
    await page.locator('form button[type="submit"]').last().click();

    // Modal closes and the new row appears — proves createAdminTourAction ran.
    await expect(page.getByRole('dialog', { name: /مدیریت پکیج تور/ })).toBeHidden({ timeout: 15000 });
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 15000 });

    // Delete it again so the suite leaves zero database pollution.
    await page.getByRole('button', { name: new RegExp(`حذف تور:.*${title}`) }).first().click();
    await page.getByRole('button', { name: /بله، حذف کن/i }).click();
    // The confirm dialog echoes the title too — wait for it to close first,
    // then assert the tour row itself is gone.
    await expect(page.getByRole('dialog', { name: /حذف قطعی شود/ })).toBeHidden({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: title })).toBeHidden({ timeout: 15000 });

    // The deleted tour must stay gone from the public catalog API too —
    // regression guard against static-fallback resurrection.
    const apiRes = await page.request.get('/api/tours');
    expect(apiRes.ok()).toBe(true);
    const apiJson = (await apiRes.json()) as { data: Array<{ id: string; title: string }> };
    expect(apiJson.data.some((t) => t.title === title)).toBe(false);

    expect(serverErrors.filter((e) => e.includes('500') || e.includes('use server'))).toEqual([]);
  });
});
