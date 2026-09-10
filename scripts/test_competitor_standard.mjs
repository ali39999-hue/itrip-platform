import { chromium } from 'playwright';

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
    locale: 'fa-IR',
  });
  const page = await context.newPage();

  console.log('=== Step 1: Flight Search (Alibaba/FlyToday standard) ===');
  await page.goto('http://127.0.0.1:3000/fa/flights/search', { waitUntil: 'networkidle' });
  await wait(2000);
  await page.screenshot({ path: 'scripts/alibaba_flight_01_initial.png' });

  // Test opening the 30-day price calendar modal
  const openCalendarModalBtn = page.locator('button:has-text("تقویم کامل قیمتی")').first();
  if (await openCalendarModalBtn.isVisible()) {
    console.log('Opening 30-day flight calendar modal...');
    await openCalendarModalBtn.click();
    await wait(800);
    await page.screenshot({ path: 'scripts/alibaba_flight_02_calendar_modal.png' });

    // Click a date inside the modal to select it
    const modalDayBtn = page.locator('div[role="dialog"] button:has-text("ارزان‌ترین"), div[role="dialog"] button:has-text("سه‌شنبه")').first();
    if (await modalDayBtn.isVisible()) {
      await modalDayBtn.click();
      await wait(1200);
      await page.screenshot({ path: 'scripts/alibaba_flight_03_date_from_modal.png' });
    }
  }

  // Test collapsing and expanding an accordion in flight sidebar
  const timeAccordionBtn = page.locator('button:has-text("ساعت پرواز")').first();
  if (await timeAccordionBtn.isVisible()) {
    console.log('Toggling time accordion...');
    // Select morning
    const morningBtn = page.locator('button:has-text("صبح")').first();
    if (await morningBtn.isVisible()) {
      await morningBtn.click();
      await wait(1000);
      await page.screenshot({ path: 'scripts/alibaba_flight_04_morning_filter.png' });
    }
  }

  console.log('=== Step 2: Hotel Search (Alibaba/FlyToday standard) ===');
  await page.goto('http://127.0.0.1:3000/fa/hotels/search?city=مشهد', { waitUntil: 'networkidle' });
  await wait(2000);
  await page.screenshot({ path: 'scripts/alibaba_hotel_01_mashhad.png' });

  // Test 5 stars filter
  const fiveStarsLabel = page.locator('label:has-text("۵ ستاره")').first();
  if (await fiveStarsLabel.isVisible()) {
    console.log('Filtering by 5-star hotel...');
    await fiveStarsLabel.click();
    await wait(1000);
    await page.screenshot({ path: 'scripts/alibaba_hotel_02_5star_filter.png' });
  }

  // Test hotel name search
  const nameInput = page.locator('input[placeholder*="نام هتل"]').first();
  if (await nameInput.isVisible()) {
    console.log('Searching hotel name "درویشی"...');
    await nameInput.fill('درویشی');
    await wait(1000);
    await page.screenshot({ path: 'scripts/alibaba_hotel_03_darvishi.png' });
  }

  console.log('=== Step 3: English LTR Cross-validation ===');
  await page.goto('http://127.0.0.1:3000/en/flights/search', { waitUntil: 'networkidle' });
  await wait(2000);
  await page.screenshot({ path: 'scripts/alibaba_flight_05_en_ltr.png' });

  await page.goto('http://127.0.0.1:3000/en/hotels/search?city=Tehran', { waitUntil: 'networkidle' });
  await wait(2000);
  await page.screenshot({ path: 'scripts/alibaba_hotel_04_en_ltr.png' });

  await browser.close();
  console.log('ALL_VERIFICATION_COMPLETE');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
