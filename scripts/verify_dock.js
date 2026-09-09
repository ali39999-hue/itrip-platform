const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();

  // ---- MOBILE ----
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await m.goto('http://localhost:3000/fa', { waitUntil: 'networkidle' });
  await m.waitForTimeout(2500);

  // 1) external fab hidden?
  const fabHidden = await m.evaluate(() => {
    const f = document.querySelector('.fzw2-fabwrap');
    return f ? getComputedStyle(f).display === 'none' : 'no-fab-in-dom';
  });
  console.log('external fzw2 fab hidden:', fabHidden);

  // 2) single dock present, icon-only on mobile
  const dock = m.locator('button[aria-label="تماس و پشتیبانی"]');
  console.log('dock count:', await dock.count());
  const dockBox = await dock.boundingBox();
  console.log('dock box:', JSON.stringify(dockBox));

  // 3) old SOS button gone (aria-label مترجم should not exist as floating button)
  console.log('old SOS floating button count:', await m.locator('button[aria-label="مترجم SOS"]').count());

  // 4) open the menu
  await dock.click();
  await m.waitForTimeout(400);
  const menu = m.locator('[role="menu"]');
  console.log('menu visible:', await menu.isVisible());
  await m.screenshot({ path: 'screenshots/visual-review/dock_menu_mobile.png', clip: { x: 0, y: 480, width: 390, height: 364 } });

  // 5) trigger call center via menu — panel should open
  await m.locator('[role="menuitem"]', { hasText: 'تماس تلفنی با فیروزو' }).click();
  await m.waitForTimeout(1200);
  const panelVisible = await m.evaluate(() => {
    const p = document.querySelector('.fzw2-panel');
    if (!p) return 'no-panel';
    const r = p.getBoundingClientRect();
    return r.top < 844 && r.height > 0 ? 'panel-open' : 'panel-offscreen(top=' + Math.round(r.top) + ')';
  });
  console.log('call panel after menu trigger:', panelVisible);
  await m.screenshot({ path: 'screenshots/visual-review/dock_callpanel_mobile.png' });
  await m.keyboard.press('Escape');
  await m.locator('body').click({ position: { x: 195, y: 300 } }).catch(() => {});
  await m.waitForTimeout(600);

  // 6) SOS modal via menu
  await dock.click();
  await m.waitForTimeout(300);
  await m.locator('[role="menuitem"]', { hasText: 'SOS' }).click();
  await m.waitForTimeout(500);
  console.log('SOS modal visible:', await m.locator('text=اتصال آنی به مترجم رسمی').isVisible().catch(() => false));
  await m.screenshot({ path: 'screenshots/visual-review/dock_sos_mobile.png' });

  // ---- DESKTOP ----
  const d = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await d.goto('http://localhost:3000/fa', { waitUntil: 'networkidle' });
  await d.waitForTimeout(2000);
  const ddock = d.locator('button[aria-label="تماس و پشتیبانی"]');
  console.log('desktop dock count:', await ddock.count());
  const dText = await ddock.innerText();
  console.log('desktop dock text:', JSON.stringify(dText.trim()));
  await ddock.click();
  await d.waitForTimeout(400);
  await d.screenshot({ path: 'screenshots/visual-review/dock_menu_desktop.png', clip: { x: 1000, y: 560, width: 440, height: 340 } });
  await d.keyboard.press('Escape');
  await d.screenshot({ path: 'screenshots/visual-review/dock_home_desktop.png' });

  await browser.close();
  console.log('DONE');
})();
