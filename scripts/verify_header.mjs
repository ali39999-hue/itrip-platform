import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const outDir = path.resolve('./screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. English at 1440px
  console.log('Testing /en at 1440px...');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/en', { waitUntil: 'networkidle' });
  const headerEn = page.locator('header');
  await headerEn.screenshot({ path: path.join(outDir, 'header_en_1440.png') });

  // 2. English at 1366px (laptop resolution)
  console.log('Testing /en at 1366px...');
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.waitForTimeout(500);
  await headerEn.screenshot({ path: path.join(outDir, 'header_en_1366.png') });

  // 3. Persian at 1440px
  console.log('Testing /fa at 1440px...');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/fa', { waitUntil: 'networkidle' });
  const headerFa = page.locator('header');
  await headerFa.screenshot({ path: path.join(outDir, 'header_fa_1440.png') });

  // 4. Russian at 1440px
  console.log('Testing /ru at 1440px...');
  await page.goto('http://localhost:3000/ru', { waitUntil: 'networkidle' });
  const headerRu = page.locator('header');
  await headerRu.screenshot({ path: path.join(outDir, 'header_ru_1440.png') });

  // 5. Test Country Switching
  console.log('Testing Country Switcher click...');
  const countryBtn = headerEn.locator('button[aria-haspopup="listbox"]').first();
  await countryBtn.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(outDir, 'country_switcher_open.png'), clip: { x: 0, y: 0, width: 600, height: 400 } });

  await browser.close();
  console.log('All screenshots saved successfully.');
}

run().catch(console.error);
