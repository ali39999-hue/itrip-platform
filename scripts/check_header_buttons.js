const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await page.goto('http://localhost:3000/fa', { waitUntil: 'networkidle' });

  const btnInfo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('header button'));
    return buttons.map((b, idx) => {
      const rect = b.getBoundingClientRect();
      const style = window.getComputedStyle(b);
      return {
        idx,
        text: b.innerText.trim(),
        ariaLabel: b.getAttribute('aria-label'),
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        zIndex: style.zIndex,
      };
    });
  });

  console.log('Header buttons info:', JSON.stringify(btnInfo, null, 2));
  await browser.close();
})();
