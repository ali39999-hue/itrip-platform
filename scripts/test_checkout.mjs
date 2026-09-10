import { chromium } from 'playwright';

async function testCheckout() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[Console Error]: ${msg.text()}`);
  });
  page.on('pageerror', err => {
    errors.push(`[Page Error]: ${err.message}`);
  });

  await page.goto('http://localhost:3000/fa/flights/search?from=%D8%AA%D9%87%D8%B1%D8%A7%D9%86&to=%D9%85%D8%B4%D9%87%D8%AF', { waitUntil: 'networkidle' });
  console.log('Flight search page loaded. Clicking "انتخاب بلیط و رزرو"...');
  
  const selectBtn = page.locator('button:has-text("انتخاب بلیط")').first();
  await selectBtn.click();
  await page.waitForTimeout(1500);
  console.log('Current URL after click:', page.url());

  console.log('Page title/heading:', await page.locator('h1').allInnerTexts());
  await page.screenshot({ path: 'scripts/diag_checkout.png' });

  if (errors.length > 0) {
    console.log('Errors:', errors);
  } else {
    console.log('No errors on checkout!');
  }

  await browser.close();
}

testCheckout().catch(console.error);
