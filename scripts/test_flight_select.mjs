import { chromium } from 'playwright';

async function testFlightSelect() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('http://localhost:3000/fa/flights/search?from=%D8%AA%D9%87%D8%B1%D8%A7%D9%86&to=%D9%85%D8%B4%D9%87%D8%AF', { waitUntil: 'networkidle' });
  
  // Click visible "انتخاب بلیط و رزرو"
  const selectBtn = page.locator('article button:visible:has-text("انتخاب بلیط و رزرو")').first();
  await selectBtn.click();
  await page.waitForLoadState('networkidle');

  console.log('Navigated to URL:', page.url());
  console.log('Heading:', await page.locator('h1').allInnerTexts());
  console.log('Errors:', errors);

  await browser.close();
}

testFlightSelect().catch(console.error);
