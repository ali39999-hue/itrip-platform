import { chromium } from 'playwright';

async function testFlightSelectDebug() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  
  page.on('console', msg => console.log(`[Browser Console]: ${msg.type()} - ${msg.text()}`));
  page.on('pageerror', err => console.error(`[Browser PageError]: ${err.message}`));

  await page.goto('http://localhost:3000/fa/flights/search?from=%D8%AA%D9%87%D8%B1%D8%A7%D9%86&to=%D9%85%D8%B4%D9%87%D8%AF', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const selectBtns = page.locator('button:visible:has-text("انتخاب بلیط و رزرو")');
  console.log('Visible select buttons count:', await selectBtns.count());

  const firstBtn = selectBtns.first();
  console.log('Clicking button...');
  await firstBtn.click();

  try {
    await page.waitForURL(url => url.pathname.includes('/checkout'), { timeout: 5000 });
    console.log('Successfully navigated to checkout:', page.url());
  } catch (e) {
    console.log('Did not navigate to checkout within 5s. Current URL:', page.url());
  }

  await browser.close();
}

testFlightSelectDebug().catch(console.error);
