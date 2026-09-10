import fs from 'node:fs';

const BASE_URL = 'https://itrip-platform.vercel.app';

const routes = [
  { name: 'Home (fa)', path: '/fa' },
  { name: 'Home (en)', path: '/en' },
  { name: 'Home (ar)', path: '/ar' },
  { name: 'Home (zh)', path: '/zh' },
  { name: 'Home (ru)', path: '/ru' },
  { name: 'Flights Landing', path: '/fa/flights' },
  { name: 'Flight Search Results', path: '/fa/flights/search?from=THR&to=IST' },
  { name: 'Hotels Landing', path: '/fa/hotels' },
  { name: 'Hotel Search Results', path: '/fa/hotels/search?city=Tehran' },
  { name: 'Tours Catalog', path: '/fa/tours' },
  { name: 'AI Trip Planner', path: '/fa/planner' },
  { name: 'User Wallet', path: '/fa/wallet' },
  { name: 'My Trips', path: '/fa/trips' },
  { name: 'Authentication Login', path: '/fa/auth/login' },
  { name: 'Checkout Page', path: '/fa/checkout' },
  { name: 'Payment Status Page', path: '/fa/payment-status' },
  { name: 'Support / Contact', path: '/fa/support' },
  { name: 'Account / Profile', path: '/fa/account' },
  { name: 'Admin ERP Portal', path: '/fa/admin' },
  { name: 'Terms of Service', path: '/fa/terms' },
  { name: 'Privacy Policy', path: '/fa/privacy' },
  { name: 'API Health Live', path: '/api/health/live' },
  { name: 'API Health Ready', path: '/api/health/ready' },
  { name: 'API Version', path: '/api/version' },
];

async function runAudit() {
  console.log(`[audit-live-routes] Probing live deployment at: ${BASE_URL}\n`);
  const results = [];

  for (const r of routes) {
    const url = `${BASE_URL}${r.path}`;
    const start = Date.now();
    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) FiruzoProductionAuditor/1.5.7',
          'Accept-Language': 'fa,en;q=0.9',
        },
        redirect: 'follow',
      });
      const latencyMs = Date.now() - start;
      const text = await resp.text();
      const isHtml = resp.headers.get('content-type')?.includes('text/html');
      
      // Check title or JSON
      let pageTitle = '';
      if (isHtml) {
        const match = text.match(/<title[^>]*>([^<]+)<\/title>/i);
        pageTitle = match ? match[1].trim() : '';
      }

      const hasErrorSnippet = text.includes('Application error') || text.includes('Internal Server Error') || text.includes('Unhandled Runtime Error');

      results.push({
        name: r.name,
        path: r.path,
        status: resp.status,
        latencyMs,
        title: pageTitle,
        hasError: hasErrorSnippet || resp.status >= 400,
        contentLength: text.length,
      });

      console.log(`- [${resp.status}] ${r.name.padEnd(26)} (${latencyMs}ms) - ${hasErrorSnippet ? '❌ ERROR SNIPPET' : '✅ OK'} ${pageTitle ? `| "${pageTitle}"` : ''}`);
    } catch (err) {
      console.log(`- [ERR] ${r.name.padEnd(26)} - ❌ ${err.message}`);
      results.push({
        name: r.name,
        path: r.path,
        status: 0,
        latencyMs: Date.now() - start,
        hasError: true,
        error: err.message,
      });
    }
  }

  const passed = results.filter(r => !r.hasError).length;
  console.log(`\nSummary: ${passed} / ${results.length} live routes healthy.`);
}

runAudit();
