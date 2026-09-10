// One-off smoke check: HTTP status of key routes on localhost:3000
const base = 'http://localhost:3000';
const routes = [
  '/', '/fa', '/en', '/ar', '/zh', '/ru',
  '/fa/flights', '/fa/hotels', '/fa/tours', '/fa/events', '/fa/insurance',
  '/fa/login', '/fa/signup',
  '/fa/dashboard', '/admin', '/fa/admin/finance/receipts',
  '/api/health', '/api/health/live', '/api/health/ready', '/api/auth/providers', '/sitemap.xml', '/robots.txt',
  '/manifest.json', '/sw.js', '/offline.html', '/fa/sitemap.xml', '/fa/robots.txt', '/fa/manifest.json',
  '/fa/auth', '/fa/account', '/fa/wallet', '/fa/support', '/fa/my-trips',
];
let bad = 0;
for (const r of routes) {
  try {
    const res = await fetch(base + r, { redirect: 'manual' });
    const loc = res.headers.get('location') || '';
    if (res.status >= 400) bad++;
    console.log(String(res.status).padEnd(4), r.padEnd(30), loc);
  } catch (e) {
    bad++;
    console.log('ERR ', r, e.cause?.code || e.message);
  }
}
console.log(bad ? `\n${bad} route(s) with problems` : '\nAll routes OK');
process.exit(0);
