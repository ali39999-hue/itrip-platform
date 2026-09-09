const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const failed = [];
  page.on('requestfailed', (r) => { if (r.resourceType() === 'image') failed.push(r.url().slice(0, 120) + ' :: ' + (r.failure() || {}).errorText); });
  page.on('response', (res) => { if (res.status() >= 400 && res.request().resourceType() === 'image') failed.push('HTTP ' + res.status() + ' ' + res.url().slice(0, 120)); });

  await page.goto('http://localhost:3000/fa/destinations', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const imgs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).slice(0, 12).map((img) => ({
      src: (img.currentSrc || img.src || '').slice(0, 110),
      nw: img.naturalWidth,
      visible: img.offsetWidth > 0,
    }));
  });
  console.log('IMAGES:', JSON.stringify(imgs, null, 1));
  console.log('FAILED IMAGE REQUESTS:', JSON.stringify(failed, null, 1));
  await browser.close();
})();
