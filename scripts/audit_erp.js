const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

function readDotEnv(key) {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return undefined;
  const m = fs.readFileSync(envPath, 'utf8').match(new RegExp('^' + key + '="?([^"\\r\\n]+)"?', 'm'));
  return m ? m[1] : undefined;
}

const PAGES = [
  { name: 'dashboard', url: '/fa/admin' },
  { name: 'ops', url: '/fa/admin/ops' },
  { name: 'finance', url: '/fa/admin/finance' },
  { name: 'bookings', url: '/fa/admin/bookings' },
  { name: 'exceptions', url: '/fa/admin/exceptions' },
  { name: 'suppliers', url: '/fa/admin/suppliers' },
  { name: 'inventory', url: '/fa/admin/inventory' },
  { name: 'travel-files', url: '/fa/admin/travel-files' },
  { name: 'referrals', url: '/fa/admin/referrals' },
  { name: 'content', url: '/fa/admin/content' },
];

const WIDTHS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1024, height: 768 },
];

(async () => {
  const browser = await chromium.launch();
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w.width, height: w.height } });
    const page = await ctx.newPage();

    // Login via credentials provider (same flow as e2e helper)
    const csrfRes = await page.request.get('http://localhost:3000/api/auth/csrf');
    const { csrfToken } = await csrfRes.json();
    const password = process.env.ADMIN_PASSWORD || readDotEnv('ADMIN_PASSWORD') || 'Admin@Firuzo2026!Secure';
    await page.request.post('http://localhost:3000/api/auth/callback/credentials', {
      form: { identifier: 'admin@firuzo.com', password, channel: 'credentials', csrfToken, json: 'true' },
    });

    for (const p of PAGES) {
      try {
        await page.goto('http://localhost:3000' + p.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1200);
        const m = await page.evaluate(() => {
          const win = window.innerWidth;
          const off = [];
          if (document.body.scrollWidth > win + 2 || document.documentElement.scrollWidth > win + 2) {
            for (const el of document.querySelectorAll('*')) {
              const r = el.getBoundingClientRect();
              if (r.right > win + 2 || r.left < -2) {
                off.push({ tag: el.tagName, cls: String(el.className).slice(0, 90), l: Math.round(r.left), rgt: Math.round(r.right) });
                if (off.length >= 5) break;
              }
            }
          }
          return { win, doc: document.documentElement.scrollWidth, body: document.body.scrollWidth, off };
        });
        const overflow = m.body > m.win + 2 || m.doc > m.win + 2;
        console.log(`[${w.name}] ${p.name}: ${overflow ? 'OVERFLOW ' + JSON.stringify(m.off) : 'ok'} (doc=${m.doc} body=${m.body} win=${m.win}) url=${page.url().replace('http://localhost:3000', '')}`);
        await page.screenshot({ path: `screenshots/visual-review/erp_${p.name}_${w.name}.png` });
      } catch (e) {
        console.log(`[${w.name}] ${p.name}: ERROR ${e.message.slice(0, 120)}`);
      }
    }
    await ctx.close();
  }
  await browser.close();
  console.log('DONE');
})();
