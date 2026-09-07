const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:3000/fa', { waitUntil: 'networkidle' });

  const errorDetails = await page.evaluate(() => {
    const errorNode = document.querySelector('nextjs-portal');
    const shadowRoot = errorNode ? errorNode.shadowRoot : null;
    let overlayText = '';
    if (shadowRoot) {
      overlayText = shadowRoot.textContent || '';
    } else {
      const anyErr = document.querySelector('[data-nextjs-dialog-header], .nextjs-container-errors-header, [data-nextjs-error-overlay]');
      overlayText = anyErr ? anyErr.textContent : 'No direct overlay class found in light DOM';
    }

    // Also check body text for errors
    return {
      hasPortal: Boolean(errorNode),
      shadowContent: overlayText.slice(0, 1000),
      bodyTextSnippet: document.body.innerText.slice(0, 500)
    };
  });

  console.log('Error Details:', errorDetails);
  await browser.close();
})();
