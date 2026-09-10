import { chromium } from 'playwright';

async function testHotelsSearch() {
  console.log('Starting Playwright test for Hotels Landing Page...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  console.log('1. Navigating to /fa/hotels...');
  await page.goto('http://localhost:3000/fa/hotels', { waitUntil: 'networkidle', timeout: 30000 });

  // Take full search bar screenshot
  await page.screenshot({ path: 'scripts/hotels_landing_01_initial.png', fullPage: false });
  console.log('Saved screenshot to scripts/hotels_landing_01_initial.png');

  // Check elements
  const destInput = await page.locator('#search-dest-input');
  const destVal = await destInput.inputValue();
  console.log('Current destination input value:', destVal);

  const checkinInput = await page.locator('#search-date-checkin');
  const checkinVal = await checkinInput.inputValue();
  console.log('Check-in input value:', checkinVal);

  const checkoutInput = await page.locator('#search-date-checkout');
  const checkoutVal = await checkoutInput.inputValue();
  console.log('Check-out input value:', checkoutVal);

  // Check nights badge
  const badgeText = await page.locator('text=شب').first().textContent();
  console.log('Nights badge text:', badgeText);

  // Check travelers summary
  const travelerText = await page.locator('button[aria-haspopup="dialog"]').textContent();
  console.log('Traveler summary text:', travelerText);

  // Check popular cities bar
  const popularLabel = await page.locator('text=شهرهای پرطرفدار:').textContent();
  console.log('Popular cities label found:', popularLabel);

  // Click on "اصفهان" in popular cities
  console.log('2. Clicking popular city "اصفهان"...');
  const isfahanBtn = page.locator('button:has-text("اصفهان")').first();
  await isfahanBtn.click();
  await page.waitForTimeout(500);

  const updatedDest = await destInput.inputValue();
  console.log('Updated destination input value after chip click:', updatedDest);

  await page.screenshot({ path: 'scripts/hotels_landing_02_isfahan_selected.png', fullPage: false });

  // Click search button
  console.log('3. Clicking "جستجوی هتل‌ها"...');
  const searchBtn = page.locator('button[type="submit"]:has-text("جستجوی هتل‌ها")');
  await searchBtn.click();

  await page.waitForURL(/hotels\/search/, { timeout: 15000 });
  console.log('Successfully navigated to:', page.url());

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scripts/hotels_landing_03_search_results.png', fullPage: false });

  console.log('\n=== ERROR REPORT ===');
  console.log('Console errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    consoleErrors.forEach((e) => console.log('Console error:', e));
  }
  console.log('Page errors count:', pageErrors.length);
  if (pageErrors.length > 0) {
    pageErrors.forEach((e) => console.log('Page error:', e));
  }

  await browser.close();
  console.log('TEST FINISHED.');
}

testHotelsSearch().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
