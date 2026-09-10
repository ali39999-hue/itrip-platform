import { chromium } from '@playwright/test';

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  
  // 1. Homepage
  const page1 = await context.newPage();
  await page1.goto('http://localhost:3000/fa', { waitUntil: 'networkidle' });
  await page1.screenshot({ path: '../mobile_home_fresh.png', fullPage: false });
  console.log('Home screenshot saved.');
  await page1.close();

  // 2. Flight Search
  const page2 = await context.newPage();
  await page2.goto('http://localhost:3000/fa/flights/search?origin=THR&dest=IST&date=2026-09-15', { waitUntil: 'networkidle' });
  await page2.screenshot({ path: '../mobile_search_fresh.png', fullPage: false });
  console.log('Flights search screenshot saved.');
  await page2.close();

  // 3. Hotel Search
  const page3 = await context.newPage();
  await page3.goto('http://localhost:3000/fa/hotels/search', { waitUntil: 'networkidle' });
  await page3.screenshot({ path: '../mobile_hotels_fresh.png', fullPage: false });
  console.log('Hotels search screenshot saved.');
  await page3.close();

  await browser.close();
}

capture().catch(console.error);
