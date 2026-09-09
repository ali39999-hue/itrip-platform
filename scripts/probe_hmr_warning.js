const { chromium } = require('@playwright/test');
const fs = require('fs');

const PROVIDERS = 'src/providers.tsx';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const hits = [];
  page.on('console', (msg) => {
    if (/script tag|hydration|did not match/i.test(msg.text())) {
      hits.push('[' + msg.type() + '] ' + msg.text().slice(0, 260));
    }
  });

  await page.goto('http://localhost:3000/fa', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  console.log('after fresh load, warnings:', hits.length);

  // Simulate Fast Refresh: touch providers.tsx (HMR re-renders the client tree)
  const original = fs.readFileSync(PROVIDERS, 'utf8');
  fs.writeFileSync(PROVIDERS, original.replace('export function Providers', 'export function Providers ' + '/* hmr-probe */'), 'utf8');
  await page.waitForTimeout(4000);
  console.log('after HMR touch, warnings:', hits.length);
  hits.forEach((h) => console.log(h));

  // restore
  fs.writeFileSync(PROVIDERS, original, 'utf8');
  await page.waitForTimeout(2000);
  console.log('restored file. DONE');
  await browser.close();
})();
