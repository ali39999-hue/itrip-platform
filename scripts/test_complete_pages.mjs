import { chromium } from 'playwright';

async function testComplete() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[Console Error]: ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    pageErrors.push(`[Page Error]: ${err.message}`);
  });

  console.log('--- 1. Testing Home Page load & error-free state ---');
  await page.goto('http://localhost:3000/fa', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Check default inputs
  const fromVal = await page.locator('#search-from-input').inputValue();
  console.log('Home Flight From input default:', fromVal);

  // Click Search Flights from Home
  console.log('Clicking "جستجوی پرواز" on home page...');
  const searchFlightBtn = page.locator('button:has-text("جستجوی پرواز")').first();
  await searchFlightBtn.click();
  await page.waitForURL(url => url.pathname.includes('/flights/search'), { timeout: 6000 });
  console.log('SUCCESS: Navigated to Flight Search:', page.url());

  // Test selecting a ticket
  console.log('--- 2. Testing Flight Selection -> Checkout ---');
  const selectTicketBtn = page.locator('button:visible:has-text("انتخاب بلیط و رزرو")').first();
  await selectTicketBtn.click();
  await page.waitForURL(url => url.pathname.includes('/checkout'), { timeout: 6000 });
  console.log('SUCCESS: Navigated to Checkout:', page.url());

  // Test Hotel Search from Home
  console.log('--- 3. Testing Hotel Search from Home ---');
  await page.goto('http://localhost:3000/fa', { waitUntil: 'networkidle' });
  const hotelTab = page.locator('button:has-text("هتل")').first();
  await hotelTab.click();
  await page.waitForTimeout(500);

  const searchHotelBtn = page.locator('button:has-text("جستجوی هتل")').first();
  await searchHotelBtn.click();
  await page.waitForURL(url => url.pathname.includes('/hotels/search'), { timeout: 6000 });
  console.log('SUCCESS: Navigated to Hotel Search:', page.url());

  // Test Hotel Detail click
  console.log('--- 4. Testing Hotel Detail click ---');
  const hotelCardLink = page.locator('article a:visible:has-text("مشاهده و رزرو")').first();
  const hotelHref = await hotelCardLink.getAttribute('href');
  console.log('Clicking hotel detail link:', hotelHref);
  await hotelCardLink.click();
  await page.waitForURL(url => url.pathname.includes('/hotels/'), { timeout: 6000 });
  console.log('SUCCESS: Navigated to Hotel Detail:', page.url());

  // Test Support page
  console.log('--- 5. Testing Support Page ---');
  await page.goto('http://localhost:3000/fa/support', { waitUntil: 'networkidle' });
  const submitBtnText = await page.locator('button[type="submit"]:has-text("ارسال")').first().innerText();
  console.log('Support page submit button text:', submitBtnText);

  console.log('=== ERROR REPORT ===');
  console.log('Console errors count:', consoleErrors.length);
  for (const ce of consoleErrors) {
    console.log(ce);
  }
  console.log('Page errors count:', pageErrors.length);
  for (const pe of pageErrors) {
    console.log(pe);
  }

  if (consoleErrors.length === 0 && pageErrors.length === 0) {
    console.log('ALL TESTS PASSED WITH 0 ERRORS!');
  }

  await browser.close();
}

testComplete().catch(console.error);
