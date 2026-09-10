import { chromium } from 'playwright';

async function testHomeHotelTab() {
  console.log('Testing Home Page Hotel Tab...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('http://localhost:3000/fa', { waitUntil: 'networkidle' });

  // Click on "هتل‌ها" tab
  console.log('Clicking "هتل‌ها" tab...');
  const hotelTab = page.locator('button:has-text("هتل‌ها")').first();
  await hotelTab.click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'scripts/home_hotel_tab.png' });
  console.log('Saved screenshot to scripts/home_hotel_tab.png');

  // Verify elements
  const destVal = await page.locator('#search-dest-input').inputValue();
  console.log('Home hotel tab destination:', destVal);

  const checkinVal = await page.locator('#search-date-checkin').inputValue();
  console.log('Home hotel tab check-in:', checkinVal);

  const checkoutVal = await page.locator('#search-date-checkout').inputValue();
  console.log('Home hotel tab check-out:', checkoutVal);

  // Click on "کیش" in popular hotel cities
  console.log('Clicking "کیش"...');
  await page.locator('button:has-text("کیش")').first().click();
  await page.waitForTimeout(300);

  console.log('Clicking "جستجوی هتل‌ها"...');
  await page.locator('button[type="submit"]:has-text("جستجوی هتل‌ها")').click();

  await page.waitForURL(/hotels\/search/, { timeout: 15000 });
  console.log('Navigated URL:', page.url());

  console.log('Console errors:', consoleErrors.length);
  await browser.close();
}

testHomeHotelTab().catch((err) => {
  console.error(err);
  process.exit(1);
});
