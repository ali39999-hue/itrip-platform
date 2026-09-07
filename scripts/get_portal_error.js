const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:3000/fa', { waitUntil: 'networkidle' });

  const errorDetails = await page.evaluate(() => {
    const portal = document.querySelector('nextjs-portal');
    if (!portal || !portal.shadowRoot) return 'No portal with shadowRoot';

    const root = portal.shadowRoot;
    const dialog = root.querySelector('[data-nextjs-dialog]');
    const header = root.querySelector('[data-nextjs-dialog-header]');
    const body = root.querySelector('[data-nextjs-dialog-body]');
    
    // Find all text inside shadowRoot
    const allText = root.textContent || '';
    
    // Find any red error titles
    const title = root.querySelector('h1, h2, h3, h4, h5, [data-nextjs-error-code], .nextjs-container-errors-header');

    return {
      hasDialog: Boolean(dialog),
      title: title ? title.textContent : null,
      fullShadowText: allText.slice(allText.indexOf('Error') > -1 ? allText.indexOf('Error') : 0, 2000),
    };
  });

  console.log('Error in Portal:', errorDetails);
  await browser.close();
})();
