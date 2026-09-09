const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const targets = [
    { name: 'destinations', url: '/fa/destinations' },
    { name: 'visa', url: '/fa/visa' },
    { name: 'support', url: '/fa/support' },
  ];
  for (const t of targets) {
    const d = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await d.goto('http://localhost:3000' + t.url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await d.screenshot({ path: 'screenshots/visual-review/site_' + t.name + '_desktop.png' });
    await d.close();

    const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
    await m.goto('http://localhost:3000' + t.url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await m.screenshot({ path: 'screenshots/visual-review/site_' + t.name + '_mobile.png' });
    await m.close();
    console.log('captured', t.name);
  }
  await browser.close();
  console.log('DONE');
})();
