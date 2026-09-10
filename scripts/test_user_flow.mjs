import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`[Console Error]: ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    errors.push(`[Page Error]: ${err.message}\n${err.stack}`);
  });

  console.log('--- 1. Testing Home Page http://localhost:3000/fa ---');
  await page.goto('http://localhost:3000/fa', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'scripts/diag_01_home.png', fullPage: false });

  console.log('--- 2. Testing Flights Landing http://localhost:3000/fa/flights ---');
  await page.goto('http://localhost:3000/fa/flights', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'scripts/diag_02_flights.png', fullPage: false });

  console.log('--- 3. Testing Flights Search http://localhost:3000/fa/flights/search ---');
  await page.goto('http://localhost:3000/fa/flights/search?from=%D8%AA%D9%87%D8%B1%D8%A7%D9%86&to=%D9%85%D8%B4%D9%87%D8%AF', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'scripts/diag_03_flight_search.png', fullPage: false });

  console.log('--- 4. Testing Hotels Landing http://localhost:3000/fa/hotels ---');
  await page.goto('http://localhost:3000/fa/hotels', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'scripts/diag_04_hotels.png', fullPage: false });

  console.log('--- 5. Testing Hotels Search http://localhost:3000/fa/hotels/search ---');
  await page.goto('http://localhost:3000/fa/hotels/search?destination=%D9%85%D8%B4%D9%87%D8%AF', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'scripts/diag_05_hotel_search.png', fullPage: false });

  console.log('--- 6. Testing a Hotel Detail page ---');
  await page.goto('http://localhost:3000/fa/hotels/ht-darvishi', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'scripts/diag_06_hotel_detail.png', fullPage: false });

  console.log('--- 7. Testing Other Pages (Tours, Trains, Visa, Account) ---');
  const otherPages = [
    '/fa/tours',
    '/fa/trains',
    '/fa/visa',
    '/fa/insurance',
    '/fa/account',
    '/fa/support'
  ];

  for (const path of otherPages) {
    const res = await page.goto(`http://localhost:3000${path}`, { waitUntil: 'networkidle' });
    console.log(`Page: ${path} -> Status: ${res.status()}`);
  }

  console.log('--- Errors collected ---');
  if (errors.length === 0) {
    console.log('No console or page errors detected!');
  } else {
    for (const e of errors) {
      console.error(e);
    }
  }

  await browser.close();
}

main().catch(console.error);
