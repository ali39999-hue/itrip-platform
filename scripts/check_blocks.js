const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  
  for (const vp of [{ name: 'Desktop', width: 1440, height: 900 }, { name: 'Mobile', width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport: vp });
    await page.goto('http://localhost:3000/fa', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const check = await page.evaluate(() => {
      const getRect = sel => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top + window.scrollY), height: Math.round(r.height), visible: r.height > 0 && r.width > 0 };
      };

      return {
        hero: getRect('section:first-of-type'),
        searchWidget: getRect('form'),
        servicesCatalog: getRect('a[href*="/transfers"]'),
        specialOffers: getRect('a[href*="category=signature"]'),
        destinations: getRect('a[href*="/hotels/search?city="]'),
        aiPlanner: getRect('a[href="/plan"]'),
        trustMarquee: getRect('section[aria-label="Trust and security guarantees"]'),
        financial: getRect('a[href="/wallet"]'),
        support: getRect('a[href="/support"]'),
        footer: getRect('footer'),
      };
    });

    console.log(`\n=== Visual Blocks Verification (${vp.name}) ===`);
    console.log(JSON.stringify(check, null, 2));
  }

  await browser.close();
})();
