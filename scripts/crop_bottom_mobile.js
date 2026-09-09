const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await page.goto('http://localhost:3000/fa/wallet', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  // Bottom strip where floating widgets live
  await page.screenshot({ path: 'public/mobile_wallet_bottom.png', clip: { x: 0, y: 580, width: 390, height: 264 } });

  // Same area on homepage
  await page.goto('http://localhost:3000/fa', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'public/mobile_home_bottom.png', clip: { x: 0, y: 580, width: 390, height: 264 } });

  await browser.close();
  console.log('DONE');
})();
