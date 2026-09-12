import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * KYC at purchase (2026-09): login never blocks on an identity wizard. A user
 * whose profile lacks name/nationalId lands straight on /account, sees the
 * "incomplete profile" banner there, and KYC is enforced in the checkout
 * funnel (lead passenger nationalId/passport). The spec resets the seeded
 * customer first, so it is idempotent.
 */

// .env is not loaded into process.env for specs — read DATABASE_URL manually
// so the reset below can reach the same DB the dev server uses.
const envText = fs.existsSync(path.resolve(process.cwd(), '.env'))
  ? fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8')
  : '';
const dbUrl = envText.match(/^DATABASE_URL="?([^"\r\n]+)"?/m)?.[1];

test.describe('KYC completion flow', () => {
  let prisma: import('@prisma/client').PrismaClient | null = null;

  test.beforeAll(async () => {
    if (!dbUrl) throw new Error('DATABASE_URL missing from .env — cannot reset KYC fixture');
    process.env.DATABASE_URL = dbUrl;
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
    // simulate a fresh signup: strip identity fields from the seeded customer
    await prisma.user.update({
      where: { email: 'user@firuzo.com' },
      data: { nationalId: null, firstNameFa: null, lastNameFa: null },
    });
  });

  test.afterAll(async () => {
    await prisma?.$disconnect();
  });

  test('incomplete signup logs in freely without being blocked by wizard; KYC completes at purchase or account', async ({ page }) => {
    // 1) Password login with the seeded customer (no nationalId in DB)
    await page.goto('/fa/auth', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /ورود با کلمه عبور/i }).click();
    await page.locator('#staff-identifier').fill('user@firuzo.com');
    await page.locator('#staff-password').fill('User@Firuzo2026!');
    await page.getByRole('button', { name: /ورود به پنل مدیریت ERP/i }).click();

    // 2) KYC is at purchase, NOT registration: user is NOT trapped in wizard,
    // lands smoothly on /fa/account
    await page.waitForURL(/\/fa\/account/, { timeout: 20000 });
    await expect(page).toHaveURL(/\/fa\/account/);

    // 3) Incomplete profile banner is shown on /account advising user
    const banner = page.getByText(/اطلاعات هویتی شما کامل نیست/i);
    await expect(banner).toBeVisible({ timeout: 15000 });

    // 4) Complete profile in database (simulate completion at purchase/account)
    await prisma!.user.update({
      where: { email: 'user@firuzo.com' },
      data: {
        firstNameFa: 'علی',
        lastNameFa: 'آزمونی',
        nationalId: '0012345678',
      },
    });

    // 5) Refresh account: profile is now complete, banner cleared
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/اطلاعات هویتی شما کامل نیست/i)).toHaveCount(0);

    // 6) Fresh reload: user remains signed in and navigates freely
    await page.goto('/fa/auth', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    expect(page.url()).toContain('/fa/account');
  });
});
