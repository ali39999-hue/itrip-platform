const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:3000/fa', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const sub = await page.evaluate(() => {
    const parent = document.querySelector('.flex.flex-col.gap-12, .flex.flex-col.gap-16');
    if (!parent) return [];
    return Array.from(parent.children).map((c, i) => {
      const r = c.getBoundingClientRect();
      const h = c.querySelector('h1, h2, h3, h4');
      return {
        i,
        tag: c.tagName,
        heading: h ? h.innerText.trim() : 'NO_HEADING',
        top: Math.round(r.top),
        height: Math.round(r.height),
        className: c.className.slice(0, 60),
      };
    });
  });

  console.log('Homepage Flow in browser:');
  sub.forEach(s => console.log(`  [${s.i}] <${s.tag}> ${s.heading} (height: ${s.height}px)`));

  await browser.close();
})();
