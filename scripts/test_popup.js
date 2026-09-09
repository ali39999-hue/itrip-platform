const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await ctx.newPage();
  // The component skips auto-open when navigator.webdriver is true — spoof it off
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));

  await page.goto('http://localhost:3000/fa', { waitUntil: 'domcontentloaded' });

  // Popup auto-opens after 6s
  await page.waitForTimeout(7000);
  const modal = page.locator('[role="dialog"][aria-label*="تورهای فیروزو"]');
  const modalCount = await modal.count();
  console.log('Tours promo modal present:', modalCount > 0);
  if (modalCount) {
    console.log('Modal visible:', await modal.isVisible());
    await page.screenshot({ path: 'screenshots/visual-review/popup_after_6s.png' });
  }

  // Where is the trigger chip after closing?
  const triggerInfo = await page.evaluate(() => {
    const chip = document.querySelector('button[aria-label*="تورهای منتخب"]');
    if (!chip) return { found: false };
    const r = chip.getBoundingClientRect();
    return { found: true, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });
  console.log('Trigger chip:', JSON.stringify(triggerInfo));

  // sessionStorage marker
  const seen = await page.evaluate(() => sessionStorage.getItem('firuzo_tours_promo_session_seen'));
  console.log('session marker:', seen);

  await browser.close();
  console.log('DONE');
})();
