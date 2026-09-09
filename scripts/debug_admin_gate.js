const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

function readDotEnv(key) {
  const envPath = path.resolve(process.cwd(), '.env');
  const m = fs.readFileSync(envPath, 'utf8').match(new RegExp('^' + key + '="?([^"\\r\\n]+)"?', 'm'));
  return m ? m[1] : undefined;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const csrfRes = await page.request.get('http://localhost:3000/api/auth/csrf');
  const { csrfToken } = await csrfRes.json();
  const password = process.env.ADMIN_PASSWORD || readDotEnv('ADMIN_PASSWORD') || 'Admin@Firuzo2026!Secure';
  const loginRes = await page.request.post('http://localhost:3000/api/auth/callback/credentials', {
    form: { identifier: 'admin@firuzo.com', password, channel: 'credentials', csrfToken, json: 'true' },
  });
  console.log('login status:', loginRes.status());
  const cookies = await page.context().cookies();
  const session = cookies.find((c) => c.name.startsWith('authjs.session-token'));
  console.log('session cookie present:', !!session);

  // Decode JWT payload (no verification — inspection only)
  if (session) {
    const payload = JSON.parse(Buffer.from(session.value.split('.')[1], 'base64url').toString('utf8'));
    console.log('JWT payload:', JSON.stringify({ sub: payload.sub, role: payload.role, permissions: payload.permissions, name: payload.name }, null, 2));
  }

  // Where does /fa/admin land?
  await page.goto('http://localhost:3000/fa/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  console.log('final URL for /fa/admin:', page.url());
  const h1 = await page.locator('h1').first().innerText().catch(() => '(no h1)');
  console.log('h1:', h1);

  await browser.close();
})();
