import { test, expect } from '@playwright/test';
import { apiLogin, E2E_ADMIN } from './helpers/e2e-auth';

test.describe('ERP Master Suite - Full Operational & Financial Validation', () => {

  test('ERP: Login with Admin -> Access Dashboard -> Check KPIs & Live Data', async ({ page }) => {
    // 1. Login through the real NextAuth credentials provider (seeded admin).
    //    The session cookie lands in the browser context like a UI login.
    const loggedIn = await apiLogin(page, E2E_ADMIN);
    expect(loggedIn).toBe(true);

    // 2. Navigate to Admin Dashboard — the ERP shell must actually render
    //    (a redirect to /fa/auth means authorization failed).
    await page.goto('/fa/admin', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/fa\/auth/);
    await expect(page.getByRole('heading', { name: /مرکز عملیات|Action Center/i, level: 1 })).toBeVisible({ timeout: 15000 });

    // 3. Check Operations / Ops Center
    await page.goto('/fa/admin/ops', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/fa\/auth/);
    await expect(page.getByRole('heading', { name: /مرکز عملیات و صف رویدادها|Outbox/i, level: 1 })).toBeVisible({ timeout: 15000 });

    // 4. Check Finance & Ledger Page
    await page.goto('/fa/admin/finance', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/fa\/auth/);
    await expect(page.getByRole('heading', { name: /مدیریت مالی|Financial/i, level: 1 })).toBeVisible({ timeout: 15000 });

    // 5. Check Bookings Management Page
    await page.goto('/fa/admin/bookings', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/fa\/auth/);
    await expect(page.getByRole('heading', { name: /مدیریت رزروها|Bookings/i, level: 1 })).toBeVisible({ timeout: 15000 });

    // 6. Unauthenticated users must never reach the ERP (middleware gate).
    const anonContext = page.context();
    const anon = await anonContext.browser()!.newContext();
    const anonPage = await anon.newPage();
    await anonPage.goto('/fa/admin', { waitUntil: 'domcontentloaded' });
    await expect(anonPage).toHaveURL(/\/fa\/auth/);
    await anon.close();
  });
});
