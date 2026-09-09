const { chromium } = require('@playwright/test');

const PAGES = [
  '/fa',
  '/fa/flights',
  '/fa/hotels',
  '/fa/tours',
  '/fa/services',
  '/fa/destinations',
  '/fa/visa',
  '/fa/insurance',
  '/fa/esim',
  '/fa/city-pass',
  '/fa/trains',
  '/fa/transfers',
  '/fa/travelogues',
  '/fa/guide',
  '/fa/support',
  '/fa/interpreter',
  '/fa/wallet',
  '/fa/account',
  '/fa/auth',
  '/fa/plan',
  '/fa/snapp',
];

(async () => {
  const browser = await chromium.launch();
  let any = false;
  for (const p of PAGES) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const hits = [];
    page.on('console', (msg) => {
      const t = msg.text();
      if (/script tag|Hydration|did not match|server rendered|recoverable/i.test(t)) {
        hits.push('[' + msg.type() + '] ' + t.slice(0, 220));
      }
    });
    page.on('pageerror', (err) => hits.push('[pageerror] ' + err.message.slice(0, 220)));
    try {
      await page.goto('http://localhost:3000' + p, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(2500);
    } catch (e) {
      hits.push('[nav-error] ' + e.message.slice(0, 120));
    }
    if (hits.length) {
      any = true;
      console.log('=== ' + p + ' ===');
      hits.forEach((h) => console.log('  ' + h));
    }
    await page.close();
  }
  if (!any) console.log('ALL CLEAN — no hydration/script-tag warnings on any page');
  await browser.close();
})();
