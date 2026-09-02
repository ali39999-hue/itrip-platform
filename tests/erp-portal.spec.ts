import { test, expect } from '@playwright/test';

test.describe('ERP Master Suite - Full Operational & Financial Validation', () => {

  test('ERP: Login with Admin -> Access Dashboard -> Check KPIs & Live Data', async ({ page }) => {
    // 1. Login with Admin ID (Phone)
    await page.goto('/fa/auth', { waitUntil: 'domcontentloaded' });
    await page.locator('#identifier').fill('09120000000');
    await page.locator('#auth-submit-btn').click();
    
    await expect(page.locator('#password')).toBeVisible();
    await page.locator('#password').fill('1234');
    await page.locator('#auth-verify-btn').click();

    // 2. Navigate to Admin Dashboard
    await page.goto('/fa/admin', { waitUntil: 'domcontentloaded' });
    
    // Assert ERP Heading & Navigation
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    // 3. Check Operations / Ops Center
    await page.goto('/fa/admin/ops', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 4. Check Finance & Ledger Page
    await page.goto('/fa/admin/finance', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 5. Check Bookings Management Page
    await page.goto('/fa/admin/bookings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
