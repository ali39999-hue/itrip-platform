const { chromium } = require('@playwright/test');
const path = require('path');

(async () => {
  try {
    console.log('Launching browser...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    console.log('Navigating to http://localhost:3000/fa ...');
    await page.goto('http://localhost:3000/fa', { waitUntil: 'networkidle', timeout: 30000 });

    const desktopPath = path.resolve(__dirname, 'homepage-desktop.png');
    await page.screenshot({ path: desktopPath, fullPage: false });
    console.log('Desktop screenshot saved to', desktopPath);

    const fullPagePath = path.resolve(__dirname, 'homepage-full.png');
    await page.screenshot({ path: fullPagePath, fullPage: true });
    console.log('Full page screenshot saved to', fullPagePath);

    // Mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1000);
    const mobilePath = path.resolve(__dirname, 'homepage-mobile.png');
    await page.screenshot({ path: mobilePath, fullPage: false });
    console.log('Mobile screenshot saved to', mobilePath);

    await browser.close();
    console.log('Done!');
  } catch (err) {
    console.error('Error capturing screenshots:', err);
    process.exit(1);
  }
})();
