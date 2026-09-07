const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:3000/fa', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const fontStatus = await page.evaluate(async () => {
    // Check if IRANYekan is in document.fonts
    const loaded = [];
    for (const f of document.fonts) {
      loaded.push({
        family: f.family,
        status: f.status,
        weight: f.weight,
      });
    }
    
    // Check font of body and specific elements
    const body = document.body;
    const bodyStyle = window.getComputedStyle(body);
    
    const h1 = document.querySelector('h1');
    const h1Style = h1 ? window.getComputedStyle(h1) : null;
    
    const button = document.querySelector('button');
    const buttonStyle = button ? window.getComputedStyle(button) : null;

    // Test text rendering measurement
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = '24px IRANYekanXFaNum, sans-serif';
    const measureYekan = ctx.measureText('خرید آنلاین بلیط هواپیما و رزرو هتل');
    
    ctx.font = '24px sans-serif';
    const measureSans = ctx.measureText('خرید آنلاین بلیط هواپیما و رزرو هتل');

    return {
      loadedFonts: loaded,
      bodyFontFamily: bodyStyle.fontFamily,
      h1FontFamily: h1Style ? h1Style.fontFamily : null,
      buttonFontFamily: buttonStyle ? buttonStyle.fontFamily : null,
      customFontRendering: measureYekan.width !== measureSans.width,
      measureYekanWidth: measureYekan.width,
      measureSansWidth: measureSans.width,
    };
  });

  console.log('Font Status in Browser:', JSON.stringify(fontStatus, null, 2));
  await browser.close();
})();
