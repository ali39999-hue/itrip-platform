const { chromium } = require('@playwright/test');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:3000/fa', { waitUntil: 'networkidle' });

  // Capture Header
  await page.locator('header').screenshot({ path: path.resolve(__dirname, 'shot-header.png') });

  // Capture Hero + Search
  await page.locator('section').first().screenshot({ path: path.resolve(__dirname, 'shot-hero.png') });

  // Capture ServicesCatalog
  const servicesSec = page.locator('section:has-text("تمامی خدمات سفر")');
  if (await servicesSec.count() > 0) {
    await servicesSec.first().screenshot({ path: path.resolve(__dirname, 'shot-services.png') });
  }

  // Capture Special Offers
  const offersSec = page.locator('section:has-text("پیشنهادهای ویژه")');
  if (await offersSec.count() > 0) {
    await offersSec.first().screenshot({ path: path.resolve(__dirname, 'shot-offers.png') });
  }

  // Capture Destinations
  const destSec = page.locator('section:has-text("مسیر ایران را بسازید")');
  if (await destSec.count() > 0) {
    await destSec.first().screenshot({ path: path.resolve(__dirname, 'shot-destinations.png') });
  }

  // Capture AI Hook
  const aiSec = page.locator('section:has-text("برنامه سفر اختصاصی")');
  if (await aiSec.count() > 0) {
    await aiSec.first().screenshot({ path: path.resolve(__dirname, 'shot-ai-planner.png') });
  }

  // Capture Financial
  const finSec = page.locator('section:has-text("پرداخت بدون دغدغه")');
  if (await finSec.count() > 0) {
    await finSec.first().screenshot({ path: path.resolve(__dirname, 'shot-financial.png') });
  }

  // Capture Support
  const supSec = page.locator('section:has-text("در تمام طول سفر کنار شما هستیم")');
  if (await supSec.count() > 0) {
    await supSec.first().screenshot({ path: path.resolve(__dirname, 'shot-support.png') });
  }

  // Capture Footer
  await page.locator('footer').screenshot({ path: path.resolve(__dirname, 'shot-footer.png') });

  console.log('All individual section screenshots captured!');
  await browser.close();
})();
