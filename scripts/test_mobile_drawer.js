const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await page.goto('http://localhost:3000/fa', { waitUntil: 'networkidle' });

  const menuBtn = page.locator('header button[aria-label="باز کردن منو"]');
  console.log('Menu button count:', await menuBtn.count());
  await menuBtn.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'public/mobile_menu_open.png' });

  const drawer = page.locator('[role="dialog"][aria-label="ناوبری موبایل"]');
  console.log('Drawer visible:', await drawer.isVisible());
  console.log('Links in drawer:', await drawer.locator('a').count());

  await drawer.locator('button[aria-label="بستن منو"]').click();
  await page.waitForTimeout(500);
  console.log('Drawer closed:', !(await drawer.isVisible().catch(() => false)));

  await page.getByRole('link', { name: 'کیف پول', exact: true }).click();
  await page.waitForTimeout(1500);
  console.log('URL after bottom-nav wallet tap:', page.url());
  await page.screenshot({ path: 'public/mobile_wallet.png' });

  await browser.close();
  console.log('DONE');
})();
