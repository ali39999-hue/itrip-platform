import { test } from '@playwright/test';

const PAGES = [
  '/fa', '/fa/hotels/search', '/fa/hotels/h1', '/fa/flights/search', '/fa/tours',
  '/fa/destinations', '/fa/guide', '/fa/services', '/fa/visa', '/fa/insurance',
  '/fa/esim', '/fa/wallet', '/fa/my-trips', '/fa/auth', '/fa/support',
  '/fa/transfers', '/fa/trains', '/fa/book',
];

test('broken image scan', async ({ page }) => {
  test.setTimeout(120000);
  page.setDefaultTimeout(20000);
  for (const p of PAGES) {
    const broken: string[] = [];
    page.on('requestfailed', (req) => {
      if (req.resourceType() === 'image') broken.push('REQFAIL ' + req.url().slice(0, 90));
    });
    await page.goto('http://localhost:3000' + p, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    // scroll to trigger lazy loading
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1200);
    const zero = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img'))
        .filter((i) => i.complete && i.naturalWidth === 0 && i.src.startsWith('http'))
        .map((i) => (i as HTMLImageElement).src.slice(0, 90))
    );
    const all = [...broken, ...zero.map((s) => 'NATURAL0 ' + s)];
    if (all.length) console.log('PAGE ' + p + '\n  ' + all.join('\n  '));
    else console.log('PAGE ' + p + ' OK');
  }
});
