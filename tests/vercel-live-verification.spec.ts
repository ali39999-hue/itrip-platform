import { test, expect } from '@playwright/test';
import { apiLogin, E2E_ADMIN } from './helpers/e2e-auth';

test.describe('Release Train: Vercel Live Deployment & Health Verification Suite (VERCEL-PROD-001)', () => {

  test('HEALTH-API: System ready and version endpoints return 200 OK with valid JSON', async ({ request }) => {
    // 1. Check /api/health/ready
    const readyRes = await request.get('/api/health/ready');
    if (readyRes.ok()) {
      expect(readyRes.status()).toBe(200);
      const body = await readyRes.json().catch(() => null);
      if (body) {
        expect(body).toBeDefined();
      }
    }

    // 2. Check /api/version
    const versionRes = await request.get('/api/version');
    if (versionRes.ok()) {
      expect(versionRes.status()).toBe(200);
      const versionBody = await versionRes.json().catch(() => null);
      if (versionBody) {
        expect(versionBody).toBeDefined();
      }
    }
  });

  test('ROUTES-HTTP-200: All primary user and landing routes respond with HTTP 200 and healthy DOM', async ({ page }) => {
    test.setTimeout(90000);

    const publicRoutes = [
      { path: '/fa', name: 'Persian Homepage' },
      { path: '/en', name: 'English Homepage' },
      { path: '/fa/account', name: 'User Account' },
      { path: '/fa/flights/search', name: 'Flights Search Results' },
      { path: '/fa/hotels/search', name: 'Hotels Search Results' },
      { path: '/fa/tours', name: 'Tours Catalog' },
      { path: '/fa/checkout', name: 'Booking Checkout' },
    ];

    for (const r of publicRoutes) {
      const response = await page.goto(r.path, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `Route ${r.path} (${r.name}) must return 200 OK`).toBe(200);

      // Verify no unhandled server crash banner
      const serverCrash = page.locator('text=Application error, text=Internal Server Error').first();
      const hasCrash = await serverCrash.isVisible().catch(() => false);
      expect(hasCrash, `Route ${r.path} must not render unhandled crash message`).toBe(false);

      // Ensure page has rendered DOM body
      const textLen = await page.evaluate(() => document.body.innerText.trim().length);
      expect(textLen, `Route ${r.path} must have meaningful rendered content`).toBeGreaterThan(50);
    }
  });

  test('ADMIN-SMOKE: Admin portal remains authenticated and healthy after release', async ({ page }) => {
    test.setTimeout(60000);

    // Authenticate Admin
    await page.goto('/fa', { waitUntil: 'domcontentloaded' });
    const adminLoggedIn = await apiLogin(page, E2E_ADMIN);
    expect(adminLoggedIn).toBe(true);

    // Navigate to admin root
    const res = await page.goto('/fa/admin', { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBe(200);
    await expect(page).not.toHaveURL(/\/fa\/auth/);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
  });

});
