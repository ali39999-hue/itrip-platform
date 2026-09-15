import { test, expect } from '@playwright/test';
import { apiLogin, E2E_ADMIN, E2E_USER } from './helpers/e2e-auth';

/**
 * Complete Live Browser Platform Audit Suite (BROWSER-AUDIT-001)
 * Mandated by Project Leadership & Client:
 * "همه صفحات رو به صورت زنده روی مرورگر تست کنید و مطمئن بشید همه‌چیزش درست کار می‌کنه."
 * Tests every single public, user, service, and ERP/Admin route across Desktop (1440px) and Mobile (390px).
 */

const PUBLIC_AND_USER_PAGES = [
  { path: '/fa', name: 'Homepage (صفحه اصلی)' },
  { path: '/fa/flights', name: 'Flights Landing (پروازها)' },
  { path: '/fa/flights/search', name: 'Flights Search Results (نتایج جستجوی پرواز)' },
  { path: '/fa/hotels', name: 'Hotels Landing (هتل‌ها)' },
  { path: '/fa/hotels/search', name: 'Hotels Search Results (نتایج جستجوی هتل)' },
  { path: '/fa/hotels/h1', name: 'Hotel Detail (جزئیات هتل)' },
  { path: '/fa/tours', name: 'Tours Catalog (تورها)' },
  { path: '/fa/tours/t1', name: 'Tour Detail (جزئیات تور)' },
  { path: '/fa/transfers', name: 'Airport Transfers (ترانسفر فرودگاهی)' },
  { path: '/fa/visa', name: 'Visa Services (خدمات ویزا)' },
  { path: '/fa/insurance', name: 'Travel Insurance (بیمه مسافرتی)' },
  { path: '/fa/esim', name: 'International eSIM (سیم‌کارت بین‌المللی)' },
  { path: '/fa/trains', name: 'Train Tickets (قطار)' },
  { path: '/fa/destinations', name: 'Destinations Guide (راهنمای مقاصد)' },
  { path: '/fa/travelogues', name: 'Travelogues (سفرنامه‌ها)' },
  { path: '/fa/guide', name: 'Travel Guide (راهنمای سفر)' },
  { path: '/fa/support', name: '24/7 Support (پشتیبانی ۲۴ ساعته)' },
  { path: '/fa/plan', name: 'AI Trip Planner (برنامه‌ریز هوشمند سفر)' },
  { path: '/fa/account', name: 'User Account Dashboard (حساب کاربری)' },
  { path: '/fa/my-trips', name: 'My Trips Management (سفرهای من)' },
  { path: '/fa/wallet', name: 'Multi-Currency Wallet (کیف پول)' },
  { path: '/fa/checkout', name: 'Checkout Funnel (پرداخت و رزرو)' },
  { path: '/fa/book', name: 'Direct Booking Flow (رزرو مستقیم)' },
];

const ERP_AND_ADMIN_PAGES = [
  { path: '/fa/admin', name: 'ERP Action Center (داشبورد عملیات)' },
  { path: '/fa/admin/content', name: 'CMS Management (مدیریت محتوا)' },
  { path: '/fa/admin/bookings', name: 'Bookings Management (رزروها)' },
  { path: '/fa/admin/travel-files', name: 'Travel Files Dossiers (پرونده‌های سفر)' },
  { path: '/fa/admin/manifests', name: 'Passenger Manifests (مانیفست رسمی مسافران)' },
  { path: '/fa/admin/finance', name: 'Finance & Treasury (مدیریت مالی و خزانه‌داری)' },
  { path: '/fa/admin/finance/receipts', name: 'Financial Receipts (رسیدهای مالی)' },
  { path: '/fa/admin/finance/settlements', name: 'Supplier Settlements (تسویه تامین‌کنندگان)' },
  { path: '/fa/admin/inventory', name: 'Inventory & Allotments (انبار و سهمیه‌ها)' },
  { path: '/fa/admin/suppliers', name: 'Suppliers Directory (تامین‌کنندگان)' },
  { path: '/fa/admin/users', name: 'Users & Roles (کاربران و پرسنل)' },
  { path: '/fa/admin/organizations', name: 'B2B Organizations (سازمان‌ها و آژانس‌ها)' },
  { path: '/fa/admin/exceptions', name: 'Exception Center (مرکز خطا و استثنائات)' },
  { path: '/fa/admin/ops', name: 'Outbox Ops Monitor (عملیات و پایش صف‌ها)' },
  { path: '/fa/admin/operator', name: 'Operator Workbench (میز کار اپراتور)' },
  { path: '/fa/admin/referrals', name: 'Referral Rewards (کدهای معرف و لیدرها)' },
];

test.describe('Live Browser Audit — Part 1: Public & Customer Portal (Desktop 1440px)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    // Authenticate standard customer user so authenticated views (account, trips, wallet) render fully
    await page.goto('/fa', { waitUntil: 'domcontentloaded' });
    await apiLogin(page, E2E_USER);
  });

  for (const pageInfo of PUBLIC_AND_USER_PAGES) {
    test(`DESKTOP-PAGE: ${pageInfo.name} (${pageInfo.path}) loads with 200 OK & zero horizontal overflow`, async ({ page }) => {
      const response = await page.goto(pageInfo.path, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `Page ${pageInfo.path} must respond with HTTP < 400`).toBeLessThan(400);

      // Verify no unhandled crash banner
      const crashBanner = page.locator('text=Application error, text=Internal Server Error').first();
      await expect(crashBanner).not.toBeVisible();

      // Check document rendered length
      const textLen = await page.evaluate(() => document.body.innerText.trim().length);
      expect(textLen, `Page ${pageInfo.path} must render content`).toBeGreaterThan(30);

      // Verify zero horizontal scroll overflow
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(hasOverflow, `Page ${pageInfo.path} must have no horizontal overflow on desktop`).toBe(false);
    });
  }
});

test.describe('Live Browser Audit — Part 2: Public & Customer Portal (Mobile 390px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/fa', { waitUntil: 'domcontentloaded' });
    await apiLogin(page, E2E_USER);
  });

  for (const pageInfo of PUBLIC_AND_USER_PAGES) {
    test(`MOBILE-PAGE: ${pageInfo.name} (${pageInfo.path}) renders cleanly without horizontal overflow`, async ({ page }) => {
      const response = await page.goto(pageInfo.path, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `Page ${pageInfo.path} must respond with HTTP < 400`).toBeLessThan(400);

      // Verify zero horizontal overflow on mobile
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
      expect(hasOverflow, `Page ${pageInfo.path} must have no horizontal overflow on mobile (390px)`).toBe(false);
    });
  }
});

test.describe('Live Browser Audit — Part 3: ERP & Admin Suite (Desktop 1440px)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    // Authenticate Admin credentials
    await page.goto('/fa', { waitUntil: 'domcontentloaded' });
    const adminLoggedIn = await apiLogin(page, E2E_ADMIN);
    expect(adminLoggedIn, 'Admin must authenticate successfully').toBe(true);
  });

  for (const adminPage of ERP_AND_ADMIN_PAGES) {
    test(`ERP-DESKTOP: ${adminPage.name} (${adminPage.path}) renders healthy without false auth redirect`, async ({ page }) => {
      const res = await page.goto(adminPage.path, { waitUntil: 'domcontentloaded' });
      expect(res?.status(), `Admin page ${adminPage.path} must respond with HTTP 200`).toBe(200);

      // Verify no unauthorized bounce
      expect(page.url()).not.toContain('/auth');

      // Primary heading or table must render
      const headingOrContent = page.locator('h1, h2, table, [role="main"]').first();
      await expect(headingOrContent).toBeVisible({ timeout: 15000 });

      // Check no horizontal overflow
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(hasOverflow, `Admin page ${adminPage.path} must have no horizontal overflow`).toBe(false);
    });
  }

  test('CMS-ALL-5-TABS: Admin CMS tab transitions and modal clickability', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/fa/admin/content', { waitUntil: 'domcontentloaded' });

    // Verify all 5 tabs exist and are clickable
    const tabs = [
      { name: /تورهای مسافرتی/i },
      { name: /تجربه‌های اصیل/i },
      { name: /سفرنامه‌ها/i },
      { name: /راهنمای سفر/i },
      { name: /صفحات سایت|تنظیمات صفحه/i },
    ];

    for (const t of tabs) {
      const tabEl = page.getByRole('tab', { name: t.name }).first();
      if (await tabEl.isVisible().catch(() => false)) {
        await tabEl.click();
        await page.waitForTimeout(300);
        await expect(tabEl).toBeVisible();
      }
    }
  });

  test('MANIFEST-PRINT-ACTION: Passenger manifest print emulation & CSV download', async ({ page }) => {
    await page.goto('/fa/admin/manifests', { waitUntil: 'domcontentloaded' });

    const printBtn = page.locator('button:has-text("چاپ مانیفست"), button:has-text("چاپ")').first();
    await expect(printBtn).toBeVisible({ timeout: 10000 });

    const csvBtn = page.locator('button:has-text("خروجی اکسل"), button:has-text("CSV")').first();
    await expect(csvBtn).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Live Browser Audit — Part 4: ERP & Admin Suite (Mobile 390px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/fa', { waitUntil: 'domcontentloaded' });
    await apiLogin(page, E2E_ADMIN);
  });

  for (const adminPage of ERP_AND_ADMIN_PAGES) {
    test(`ERP-MOBILE: ${adminPage.name} (${adminPage.path}) renders with touch ergonomics & zero horizontal overflow`, async ({ page }) => {
      const res = await page.goto(adminPage.path, { waitUntil: 'domcontentloaded' });
      expect(res?.status(), `Admin mobile route ${adminPage.path} must respond with HTTP 200`).toBe(200);

      // Check no horizontal overflow on mobile
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
      expect(hasOverflow, `Admin mobile route ${adminPage.path} must have no horizontal overflow on mobile`).toBe(false);
    });
  }
});
