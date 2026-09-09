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
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const csrfRes = await page.request.get('http://localhost:3000/api/auth/csrf');
  const { csrfToken } = await csrfRes.json();
  const password = process.env.ADMIN_PASSWORD || readDotEnv('ADMIN_PASSWORD') || 'Admin@Firuzo2026!Secure';
  await page.request.post('http://localhost:3000/api/auth/callback/credentials', {
    form: { identifier: 'admin@firuzo.com', password, channel: 'credentials', csrfToken, json: 'true' },
  });
  await page.goto('http://localhost:3000/fa/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const candidates = await page.$$eval('a, button', (els) =>
    els
      .filter((e) => /بررسی|مغایرت|فایل/i.test(e.innerText || ''))
      .map((e) => ({ tag: e.tagName, text: (e.innerText || '').trim().slice(0, 50) }))
  );
  console.log(JSON.stringify(candidates));

  const target = page.locator('a, button').filter({ hasText: /مغایرت/ }).first();
  if (await target.isVisible().catch(() => false)) {
    const box = await target.boundingBox();
    await page.screenshot({
      path: 'screenshots/visual-review/zoom_cta.png',
      clip: { x: Math.max(0, box.x - 14), y: Math.max(0, box.y - 10), width: box.width + 28, height: box.height + 20 },
    });
    console.log('zoom saved');
  }
  await browser.close();
})();
