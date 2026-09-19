import fs from 'node:fs';

const BASE_URL = process.env.LIVE_BASE_URL || 'https://itrip-platform.vercel.app';

const ROUTES = [
  '/fa',
  '/fa/flights',
  '/fa/flights/search',
  '/fa/hotels',
  '/fa/hotels/search',
  '/fa/tours',
  '/fa/plan',
  '/fa/cart',
  '/fa/checkout',
  '/fa/wallet',
  '/fa/my-trips',
  '/fa/auth',
  '/fa/cip',
  '/fa/insurance',
  '/api/version',
  '/api/health/live',
  '/api/health/ready',
  '/api/capabilities',
];

async function probeRoute(path) {
  const url = `${BASE_URL}${path}`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Firuzo-Production-Auditor/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/json',
      },
      signal: AbortSignal.timeout(25000),
    });
    const durationMs = Date.now() - start;
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    let versionMatch = null;
    if (contentType.includes('application/json')) {
      try {
        const json = JSON.parse(text);
        versionMatch = json.version || null;
      } catch {}
    } else {
      // Look for v1.8.x in HTML
      const m = text.match(/v(1\.8\.\d+)/) || text.match(/version[":\s]+"?([0-9.]+)"?/i);
      versionMatch = m ? m[1] : null;
    }

    // Check for obvious SSR / error flags
    const hasInternalError = text.includes('Internal Server Error') || text.includes('Application error');
    const has404 = res.status === 404;

    return {
      path,
      url,
      status: res.status,
      durationMs,
      contentType: contentType.split(';')[0],
      detectedVersion: versionMatch,
      hasInternalError,
      has404,
      htmlLength: text.length,
    };
  } catch (err) {
    return {
      path,
      url,
      status: 0,
      durationMs: Date.now() - start,
      error: err.message,
    };
  }
}

console.log(`Probing live deployment at: ${BASE_URL}`);
const results = [];
for (const r of ROUTES) {
  process.stdout.write(`Probing ${r.padEnd(22)} ... `);
  const result = await probeRoute(r);
  results.push(result);
  console.log(`HTTP ${result.status} in ${result.durationMs}ms [version: ${result.detectedVersion || '—'}]`);
}

fs.mkdirSync('results', { recursive: true });
fs.writeFileSync('results/live-routes-probe.json', JSON.stringify(results, null, 2));
console.log('\nResults written to results/live-routes-probe.json');
