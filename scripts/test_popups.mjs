import { chromium } from 'playwright';

async function testPopups() {
  console.log('Testing popups on hotel detail page...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const url = 'http://localhost:3000/fa/hotels/ir_2069?checkin=2026-09-22&checkout=2026-09-26&adults=2&children=0';
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  // Look for "ویرایش مسافران و تاریخ"
  const editBtn = page.locator('button:has-text("ویرایش مسافران و تاریخ")');
  console.log('Edit button visible:', await editBtn.isVisible());

  // Click it
  await editBtn.click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'scripts/popup_click_edit.png' });
  console.log('Saved screenshot to scripts/popup_click_edit.png');

  // Check if anything popped up
  const popover = page.locator('text=تایید نفرات');
  console.log('Popover "تایید نفرات" visible:', await popover.isVisible());

  // Look for "جزئیات قیمت هر شب"
  const rateDetailBtn = page.locator('button:has-text("جزئیات قیمت هر شب")').first();
  console.log('Rate detail button visible:', await rateDetailBtn.isVisible());
  if (await rateDetailBtn.isVisible()) {
    await rateDetailBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'scripts/popup_click_rate_details.png' });
    console.log('Saved rate details screenshot to scripts/popup_click_rate_details.png');
  }

  console.log('Console errors:', consoleErrors.length);
  await browser.close();
}

testPopups().catch((err) => {
  console.error(err);
  process.exit(1);
});
