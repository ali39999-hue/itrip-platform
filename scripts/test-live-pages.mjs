import http from 'http';

const BASE_URL = 'http://localhost:3000';

const ROUTES = [
  { path: '/fa', expected: [200] },
  { path: '/en', expected: [200] },
  { path: '/ar', expected: [200] },
  { path: '/fa/flights', expected: [200] },
  { path: '/fa/flights/search?origin=THR&destination=MHD&departDate=2026-09-15', expected: [200] },
  { path: '/fa/hotels', expected: [200] },
  { path: '/fa/hotels/search?destination=THR&checkIn=2026-09-15&checkOut=2026-09-17', expected: [200] },
  { path: '/fa/tours', expected: [200] },
  { path: '/fa/trains', expected: [200] },
  { path: '/fa/esim', expected: [200] },
  { path: '/fa/auth', expected: [200] },
  { path: '/fa/support', expected: [200] },
  { path: '/fa/guide', expected: [200] },
  { path: '/fa/wallet', expected: [200, 307, 308] },
  { path: '/fa/account', expected: [200, 307, 308] },
  { path: '/fa/checkout', expected: [200] },
  { path: '/fa/demo/ecardo-checkout', expected: [200] },
  { path: '/api/assistant/chat', expected: [200, 405] },
  { path: '/api/flights/search?origin=THR&destination=MHD&date=2026-09-15', expected: [200] },
  { path: '/api/hotels/search?city=THR', expected: [200] },
  { path: '/api/travel/bootstrap', expected: [200] }
];

async function checkRoute(route) {
  const url = `${BASE_URL}${route.path}`;
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        const isExpected = route.expected.includes(res.statusCode);
        resolve({
          path: route.path,
          status: res.statusCode,
          ok: isExpected,
          bodySnippet: body.slice(0, 100).replace(/\s+/g, ' ')
        });
      });
    });
    req.on('error', (err) => {
      resolve({
        path: route.path,
        status: 'ERROR',
        ok: false,
        error: err.message
      });
    });
    req.setTimeout(15000, () => {
      req.destroy();
      resolve({
        path: route.path,
        status: 'TIMEOUT',
        ok: false
      });
    });
  });
}

async function main() {
  console.log(`Testing ${ROUTES.length} critical platform routes on ${BASE_URL}...`);
  let failures = 0;

  for (const route of ROUTES) {
    const result = await checkRoute(route);
    if (result.ok) {
      console.log(`[PASS] ${result.path} -> ${result.status}`);
    } else {
      console.error(`[FAIL] ${result.path} -> ${result.status} (expected ${route.expected.join(', ')})`);
      if (result.error) console.error(`       Error: ${result.error}`);
      failures++;
    }
  }

  console.log('----------------------------------------------------');
  if (failures === 0) {
    console.log(`ALL ${ROUTES.length} ROUTES VERIFIED SUCCESSFULLY! No server errors.`);
    process.exit(0);
  } else {
    console.error(`${failures} routes failed verification.`);
    process.exit(1);
  }
}

main();
