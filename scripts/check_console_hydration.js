const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const logs = [];
  page.on('console', (msg) => {
    const text = msg.text();
    if (/hydration|Hydration|script tag|did not match|server rendered|mismatch/i.test(text)) {
      logs.push('[' + msg.type() + '] ' + text.slice(0, 400));
    }
  });
  page.on('pageerror', (err) => logs.push('[pageerror] ' + err.message.slice(0, 300)));

  await page.goto('http://localhost:3000/fa', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  // navigate client-side to trigger any client re-render issues
  await page.locator('nav[aria-label="منوی اصلی"] >> text=مقصدها').click().catch(() => {});
  await page.waitForTimeout(2500);

  console.log('--- suspicious console entries ---');
  logs.forEach((l) => console.log(l));
  if (!logs.length) console.log('(none)');
  await browser.close();
})();
