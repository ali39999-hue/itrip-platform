const { chromium } = require('@playwright/test');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const pagesToTest = [
    { name: 'home', url: '/fa' },
    { name: 'flights', url: '/fa/flights' },
    { name: 'hotels', url: '/fa/hotels' },
    { name: 'tours', url: '/fa/tours' },
    { name: 'signin', url: '/fa/auth/signin' },
  ];

  for (const p of pagesToTest) {
    // Desktop
    const dpage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await dpage.goto('http://localhost:3000' + p.url, { waitUntil: 'networkidle', timeout: 30000 });
    await dpage.screenshot({ path: path.join(__dirname, '../public', `${p.name}_full_desktop.png`), fullPage: true });
    await dpage.close();

    // Mobile
    const mpage = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
    await mpage.goto('http://localhost:3000' + p.url, { waitUntil: 'networkidle', timeout: 30000 });
    await mpage.screenshot({ path: path.join(__dirname, '../public', `${p.name}_full_mobile.png`), fullPage: true });
    await mpage.close();

    console.log('Finished ' + p.name);
  }

  await browser.close();
  console.log('All fullpage screenshots captured successfully!');
})();
