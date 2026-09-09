const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

function readDotEnv(key) {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return undefined;
  const m = fs.readFileSync(envPath, 'utf8').match(new RegExp('^' + key + '="?([^"\\r\\n]+)"?', 'm'));
  return m ? m[1] : undefined;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const warnings = [];
  page.on('console', (msg) => {
    const t = msg.text();
    if (msg.type() === 'error' || msg.type() === 'warning') {
      if (!/Download the React DevTools|HMR|Vercel Web Analytics/i.test(t)) {
        warnings.push('[' + msg.type() + '] ' + t.slice(0, 300));
      }
    }
  });

  // login
  const csrfRes = await page.request.get('http://localhost:3000/api/auth/csrf');
  const { csrfToken } = await csrfRes.json();
  const password = process.env.ADMIN_PASSWORD || readDotEnv('ADMIN_PASSWORD') || 'Admin@Firuzo2026!Secure';
  await page.request.post('http://localhost:3000/api/auth/callback/credentials', {
    form: { identifier: 'admin@firuzo.com', password, channel: 'credentials', csrfToken, json: 'true' },
  });

  const pages = [
    'dashboard', 'ops', 'finance', 'bookings', 'exceptions',
    'suppliers', 'inventory', 'travel-files', 'referrals', 'content',
  ];

  for (const p of pages) {
    const before = warnings.length;
    await page.goto('http://localhost:3000/fa/admin' + (p === 'dashboard' ? '' : '/' + p), { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `screenshots/visual-review/erp2_${p}.png`, fullPage: true });
    if (warnings.length > before) {
      console.log('=== /fa/admin/' + p + ' ===');
      warnings.slice(before).forEach((w) => console.log('  ' + w));
    }
  }

  // travel file detail (Decimal leak source)
  await page.goto('http://localhost:3000/fa/admin/travel-files', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const link = page.getByRole('link', { name: /مشاهده پرونده|Open dossier/i }).first();
  if (await link.isVisible().catch(() => false)) {
    const before = warnings.length;
    await link.click();
    await page.waitForTimeout(2000);
    console.log('travel file URL:', page.url().replace('http://localhost:3000', ''));
    await page.screenshot({ path: 'screenshots/visual-review/erp2_travel-file-detail.png', fullPage: true });
    if (warnings.length > before) {
      console.log('=== travel-file detail ===');
      warnings.slice(before).forEach((w) => console.log('  ' + w));
    }
  } else {
    console.log('no dossier link found');
  }

  if (!warnings.length) console.log('NO console errors/warnings across ERP pages');
  await browser.close();
  console.log('DONE');
})();
