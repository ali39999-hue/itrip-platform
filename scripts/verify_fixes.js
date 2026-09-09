const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 3 });
  await page.goto('http://localhost:3000/fa', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // Measure FAB / label / tours chip / CTA after fixes
  const m = await page.evaluate(() => {
    const rect = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const overlap = (a, b) => {
      if (!a || !b) return 0;
      const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
      const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      return x * y;
    };
    const cta = rect('button.bg-action');
    const fab = rect('.fzw2-fab');
    const label = rect('.fzw2-label');
    const labelDisplay = label ? getComputedStyle(document.querySelector('.fzw2-label')).display : 'n/a';
    const fabZ = getComputedStyle(document.querySelector('.fzw2-fabwrap')).zIndex;

    // tours chip: find button with Compass (aria-label مشاهده تورها)
    const chip = document.querySelector('button[aria-label*="تورهای منتخب"]');
    const chipR = chip ? chip.getBoundingClientRect() : null;

    return {
      cta,
      fab,
      labelRect: label,
      labelDisplay,
      fabZ,
      fabCtaOverlapPx2: overlap(fab, cta),
      chip: chipR ? { x: Math.round(chipR.x), y: Math.round(chipR.y), w: Math.round(chipR.width), h: Math.round(chipR.height) } : null,
      chipCtaOverlapPx2: chipR ? overlap({ x: chipR.x, y: chipR.y, w: chipR.width, h: chipR.height }, cta) : 0,
    };
  });
  console.log(JSON.stringify(m, null, 2));

  await page.screenshot({ path: 'screenshots/visual-review/fixed_home_bottom.png', clip: { x: 0, y: 640, width: 390, height: 204 } });

  // Drawer over FAB check
  await page.locator('header button[aria-label="باز کردن منو"]').click();
  await page.waitForTimeout(700);
  const drawerCheck = await page.evaluate(() => {
    const fab = document.querySelector('.fzw2-fabwrap');
    if (!fab) return { fabFound: false };
    const el = document.elementFromPoint(43, 729); // FAB center
    return { fabFound: true, topElementAtFabPoint: el ? (el.className || el.tagName).toString().slice(0, 80) : 'none' };
  });
  console.log('Drawer-over-FAB:', JSON.stringify(drawerCheck));
  await page.screenshot({ path: 'screenshots/visual-review/fixed_drawer.png' });

  await browser.close();
  console.log('DONE');
})();
