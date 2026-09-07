const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:3000/fa', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const sectionsData = await page.evaluate(() => {
    const sections = [];
    const main = document.querySelector('main') || document.body;
    
    // Header
    const header = document.querySelector('header');
    if (header) {
      sections.push({
        type: 'HEADER',
        text: header.innerText.replace(/\n+/g, ' | ').slice(0, 150),
        height: Math.round(header.getBoundingClientRect().height),
      });
    }

    // Direct children of main or main's container
    const container = main.querySelector('.flex.flex-col') || main;
    Array.from(container.children).forEach((child, i) => {
      const rect = child.getBoundingClientRect();
      const heading = child.querySelector('h1, h2, h3');
      sections.push({
        type: `SECTION_${i}`,
        tag: child.tagName,
        class: child.className.slice(0, 80),
        heading: heading ? heading.innerText.trim() : 'NO_HEADING',
        textPreview: child.innerText.replace(/\n+/g, ' | ').slice(0, 120),
        top: Math.round(rect.top),
        height: Math.round(rect.height),
      });
    });

    // Footer
    const footer = document.querySelector('footer');
    if (footer) {
      sections.push({
        type: 'FOOTER',
        text: footer.innerText.replace(/\n+/g, ' | ').slice(0, 150),
        height: Math.round(footer.getBoundingClientRect().height),
      });
    }

    return sections;
  });

  console.log('Homepage Sections Rendered:');
  sectionsData.forEach(s => console.log(JSON.stringify(s, null, 2)));

  await browser.close();
})();
