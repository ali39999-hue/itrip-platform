import { chromium } from 'playwright';

async function testHotelNavigation() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto('http://localhost:3000/fa/hotels/search?city=%D9%85%D8%B4%D9%87%D8%AF', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const hotelLink = page.locator('article a:visible:has-text("مشاهده و رزرو")').first();
  const targetHref = await hotelLink.getAttribute('href');
  console.log('Clicking link to target:', targetHref);

  await hotelLink.click();
  await page.waitForURL(url => !url.pathname.includes('/search') && url.pathname.includes('/hotels/'), { timeout: 8000 });
  
  console.log('Successfully navigated to hotel detail page:', page.url());
  console.log('Hotel page heading:', await page.locator('h1').allInnerTexts());

  await browser.close();
}

testHotelNavigation().catch(console.error);
