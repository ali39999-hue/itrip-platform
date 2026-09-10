import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
  });
  const page = await context.newPage();

  const outDir = path.resolve('./screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Navigating to /fa/flights/search...');
  await page.goto('http://localhost:3000/fa/flights/search', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Full page overview in Persian
  await page.screenshot({ path: path.join(outDir, 'flight_search_fa_initial.png') });
  console.log('Saved flight_search_fa_initial.png');

  // 2. Click "Next week" on calendar
  const nextWeekBtn = page.locator('button[title*="هفته بعد"], button[title*="Next"]').first();
  if (await nextWeekBtn.isVisible()) {
    console.log('Clicking next week on calendar...');
    await nextWeekBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, 'flight_calendar_next_week.png'), clip: { x: 0, y: 100, width: 1440, height: 550 } });
  }

  // 3. Test Quick Filter: "فقط بدون توقف"
  const nonStopBtn = page.locator('button:has-text("فقط بدون توقف")').first();
  if (await nonStopBtn.isVisible()) {
    console.log('Clicking non-stop quick filter...');
    await nonStopBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, 'flight_filter_nonstop.png') });
  }

  // 4. Test Sidebar Airline search
  const airlineInput = page.locator('input[placeholder*="جستجوی نام ایرلاین"]').first();
  if (await airlineInput.isVisible()) {
    console.log('Typing in airline search...');
    await airlineInput.fill('کیش');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, 'flight_sidebar_airline_search.png'), clip: { x: 950, y: 150, width: 450, height: 700 } });
  }

  // 5. English search page
  console.log('Navigating to /en/flights/search...');
  await page.goto('http://localhost:3000/en/flights/search', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'flight_search_en.png') });
  console.log('Saved flight_search_en.png');

  await browser.close();
  console.log('All tests completed.');
}

run().catch(console.error);
