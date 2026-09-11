import https from 'https';

const BASE_URL = 'https://itrip-platform.vercel.app';

async function fetchText(path) {
  return new Promise((resolve) => {
    https.get(BASE_URL + path, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', (err) => resolve({ status: 0, error: err.message, body: '' }));
  });
}

async function audit() {
  console.log('=== Deep Live Website Audit ===');

  // 1. Version
  const ver = await fetchText('/api/version');
  console.log('[API /api/version]:', ver.status, ver.body ? JSON.parse(ver.body) : 'N/A');

  // 2. Capabilities
  const cap = await fetchText('/api/capabilities');
  console.log('[API /api/capabilities]:', cap.status);
  if (cap.body) {
    const json = JSON.parse(cap.body);
    console.log(' - Capability count:', Object.keys(json.capabilities || {}).length);
    console.log(' - Shetab status:', json.capabilities?.['payment.shetab']?.status);
    console.log(' - CardToCard status:', json.capabilities?.['payment.cardToCard']?.status ?? 'MISSING');
  }

  // 3. Manifest
  const man = await fetchText('/manifest.json');
  console.log('[PWA /manifest.json]:', man.status);
  if (man.body) {
    const m = JSON.parse(man.body);
    console.log(' - Name:', m.name);
    console.log(' - Short Name:', m.short_name);
    console.log(' - Description:', m.description);
  }

  // 4. Health
  const hl = await fetchText('/api/health/live');
  console.log('[/api/health/live]:', hl.status, hl.body ? JSON.parse(hl.body).status : 'N/A');
  const hr = await fetchText('/api/health/ready');
  console.log('[/api/health/ready]:', hr.status);
  if (hr.body) {
    const readyJson = JSON.parse(hr.body);
    console.log(' - Database check:', readyJson.checks?.database?.status);
    console.log(' - Outbox check:', readyJson.checks?.outbox?.status);
    console.log(' - Payment Gateway check:', readyJson.checks?.paymentGateway?.status);
  }

  // 5. Pages
  const pages = ['/fa', '/fa/flights/search', '/fa/hotels/search', '/fa/checkout', '/fa/trips', '/fa/wallet', '/fa/auth', '/fa/support', '/fa/admin'];
  for (const p of pages) {
    const res = await fetchText(p);
    console.log(`[Page ${p}]:`, res.status, `(${res.body.length} bytes)`);
    if (res.body.includes('فیروزه')) {
      console.log(`  ! Contains obsolete brand 'فیروزه'`);
    }
  }
}

audit();
