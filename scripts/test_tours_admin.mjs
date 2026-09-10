import { chromium } from 'playwright';

async function testToursAndAdmin() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[Console Error]: ${msg.text()}`);
  });
  page.on('pageerror', err => {
    errors.push(`[Page Error]: ${err.message}`);
  });

  console.log('--- 1. Testing /fa/admin/content ---');
  await page.goto('http://localhost:3000/fa/admin/content', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Click on Tours tab if present
  const toursTab = page.locator('button:has-text("تور"), button:has-text("Tours")').first();
  if (await toursTab.isVisible()) {
    console.log('Clicking Tours tab in admin...');
    await toursTab.click();
    await page.waitForTimeout(1000);
  }

  console.log('--- 2. Testing /fa/tours ---');
  await page.goto('http://localhost:3000/fa/tours', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  console.log('--- 3. Testing /fa/destinations ---');
  await page.goto('http://localhost:3000/fa/destinations', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  console.log('--- 4. Testing Home Page /fa ---');
  await page.goto('http://localhost:3000/fa', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  console.log('=== COLLECTED ERRORS ===');
  console.log('Errors count:', errors.length);
  for (const err of errors) {
    console.log(err);
  }

  if (errors.length === 0) {
    console.log('SUCCESS! Zero Decimal serialization errors, zero page errors!');
  }

  await browser.close();
}

testToursAndAdmin().catch(console.error);
