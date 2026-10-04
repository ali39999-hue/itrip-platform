import { test, expect } from '@playwright/test';
import { apiLogin, E2E_ADMIN } from './helpers/e2e-auth';

/**
 * T0502/T0504 E2E — §18 acceptance, automated: a content editor creates a
 * landing page through the structured editor, publishes it, and the public
 * route renders it — with zero code changes. Uses the seeded SUPER_ADMIN
 * (holds `content:manage` via role defaults).
 */
test.describe('Business CMS Editor — §18 Acceptance', () => {
  test('editor creates, previews, publishes and the public route renders', async ({ page }) => {
    const loggedIn = await apiLogin(page, E2E_ADMIN);
    expect(loggedIn).toBe(true);

    await page.goto('/fa/admin/business/content', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/fa\/auth/);

    // Editor surface renders for a content manager.
    await expect(
      page.getByRole('heading', { name: /مدیریت محتوای تخصصی/i })
    ).toBeVisible({ timeout: 15000 });

    // Start a fresh page.
    await page.getByRole('button', { name: '+ صفحه جدید' }).click();

    const stamp = Date.now().toString(36);
    const title = `صفحه E2E CMS ${stamp}`;
    const slug = `e2e-cms-${stamp}`;

    await page.getByLabel('عنوان صفحه').fill(title);
    await page.getByLabel('اسلاگ (آدرس: /business/content/…)').fill(slug);
    await page.getByLabel('Meta Title (حداکثر ۶۰)').fill(`${title} | فیروزو بیزنس`);

    // Add a hero section with an inner title.
    await page.getByRole('button', { name: '+ بنر اصلی' }).click();
    const heroTitle = page.getByLabel('عنوان بنر', { exact: true });
    await expect(heroTitle).toBeVisible();
    await heroTitle.fill('بنر تستی E2E');
    await page.getByLabel('زیرعنوان بنر').fill('زیرعنوان تستی برای پذیرش §18');

    // Save the draft (revision #1 recorded).
    await page.getByRole('button', { name: 'ذخیره پیش‌نویس' }).click();
    await expect(page.getByText(/پیش‌نویس ذخیره شد/)).toBeVisible({ timeout: 15000 });

    // Publish (enabled once the page exists and has ≥1 section).
    const publishButton = page.getByRole('button', { name: 'انتشار', exact: true });
    await expect(publishButton).toBeEnabled({ timeout: 10000 });
    await publishButton.click();
    await expect(page.getByText('صفحه منتشر شد')).toBeVisible({ timeout: 15000 });

    // Public route renders the published page without any code change.
    await page.goto(`/fa/business/content/${slug}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('بنر تستی E2E')).toBeVisible();
  });
});
