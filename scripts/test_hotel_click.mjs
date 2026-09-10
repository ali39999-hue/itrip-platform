import { chromium } from 'playwright';

async function testHotelClick() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  
  await page.goto('http://localhost:3000/fa/hotels/search?city=%D9%85%D8%B4%D9%87%D8%AF', { waitUntil: 'networkidle' });
  console.log('Hotel search loaded. Finding hotel link...');

  const bookBtn = page.locator('a[href*="/hotels/"]').first();
  console.log('Link count:', await bookBtn.count());
  const href = await bookBtn.getAttribute('href');
  console.log('First hotel link href:', href);

  await bookBtn.click();
  await page.waitForLoadState('networkidle');
  console.log('Navigated URL:', page.url());
  console.log('Heading:', await page.locator('h1').allInnerTexts());

  await browser.close();
}

testHotelClick().catch(console.error);
