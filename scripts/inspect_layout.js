const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  
  for (const vp of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport: vp });
    await page.goto('http://localhost:3000/fa', { waitUntil: 'networkidle' });

    console.log(`\n=================== ${vp.name.toUpperCase()} (${vp.width}x${vp.height}) ===================`);
    
    const info = await page.evaluate(() => {
      // 1. HeroSection & SearchWidget
      const hero = document.querySelector('section');
      const searchWidget = document.querySelector('.max-w-5xl.mx-auto');
      const aiHook = document.querySelector('.-mt-8');
      
      const heroRect = hero ? hero.getBoundingClientRect() : null;
      const searchRect = searchWidget ? searchWidget.getBoundingClientRect() : null;
      const aiHookRect = aiHook ? aiHook.getBoundingClientRect() : null;

      // 2. Headings and text readability
      const h1 = document.querySelector('h1');
      const h1Text = h1 ? h1.innerText : '';
      const h1Rect = h1 ? h1.getBoundingClientRect() : null;

      // 3. Search Tabs
      const searchTabs = Array.from(document.querySelectorAll('[role="tablist"] [role="tab"]')).map(t => ({
        text: t.innerText.trim(),
        selected: t.getAttribute('aria-selected') === 'true',
        rect: t.getBoundingClientRect(),
      }));

      // 4. Form inputs visible
      const inputs = Array.from(document.querySelectorAll('form input, form button')).map(el => ({
        tag: el.tagName,
        type: el.getAttribute('type'),
        placeholder: el.getAttribute('placeholder'),
        text: el.innerText ? el.innerText.trim() : '',
        rect: { top: Math.round(el.getBoundingClientRect().top), height: Math.round(el.getBoundingClientRect().height), width: Math.round(el.getBoundingClientRect().width) }
      }));

      // 5. Sections order & positions
      const allSections = Array.from(document.querySelectorAll('#main-content section, #main-content > div')).map((el, i) => {
        const r = el.getBoundingClientRect();
        const heading = el.querySelector('h1, h2, h3');
        return {
          idx: i,
          title: heading ? heading.innerText.trim().slice(0, 40) : 'No heading',
          top: Math.round(r.top + window.scrollY),
          height: Math.round(r.height),
          className: el.className ? el.className.slice(0, 60) : '',
        };
      });

      return {
        heroBottom: heroRect ? Math.round(heroRect.bottom) : null,
        searchBottom: searchRect ? Math.round(searchRect.bottom) : null,
        aiHookTop: aiHookRect ? Math.round(aiHookRect.top) : null,
        overlapHeroAiHook: (heroRect && aiHookRect) ? Math.round(heroRect.bottom - aiHookRect.top) : null,
        h1Text,
        h1Height: h1Rect ? Math.round(h1Rect.height) : null,
        searchTabs,
        inputsCount: inputs.length,
        allSections,
      };
    });

    console.log(JSON.stringify(info, null, 2));
  }

  await browser.close();
})();
