import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * KYC completion flow (2026-09): a user whose profile lacks name/nationalId
 * (fresh signup) is routed into the identity wizard after login instead of
 * straight to the account, sees a completion banner on /account, and the
 * wizard's final submit persists name + nationalId server-side (passport is
 * optional). The spec resets the seeded customer first, so it is idempotent
 * even though the wizard itself mutates the profile.
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

  test('incomplete signup is routed through the identity wizard and persisted', async ({ page }) => {
    // 1) Password login with the seeded customer (no nationalId in DB)
    await page.goto('/fa/auth', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /ورود با کلمه عبور/i }).click();
    await page.locator('#staff-identifier').fill('user@firuzo.com');
    await page.locator('#staff-password').fill('User@Firuzo2026!');
    await page.getByRole('button', { name: /ورود به پنل مدیریت ERP/i }).click();

    // 2) Incomplete user → wizard first step instead of redirect to account
    const nameStep = page.getByRole('heading', { name: /نام و نام خانوادگی/i });
    await expect(nameStep).toBeVisible({ timeout: 15000 });

    // 3) Completion banner is shown on /account while the profile is incomplete
    await page.goto('/fa/account', { waitUntil: 'domcontentloaded' });
    const banner = page.getByText(/اطلاعات هویتی شما کامل نیست/i);
    await expect(banner).toBeVisible({ timeout: 15000 });

    // 4) Walk the wizard: names → nationalId → (optional, empty) passport
    await page.goto('/fa/auth', { waitUntil: 'domcontentloaded' });
    await expect(nameStep).toBeVisible({ timeout: 15000 });
    const nameInputs = page.locator('input[type="text"]');
    await nameInputs.nth(0).fill('علی');
    await nameInputs.nth(1).fill('آزمونی');
    await page.getByRole('button', { name: 'ادامه', exact: true }).click();

    const nationalInput = page.locator('input[placeholder="0012345678"]');
    await expect(nationalInput).toBeVisible({ timeout: 10000 });
    await nationalInput.fill('0012345678');
    await page.getByRole('button', { name: 'ادامه', exact: true }).click();

    const finishBtn = page.getByRole('button', { name: /تکمیل و ثبت نهایی/i });
    await expect(finishBtn).toBeVisible({ timeout: 10000 });
    await finishBtn.click();

    // 5) Persisted server-side → redirect to account, banner cleared
    await page.waitForURL(/\/fa\/account/, { timeout: 20000 });
    await expect(page.getByText(/اطلاعات هویتی شما کامل نیست/i)).toHaveCount(0);

    // 6) Fresh reload: session user is now complete → /auth must NOT reopen
    //    the wizard (approved step bounces straight back to the account)
    await page.goto('/fa/auth', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    expect(page.url()).toContain('/fa/account');
  });
});
