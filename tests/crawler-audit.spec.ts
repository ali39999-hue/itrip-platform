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

  test('Check all routes across fa, en, and ar for 200 OK and valid links', async ({ page, request }) => {
    test.setTimeout(120000);

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

    // 3. Fast Parallel Validate collected internal links via API request
    const linkArray = Array.from(collectedLinks).filter(
      (link) => !link.startsWith('#') && !link.startsWith('mailto:') && !link.startsWith('tel:')
    );

    const results = await Promise.all(
      linkArray.map(async (link) => {
        try {
          const res = await request.get(link);
          return { to: link, status: res.status() };
        } catch {
          return { to: link, status: 0 };
        }
      })
    );

    for (const r of results) {
      if (r.status >= 400 || r.status === 0) {
        brokenLinks.push(r);
        console.error(`❌ Broken Link: ${r.to} returned status ${r.status}`);
      }
    }

    console.log(`Link verification finished: ${linkArray.length} links checked, ${brokenLinks.length} broken links found.`);
    expect(brokenLinks.length, `Found broken links: ${JSON.stringify(brokenLinks)}`).toBe(0);
  });
});
