const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const consoleLogs = [];
  const pageErrors = [];
  const networkErrors = [];

  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => pageErrors.push(err.message));
  page.on('requestfailed', req => networkErrors.push(`${req.url()} (${req.failure()?.errorText})`));

  await page.goto('http://localhost:3000/fa', { waitUntil: 'networkidle' });

  // Evaluate DOM and layout
  const audit = await page.evaluate(() => {
    const body = document.body;
    const computedBody = window.getComputedStyle(body);
    const html = document.documentElement;

    // Check font
    const fontsLoaded = Array.from(document.fonts.values()).map(f => ({
      family: f.family,
      status: f.status,
      weight: f.weight,
    }));

    const h1 = document.querySelector('h1');
    const computedH1 = h1 ? window.getComputedStyle(h1) : null;

    // Check sections and their bounding boxes
    const sections = Array.from(document.querySelectorAll('section, main, header, footer, #main-content > div')).map(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        tag: el.tagName,
        className: (el.className || '').slice(0, 100),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        height: Math.round(rect.height),
        width: Math.round(rect.width),
        overflowX: style.overflowX,
        marginTop: style.marginTop,
        marginBottom: style.marginBottom,
      };
    });

    // Check horizontal overflow
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    const hasHorizontalOverflow = scrollWidth > clientWidth;

    // Check overlapping elements (e.g. AiPlannerHookSection vs HeroSection)
    const hero = document.querySelector('section');
    const heroRect = hero ? hero.getBoundingClientRect() : null;
    const searchWidget = document.querySelector('form') ? document.querySelector('form').closest('.rounded-3xl') : null;
    const searchRect = searchWidget ? searchWidget.getBoundingClientRect() : null;

    return {
      scrollWidth,
      clientWidth,
      hasHorizontalOverflow,
      bodyFont: computedBody.fontFamily,
      h1Font: computedH1 ? computedH1.fontFamily : null,
      fontsLoaded,
      searchRect: searchRect ? { top: searchRect.top, bottom: searchRect.bottom, height: searchRect.height } : null,
      heroRect: heroRect ? { top: heroRect.top, bottom: heroRect.bottom, height: heroRect.height } : null,
      sections,
    };
  });

  console.log('--- CONSOLE LOGS ---', consoleLogs);
  console.log('--- PAGE ERRORS ---', pageErrors);
  console.log('--- NETWORK ERRORS ---', networkErrors);
  console.log('--- AUDIT DATA ---', JSON.stringify(audit, null, 2));

  await browser.close();
})();
