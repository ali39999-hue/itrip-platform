const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:3000/fa', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const found = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const loadingElements = all.filter(el => el.children.length === 0 && (el.innerText || '').includes('در حال بارگذاری'));
    return loadingElements.map(el => ({
      tagName: el.tagName,
      className: el.className,
      text: el.innerText,
      parentTag: el.parentElement ? el.parentElement.tagName : null,
      parentClass: el.parentElement ? el.parentElement.className : null,
    }));
  });

  console.log('Loading text elements:', found);
  await browser.close();
})();
