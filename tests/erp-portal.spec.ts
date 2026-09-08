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

    // Global search check (ERP search)
    const searchInput = page.getByRole('combobox', { name: /جستجوی PNR|Search PNR/i });
    await expect(searchInput).toBeVisible();
    await searchInput.fill('TRP');
    await expect(page.locator('#admin-global-search-results')).toBeVisible({ timeout: 10000 });

    // 3. Check Operations / Ops Center
    await page.goto('/fa/admin/ops', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/fa\/auth/);
    await expect(page.getByRole('heading', { name: /مرکز عملیات و صف رویدادها|Outbox/i, level: 1 })).toBeVisible({ timeout: 15000 });

    // 4. Check Finance & Ledger Page
    await page.goto('/fa/admin/finance', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/fa\/auth/);
    await expect(page.getByRole('heading', { name: /مدیریت مالی|Financial/i, level: 1 })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /اجرای تطبیق مالی|Run Reconciliation/i }).click();
    await expect(page.getByText(/تراز متوازن است|Balanced|مغایرت/i)).toBeVisible({ timeout: 15000 });

    // 5. Check Bookings Management Page
    await page.goto('/fa/admin/bookings', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/fa\/auth/);
    await expect(page.getByRole('heading', { name: /مدیریت رزروها|Bookings/i, level: 1 })).toBeVisible({ timeout: 15000 });

    // 6. Check Exception Center
    await page.goto('/fa/admin/exceptions', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/fa\/auth/);
    await expect(page.getByRole('heading', { name: /مرکز خطا و استثنائات|Exception/i, level: 1 })).toBeVisible({ timeout: 15000 });

    // 7. Check Suppliers Page
    await page.goto('/fa/admin/suppliers', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/fa\/auth/);
    await expect(page.getByRole('heading', { name: /تامین‌کنندگان|Suppliers/i, level: 1 })).toBeVisible({ timeout: 15000 });

    // 8. Check Inventory Page
    await page.goto('/fa/admin/inventory', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/fa\/auth/);
    await expect(page.getByRole('heading', { name: /انبار و سهمیه‌ها|Inventory/i, level: 1 })).toBeVisible({ timeout: 15000 });

    // 9. Check Travel Files Page
    await page.goto('/fa/admin/travel-files', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/fa\/auth/);
    await expect(page.getByRole('heading', { name: /پرونده‌های سفر|Travel Files/i, level: 1 })).toBeVisible({ timeout: 15000 });

    // Open first dossier if available
    const dossierLink = page.getByRole('link', { name: /مشاهده پرونده|Open dossier/i }).first();
    if (await dossierLink.isVisible()) {
      await dossierLink.click();
      await expect(page).not.toHaveURL(/\/fa\/auth/);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15000 });
      // Switch to Timeline tab
      await page.getByRole('tab', { name: /تایم‌لاین|Timeline/i }).click();
      await expect(page.getByText(/Domain:/i).first()).toBeVisible();
      // Switch to Exceptions tab
      await page.getByRole('tab', { name: /استثنائات|Exceptions/i }).click();
      await expect(page.getByRole('heading', { name: /استثنائات فعال پرونده|Active Exceptions/i })).toBeVisible();
    }

    // 10. Check Referrals Page
    await page.goto('/fa/admin/referrals', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/fa\/auth/);
    await expect(page.getByRole('heading', { name: /کدهای معرف|Referral/i, level: 1 })).toBeVisible({ timeout: 15000 });

    // 11. Unauthenticated users must never reach the ERP (middleware gate).
    const anonContext = page.context();
    const anon = await anonContext.browser()!.newContext();
    const anonPage = await anon.newPage();
    await anonPage.goto('/fa/admin', { waitUntil: 'domcontentloaded' });
    await expect(anonPage).toHaveURL(/\/fa\/auth/);
    await anon.close();
  });
});
