const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  
  for (const vp of [{ name: 'Desktop', width: 1440, height: 900 }, { name: 'Mobile', width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport: vp });
    await page.goto('http://localhost:3000/fa', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const detailedAudit = await page.evaluate(() => {
      const results = [];

      // 1. Search Box State
      const activeTab = document.querySelector('[role="tab"][aria-selected="true"]');
      const tabName = activeTab ? activeTab.innerText.trim() : 'NONE';
      const inputs = Array.from(document.querySelectorAll('form input')).map(inp => ({
        id: inp.id,
        placeholder: inp.placeholder,
        value: inp.value,
        rect: { width: Math.round(inp.getBoundingClientRect().width), height: Math.round(inp.getBoundingClientRect().height) }
      }));
      const submitBtn = document.querySelector('form button[type="submit"]');

      results.push({
        section: 'SEARCH_ENGINE',
        activeTab: tabName,
        inputsCount: inputs.length,
        inputs,
        submitText: submitBtn ? submitBtn.innerText.trim() : 'NONE',
      });

      // 2. Services Grid
      const services = Array.from(document.querySelectorAll('a[href*="/flights"], a[href*="/hotels"], a[href*="/tours"], a[href*="/trains"]')).map(a => a.innerText.trim().split('\n')[0]);
      results.push({
        section: 'SERVICES_GRID',
        count: services.length,
        items: services.slice(0, 8),
      });

      // 3. Offers
      const offers = Array.from(document.querySelectorAll('a[href*="category=signature"]')).map(a => a.querySelector('h3')?.innerText.trim());
      results.push({
        section: 'SPECIAL_OFFERS',
        items: offers.filter(Boolean),
      });

      // 4. Destinations
      const destinations = Array.from(document.querySelectorAll('a[href*="/hotels/search?city="]')).map(a => a.querySelector('h3')?.innerText.trim());
      results.push({
        section: 'DESTINATIONS',
        items: destinations.filter(Boolean),
      });

      return results;
    });

    console.log(`\n================= ${vp.name} DETAILED AUDIT =================`);
    console.log(JSON.stringify(detailedAudit, null, 2));
  }

  await browser.close();
})();
