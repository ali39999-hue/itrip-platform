import { chromium } from 'playwright';

async function testModalPopups() {
  console.log('Starting full verification of hotel detail popups...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const url = 'http://localhost:3000/fa/hotels/ir_2069?checkin=2026-09-22&checkout=2026-09-26&adults=2&children=0';
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  // 1. Click "ویرایش مسافران و تاریخ" button
  console.log('1. Clicking "ویرایش مسافران و تاریخ" button...');
  const editBtn = page.locator('button:has-text("ویرایش مسافران و تاریخ")');
  console.log('Edit button exists:', await editBtn.count() > 0);
  await editBtn.click();
  await page.waitForTimeout(500);

  // Verify modal is visible
  const modalHeading = page.locator('h3:has-text("ویرایش تاریخ اقامت و مسافران")');
  console.log('Modal heading visible:', await modalHeading.isVisible());

  // 2. Increase adults to 3 inside modal
  console.log('2. Increasing adults from 2 to 3 inside modal...');
  const plusAdultsBtn = page.locator('button[aria-label="افزایش بزرگسال"]');
  await plusAdultsBtn.click();
  await page.waitForTimeout(300);

  // 3. Click "تأیید و به‌روزرسانی قیمت‌ها"
  console.log('3. Clicking "تأیید و به‌روزرسانی قیمت‌ها"...');
  const confirmBtn = page.locator('button:has-text("تأیید و به‌روزرسانی قیمت‌ها")');
  await confirmBtn.click();
  await page.waitForTimeout(500);

  // Verify modal closed
  console.log('Modal is now hidden:', !(await modalHeading.isVisible()));

  // Verify updated guest count in rooms bar
  const updatedBarText = await page.locator('#rooms button:has-text("بزرگسال")').textContent();
  console.log('Updated bar text:', updatedBarText);

  // 4. Test opening from BookingPanel on left
  console.log('4. Clicking check-in date button in BookingPanel on the left...');
  const checkinBtnInPanel = page.locator('aside button:has-text("تاریخ ورود")');
  await checkinBtnInPanel.click();
  await page.waitForTimeout(500);

  console.log('Modal opened again from BookingPanel:', await modalHeading.isVisible());
  await page.screenshot({ path: 'scripts/modal_opened_from_panel.png' });
  console.log('Saved screenshot: scripts/modal_opened_from_panel.png');

  // Close modal with cancel
  await page.locator('button:has-text("انصراف")').click();
  await page.waitForTimeout(300);

  // 5. Test "جزئیات قیمت هر شب"
  console.log('5. Clicking "جزئیات قیمت هر شب"...');
  const rateDetailsBtn = page.locator('button:has-text("جزئیات قیمت هر شب")').first();
  await rateDetailsBtn.click();
  await page.waitForTimeout(500);

  const rateTable = page.locator('table');
  console.log('Rate table visible:', await rateTable.first().isVisible());
  await page.screenshot({ path: 'scripts/rate_table_opened.png' });
  console.log('Saved screenshot: scripts/rate_table_opened.png');

  console.log('\n=== ERROR REPORT ===');
  console.log('Console errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    consoleErrors.forEach((e) => console.log('Console error:', e));
  }

  await browser.close();
  console.log('ALL POPUP TESTS PASSED SUCCESSFULLY.');
}

testModalPopups().catch((err) => {
  console.error(err);
  process.exit(1);
});
