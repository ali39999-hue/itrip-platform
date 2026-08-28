import { test, expect } from '@playwright/test';

const LOCALES = ['fa', 'en', 'ar'];

const ROUTES = [
  '/',
  '/flights/search',
  '/hotels/search',
  '/hotels/h1',
  '/tours',
  '/destinations',
  '/guide',
  '/travelogues',
  '/travelogues/1',
  '/services',
  '/plan',
  '/visa',
  '/insurance',
  '/esim',
  '/transfers',
  '/trains',
  '/city-pass',
  '/snapp',
  '/interpreter',
  '/checkout',
  '/payment-status',
  '/my-trips',
  '/my-trips/b-fl-1',
  '/wallet',
  '/account',
  '/support',
  '/auth',
  '/admin',
  '/admin/bookings',
  '/admin/finance',
  '/admin/content'
];

test.describe('0-to-100 Platform & Link Audit', () => {

  test('Check all routes across fa, en, and ar for 200 OK and valid links', async ({ page }) => {
    test.setTimeout(180000);

    const brokenLinks: { to: string; status: number }[] = [];
    const collectedLinks = new Set<string>();

    for (const locale of LOCALES) {
      for (const route of ROUTES) {
        const fullPath = `/${locale}${route === '/' ? '' : route}`;
        
        // 1. Visit Route
        const response = await page.goto(fullPath, { waitUntil: 'domcontentloaded' });
        expect(response?.status(), `Route ${fullPath} should return HTTP < 400`).toBeLessThan(400);

        // 2. Collect all anchor links on this page
        const pageLinks = await page.$$eval('a[href]', (anchors) => 
          anchors.map(a => a.getAttribute('href')).filter(Boolean) as string[]
        );

        for (const href of pageLinks) {
          if (href.startsWith('/') && !href.startsWith('//')) {
            collectedLinks.add(href);
          }
        }
      }
    }

    console.log(`Verified 93 total localized pages. Found ${collectedLinks.size} unique internal links.`);

    // 3. Validate collected internal links
    for (const link of collectedLinks) {
      if (link.startsWith('#') || link.startsWith('mailto:') || link.startsWith('tel:')) continue;
      
      const res = await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => null);
      const status = res ? res.status() : 0;
      
      if (status >= 400 || status === 0) {
        brokenLinks.push({ to: link, status });
        console.error(`❌ Broken Link: ${link} returned status ${status}`);
      }
    }

    console.log(`Link verification finished: ${collectedLinks.size} links checked, ${brokenLinks.length} broken links found.`);
    expect(brokenLinks.length, `Found broken links: ${JSON.stringify(brokenLinks)}`).toBe(0);
  });
});
