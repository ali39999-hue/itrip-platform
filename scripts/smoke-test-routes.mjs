// Simple route smoke tester
const BASE = 'http://127.0.0.1:3000';
const routes = [
  '/',
  '/fa',
  '/en',
  '/fa/flights',
  '/fa/hotels',
  '/fa/tours',
  '/fa/authentic-experiences',
  '/fa/auth',
  '/fa/cart',
  '/fa/wallet',
  '/fa/my-trips',
  '/fa/esim',
  '/fa/guide',
  '/fa/interpreter',
  '/fa/checkout',
  '/fa/admin',
  '/api/health/ready'
];

async function run() {
  console.log('Testing routes against ' + BASE);
  for (const r of routes) {
    const start = Date.now();
    try {
      const res = await fetch(BASE + r, { redirect: 'manual' });
      const elapsed = Date.now() - start;
      console.log(`[${res.status}] ${r} (${elapsed}ms)`);
      if (res.status >= 500) {
        const text = await res.text();
        console.error(`ERROR on ${r}:`, text.slice(0, 300));
      }
    } catch (err) {
      console.error(`FETCH FAILED for ${r}:`, err.message);
    }
  }
}

run();
