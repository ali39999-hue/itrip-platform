import { chromium } from 'playwright';

async function inspectHotelDom() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  
  await page.goto('http://localhost:3000/fa/hotels/search?city=%D9%85%D8%B4%D9%87%D8%AF', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const articleCount = await page.locator('article').count();
  console.log('Article (HotelCard) count:', articleCount);

  const links = await page.locator('article a').all();
  console.log('Article links count:', links.length);
  for (const l of links) {
    console.log('Link href:', await l.getAttribute('href'), 'text:', await l.innerText());
  }

  // Also check flights search
  await page.goto('http://localhost:3000/fa/flights/search?from=%D8%AA%D9%87%D8%B1%D8%A7%D9%86&to=%D9%85%D8%B4%D9%87%D8%AF', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const flightArticles = await page.locator('article').count();
  console.log('Flight article count:', flightArticles);

  const visibleButtons = await page.locator('article button:visible').all();
  console.log('Visible buttons in flight articles count:', visibleButtons.length);
  for (let i = 0; i < Math.min(5, visibleButtons.length); i++) {
    console.log('Button text:', await visibleButtons[i].innerText());
  }

  await browser.close();
}

inspectHotelDom().catch(console.error);
