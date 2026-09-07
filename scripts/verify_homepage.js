const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  
  for (const vp of [{ name: 'Desktop', width: 1440, height: 900 }, { name: 'Mobile', width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport: vp });
    await page.goto('http://localhost:3000/fa', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const report = await page.evaluate((vpName) => {
      const issues = [];
      const sections = [];

      // Check horizontal overflow
      const maxScrollX = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      if (maxScrollX > 2) {
        issues.push(`Page has horizontal overflow: scrollWidth (${document.documentElement.scrollWidth}) > clientWidth (${document.documentElement.clientWidth})`);
      }

      // Check elements extending outside viewport on mobile
      if (vpName === 'Mobile') {
        document.querySelectorAll('*').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.right > window.innerWidth + 5 && !el.closest('.overflow-x-auto') && !el.closest('.scrollbar-none')) {
            issues.push(`Element extends outside right boundary: <${el.tagName} class="${(el.className || '').slice(0, 50)}"> right=${Math.round(r.right)} max=${window.innerWidth}`);
          }
        });
      }

      // Check sections sequence
      const main = document.querySelector('main') || document.body;
      const directChildren = Array.from(main.querySelectorAll(':scope > .flex.flex-col > *'));
      
      let prevBottom = 0;
      directChildren.forEach((child, idx) => {
        const r = child.getBoundingClientRect();
        const heading = child.querySelector('h1, h2, h3');
        const title = heading ? heading.innerText.trim().slice(0, 35) : `Section_${idx}`;
        
        sections.push({
          idx,
          title,
          top: Math.round(r.top + window.scrollY),
          bottom: Math.round(r.bottom + window.scrollY),
          height: Math.round(r.height),
        });

        // Check overlapping between consecutive sections
        if (idx > 0 && r.top < prevBottom - 10) {
          issues.push(`Overlap detected: Section ${idx} (${title}) top=${Math.round(r.top)} < previous bottom=${Math.round(prevBottom)}`);
        }
        prevBottom = r.bottom;
      });

      // Check font family applied
      const bodyFont = window.getComputedStyle(document.body).fontFamily;
      const h1Font = document.querySelector('h1') ? window.getComputedStyle(document.querySelector('h1')).fontFamily : '';

      return {
        viewport: vpName,
        bodyFont,
        h1Font,
        sectionsCount: sections.length,
        sections,
        issuesCount: issues.length,
        issues: issues.slice(0, 5),
      };
    }, vp.name);

    console.log(`\n==== ${vp.name} Verification ====`);
    console.log(JSON.stringify(report, null, 2));
  }

  await browser.close();
})();
