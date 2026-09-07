const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:3000/fa', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const data = await page.evaluate(() => {
    const hero = document.querySelector('section');
    const heroRect = hero ? hero.getBoundingClientRect() : null;

    const searchBox = document.querySelector('form');
    const searchWidget = searchBox ? searchBox.closest('.max-w-5xl') : null;
    const searchRect = searchWidget ? searchWidget.getBoundingClientRect() : null;

    const nextSection = document.querySelector('.-mt-8') || document.querySelectorAll('section')[1];
    const nextRect = nextSection ? nextSection.getBoundingClientRect() : null;

    return {
      hero: heroRect ? { top: heroRect.top, bottom: heroRect.bottom, height: heroRect.height } : null,
      searchWidget: searchRect ? { top: searchRect.top, bottom: searchRect.bottom, height: searchRect.height } : null,
      nextSection: nextRect ? { top: nextRect.top, bottom: nextRect.bottom, height: nextRect.height } : null,
      overlap: (searchRect && nextRect) ? (searchRect.bottom - nextRect.top) : 0,
    };
  });

  console.log('Desktop Layout:', data);

  // Now Mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);

  const mobileData = await page.evaluate(() => {
    const hero = document.querySelector('section');
    const heroRect = hero ? hero.getBoundingClientRect() : null;

    const searchBox = document.querySelector('form');
    const searchWidget = searchBox ? searchBox.closest('.max-w-5xl') : null;
    const searchRect = searchWidget ? searchWidget.getBoundingClientRect() : null;

    const nextSection = document.querySelector('.-mt-8') || document.querySelectorAll('section')[1];
    const nextRect = nextSection ? nextSection.getBoundingClientRect() : null;

    return {
      hero: heroRect ? { top: heroRect.top, bottom: heroRect.bottom, height: heroRect.height } : null,
      searchWidget: searchRect ? { top: searchRect.top, bottom: searchRect.bottom, height: searchRect.height } : null,
      nextSection: nextRect ? { top: nextRect.top, bottom: nextRect.bottom, height: nextRect.height } : null,
      overlap: (searchRect && nextRect) ? (searchRect.bottom - nextRect.top) : 0,
    };
  });

  console.log('Mobile Layout:', mobileData);

  await browser.close();
})();
