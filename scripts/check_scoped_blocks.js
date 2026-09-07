const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  
  for (const vp of [{ name: 'Desktop', width: 1440, height: 900 }, { name: 'Mobile', width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport: vp });
    await page.goto('http://localhost:3000/fa', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const check = await page.evaluate(() => {
      const getRect = sel => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { 
          top: Math.round(r.top + window.scrollY), 
          height: Math.round(r.height), 
          width: Math.round(r.width),
          visible: r.height > 0 && r.width > 0,
          text: el.innerText ? el.innerText.trim().slice(0, 30) : '' 
        };
      };

      return {
        hero: getRect('main section:first-of-type'),
        searchForm: getRect('main form'),
        servicesCatalog: getRect('main a[href*="/transfers"]'),
        specialOffers: getRect('main a[href*="category=signature"]'),
        destinations: getRect('main a[href*="/hotels/search?city="]'),
        aiPlannerSection: getRect('main a[href*="/plan?q="]'),
        trustMarquee: getRect('section[aria-label="Trust and security guarantees"]'),
        financialSection: getRect('main a[href*="/wallet"]'),
        supportSection: getRect('main a[href*="tel:"]'),
        footer: getRect('footer'),
      };
    });

    console.log(`\n=== Main Content Elements (${vp.name}) ===`);
    console.log(JSON.stringify(check, null, 2));
  }

  await browser.close();
})();
