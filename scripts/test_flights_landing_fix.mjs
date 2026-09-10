import { chromium } from 'playwright';

async function testFlightsLanding() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  console.log('--- 1. Loading Flights Landing Page ---');
  await page.goto('http://localhost:3000/fa/flights', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Take screenshot of initial state
  await page.screenshot({ path: 'scripts/flights_landing_01_initial.png' });

  // Check inputs
  const fromInput = page.locator('#search-from-input');
  const toInput = page.locator('#search-to-input');
  console.log('From value:', await fromInput.inputValue());
  console.log('To value:', await toInput.inputValue());

  // 2. Test Swap
  console.log('--- 2. Testing Swap Button ---');
  const swapBtn = page.locator('button[aria-label*="جایجایی"], button[aria-label*="تغییر"]').first();
  console.log('Swap button found:', await swapBtn.count());
  await swapBtn.click();
  await page.waitForTimeout(400);
  console.log('After swap - From:', await fromInput.inputValue(), 'To:', await toInput.inputValue());
  await page.screenshot({ path: 'scripts/flights_landing_02_swapped.png' });

  // 3. Test opening destination dropdown with popular chips
  console.log('--- 3. Testing Destination Dropdown & Popular Chips ---');
  await toInput.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'scripts/flights_landing_03_dropdown.png' });

  // Click a popular chip (e.g. کیش)
  const kishChip = page.locator('button:has-text("کیش")').first();
  if (await kishChip.isVisible()) {
    console.log('Clicking "کیش" chip...');
    await kishChip.click();
    await page.waitForTimeout(300);
    console.log('To value after chip click:', await toInput.inputValue());
  }

  // 4. Test Search Submit
  console.log('--- 4. Testing Flight Search Submit ---');
  const searchBtn = page.locator('button:has-text("جستجوی پرواز")').first();
  await searchBtn.click();
  await page.waitForURL(url => url.pathname.includes('/flights/search'), { timeout: 6000 });
  console.log('SUCCESS: Navigated to:', page.url());
  await page.screenshot({ path: 'scripts/flights_landing_04_results.png' });

  console.log('Errors:', errors);
  await browser.close();
}

testFlightsLanding().catch(console.error);
