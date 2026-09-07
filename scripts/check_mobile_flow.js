const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  
  await page.goto('http://localhost:3000/fa', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const check = await page.evaluate(() => {
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    const hasHorizontalOverflow = scrollWidth > clientWidth;

    const overflowingElements = [];
    document.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.right > window.innerWidth + 2 && !el.closest('.overflow-x-auto') && !el.closest('.scrollbar-none')) {
        overflowingElements.push({
          tag: el.tagName,
          class: (el.className || '').slice(0, 40),
          right: Math.round(r.right),
          max: window.innerWidth,
        });
      }
    });

    return {
      scrollWidth,
      clientWidth,
      hasHorizontalOverflow,
      overflowingElements: overflowingElements.slice(0, 5),
    };
  });

  console.log('Mobile Check:', check);
  await browser.close();
})();
