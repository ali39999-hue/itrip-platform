const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:3000/fa', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const res = await page.evaluate(async () => {
    await document.fonts.load('24px IRANYekanXFaNum');
    await document.fonts.load('bold 24px IRANYekanXFaNum');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    ctx.font = '24px IRANYekanXFaNum, sans-serif';
    const measureYekan = ctx.measureText('خرید آنلاین بلیط هواپیما و رزرو هتل');

    ctx.font = '24px sans-serif';
    const measureSans = ctx.measureText('خرید آنلاین بلیط هواپیما و رزرو هتل');

    return {
      fontLoaded: document.fonts.check('24px IRANYekanXFaNum'),
      measureYekanWidth: measureYekan.width,
      measureSansWidth: measureSans.width,
      different: measureYekan.width !== measureSans.width
    };
  });

  console.log('Font test result:', res);
  await browser.close();
})();
