const routes = [
  '/fa',
  '/fa/flights/search',
  '/fa/hotels/search',
  '/fa/checkout',
  '/fa/trips',
  '/fa/auth',
  '/fa/wallet',
  '/fa/support',
  '/fa/erp',
  '/fa/admin/operations/exceptions',
  '/fa/admin/travelfiles',
  '/api/version',
  '/api/capabilities',
  '/manifest.json'
];

async function check() {
  for (const r of routes) {
    try {
      const res = await fetch('https://itrip-platform.vercel.app' + r, { method: 'HEAD' });
      console.log(r, res.status);
    } catch (e) {
      console.log(r, 'ERROR', e.message);
    }
  }
}
check();
