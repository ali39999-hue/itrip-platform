import { chromium } from 'playwright';

async function testHotelDetailPricing() {
  console.log('Testing Hotel Detail Pricing and Breakdown...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // Navigate to hotel detail page with 4 nights (2026-09-22 to 2026-09-26)
  const url = 'http://localhost:3000/fa/hotels/ir_2069?checkin=2026-09-22&checkout=2026-09-26&adults=2&children=0';
  console.log('Navigating to:', url);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  // Find room select dropdown for rate plan 2 (نرخ ویژه غیرقابل استرداد)
  // The first room has plans. Let's select 1 room.
  const selectTriggers = page.locator('#rooms [role="combobox"]');
  const count = await selectTriggers.count();
  console.log('Found room select triggers count:', count);

  // Click second plan dropdown to select 1 room
  if (count >= 2) {
    console.log('Selecting 1 room for rate plan 2...');
    await selectTriggers.nth(1).click();
    await page.waitForTimeout(300);
    // Select option with value "1"
    await page.locator('[role="option"]:has-text("۱ اتاق")').click();
    await page.waitForTimeout(500);
  }

  // Take screenshot of booking panel
  const bookingPanel = page.locator('aside');
  await bookingPanel.screenshot({ path: 'scripts/hotel_detail_booking_panel.png' });
  console.log('Saved booking panel screenshot to scripts/hotel_detail_booking_panel.png');

  // Also take full screenshot of hotel rooms + panel
  await page.screenshot({ path: 'scripts/hotel_detail_full.png', fullPage: false });
  console.log('Saved full screenshot to scripts/hotel_detail_full.png');

  // Verify texts in the panel
  const panelText = await bookingPanel.textContent();
  console.log('\n--- Booking Panel Text Extract ---');
  console.log(panelText);

  console.log('\nConsole errors count:', consoleErrors.length);
  await browser.close();
}

testHotelDetailPricing().catch((err) => {
  console.error(err);
  process.exit(1);
});
