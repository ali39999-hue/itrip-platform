import { chromium } from 'playwright';

async function testInteractions() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const pageErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') pageErrors.push(`[Console Error]: ${msg.text()}`);
  });
  page.on('pageerror', err => {
    pageErrors.push(`[Page Error]: ${err.message}`);
  });

  console.log('=== TEST 1: Home Page Hero Search Tabs & Submit ===');
  await page.goto('http://localhost:3000/fa', { waitUntil: 'networkidle' });

  // 1. Click Search Flights from Home Hero
  console.log('Clicking Flight Search submit button on Home...');
  const flightSearchBtn = page.locator('button:has-text("جستجوی پرواز")').first();
  if (await flightSearchBtn.isVisible()) {
    await flightSearchBtn.click();
    await page.waitForLoadState('networkidle');
    console.log('Navigated to:', page.url());
  } else {
    console.log('Flight search button not found on home!');
  }

  // 2. On Flight Search page, test clicking "انتخاب پرواز"
  console.log('=== TEST 2: Flight Search Results & Actions ===');
  const selectFlightBtn = page.locator('button:has-text("انتخاب پرواز")').first();
  if (await selectFlightBtn.isVisible()) {
    console.log('Clicking "انتخاب پرواز"...');
    await selectFlightBtn.click();
    await page.waitForTimeout(1000);
    console.log('Current URL after select flight:', page.url());
    const modalOrDrawer = await page.locator('[role="dialog"]').isVisible();
    console.log('Is dialog visible?:', modalOrDrawer);
  } else {
    console.log('No "انتخاب پرواز" button visible!');
  }

  // 3. Go back to Home, switch to Hotel Tab, and Search
  console.log('=== TEST 3: Hotel Search from Home Hero ===');
  await page.goto('http://localhost:3000/fa', { waitUntil: 'networkidle' });
  const hotelTab = page.locator('button:has-text("هتل"), button:has-text("اقامتگاه")').first();
  if (await hotelTab.isVisible()) {
    await hotelTab.click();
    await page.waitForTimeout(500);
    const hotelSearchBtn = page.locator('button:has-text("جستجوی هتل"), button:has-text("جستجوی اقامتگاه")').first();
    if (await hotelSearchBtn.isVisible()) {
      await hotelSearchBtn.click();
      await page.waitForLoadState('networkidle');
      console.log('Navigated to after hotel search:', page.url());
    }
  }

  // 4. On Hotel Search page, test clicking on a hotel card
  console.log('=== TEST 4: Hotel Search Results & Detail Navigation ===');
  const viewHotelBtn = page.locator('a:has-text("مشاهده و رزرو"), a:has-text("مشاهده هتل"), button:has-text("مشاهده")').first();
  if (await viewHotelBtn.isVisible()) {
    const href = await viewHotelBtn.getAttribute('href');
    console.log('Hotel card link href:', href);
    await viewHotelBtn.click();
    await page.waitForLoadState('networkidle');
    console.log('Navigated to hotel page:', page.url());
  } else {
    // Check if hotel card has link
    const hotelCard = page.locator('[data-testid="hotel-card"], .hotel-card, article').first();
    console.log('Hotel card locator visible:', await hotelCard.isVisible());
  }

  console.log('=== All Errors: ===');
  console.log(pageErrors);

  await browser.close();
}

testInteractions().catch(console.error);
