const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await page.goto('http://localhost:3000/fa', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500); // lazyOnload widget

  const info = await page.evaluate(() => {
    const panel = document.querySelector('.fzw2-panel') || document.querySelector('[class*="fzw2"]');
    if (!panel) return { found: false };
    const all = document.querySelectorAll('[class*="fzw2"]');
    return {
      found: true,
      count: all.length,
      classes: Array.from(all).map((el) => el.className),
      rects: Array.from(all).map((el) => {
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      }),
      zIndexes: Array.from(all).map((el) => window.getComputedStyle(el).zIndex),
    };
  });
  console.log(JSON.stringify(info, null, 2));

  // Also measure the yellow CTA position on initial viewport
  const cta = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter((b) => b.innerText.includes('جستجوی پروازها'));
    return btns.map((b) => {
      const r = b.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    });
  });
  console.log('CTA rects:', JSON.stringify(cta));

  await browser.close();
})();
