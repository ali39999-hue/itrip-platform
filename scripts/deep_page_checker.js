const http = require('http');

const PAGES = [
  { id: 2, path: '/plan', name: 'AI Planner' },
  { id: 3, path: '/flights', name: 'Flights Redirect' },
  { id: 4, path: '/flights/search', name: 'Flights Search' },
  { id: 5, path: '/flights/checkout', name: 'Flights Checkout' },
  { id: 6, path: '/hotels', name: 'Hotels Redirect' },
  { id: 7, path: '/hotels/search', name: 'Hotels Search' },
  { id: 8, path: '/hotels/1', name: 'Hotel Details' },
  { id: 9, path: '/tours', name: 'Tours & Activities' },
  { id: 10, path: '/transfers', name: 'Transfers' },
  { id: 11, path: '/trains', name: 'Trains & VIP Bus' },
  { id: 12, path: '/visa', name: 'Visa Services' },
  { id: 13, path: '/insurance', name: 'Insurance' },
  { id: 14, path: '/esim', name: 'eSIM Packages' },
  { id: 15, path: '/city-pass', name: 'City Pass' },
  { id: 16, path: '/interpreter', name: 'Live Interpreter' },
  { id: 17, path: '/destinations', name: 'Destinations' },
  { id: 18, path: '/guide', name: 'Travel Guide' },
  { id: 19, path: '/travelogues', name: 'Travelogues Feed' },
  { id: 20, path: '/travelogues/1', name: 'Travelogue Details' },
  { id: 21, path: '/snapp', name: 'Snapp Ride Recharge' },
  { id: 22, path: '/auth', name: 'Auth & KYC' },
  { id: 23, path: '/account', name: 'Account Dashboard' },
  { id: 24, path: '/wallet', name: 'Multi-Currency Wallet' },
  { id: 25, path: '/my-trips', name: 'My Trips List' },
  { id: 26, path: '/my-trips/1', name: 'Trip Itinerary Voucher' },
  { id: 27, path: '/checkout', name: 'Universal Checkout' },
  { id: 28, path: '/services', name: 'Services Catalog' },
  { id: 29, path: '/support', name: 'Support & Helpdesk' },
  { id: 30, path: '/admin', name: 'Admin Dashboard' },
  { id: 31, path: '/admin/bookings', name: 'Admin Bookings' },
  { id: 32, path: '/admin/finance', name: 'Admin Finance' },
  { id: 33, path: '/admin/content', name: 'Admin Content' },
  { id: 34, path: '/payment-status', name: 'Payment Status' },
  { id: 35, path: '/book', name: 'Quick Book Grid' },
];

const LOCALES = ['fa', 'en', 'ar', 'zh', 'ru'];

function fetchUrl(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', (err) => resolve({ error: err.message }));
  });
}

async function runAudit() {
  console.log('=== FIRUZO SYSTEMATIC PAGE-BY-PAGE AUDIT (PAGES 2 TO 35) ===\n');
  
  const results = [];
  let totalErrors = 0;
  
  for (const p of PAGES) {
    const pageResult = { id: p.id, name: p.name, path: p.path, locales: {} };
    
    for (const loc of LOCALES) {
      const url = `http://localhost:3000/${loc}${p.path}`;
      const res = await fetchUrl(url);
      
      if (res.error) {
        pageResult.locales[loc] = { ok: false, error: res.error };
        totalErrors++;
        continue;
      }
      
      const isRedirect = res.statusCode === 307 || res.statusCode === 308;
      const isOk = res.statusCode === 200 || isRedirect;
      
      const body = res.body || '';
      const hasMissingMessage = body.includes('MISSING_MESSAGE');
      const hasFormattingError = body.includes('FORMATTING_ERROR');
      const hasUnhandledError = body.includes('Unhandled Runtime Error');
      const hasSyntaxError = body.includes('SyntaxError');
      const hasTypeError = body.includes('TypeError');
      
      const errors = [];
      if (!isOk) errors.push(`HTTP ${res.statusCode}`);
      if (hasMissingMessage) errors.push('MISSING_MESSAGE');
      if (hasFormattingError) errors.push('FORMATTING_ERROR');
      if (hasUnhandledError) errors.push('Unhandled Runtime Error');
      if (hasSyntaxError) errors.push('SyntaxError');
      if (hasTypeError) errors.push('TypeError');
      
      if (errors.length > 0) {
        pageResult.locales[loc] = { ok: false, errors };
        totalErrors++;
      } else {
        pageResult.locales[loc] = { ok: true, status: res.statusCode, length: body.length };
      }
    }
    
    results.push(pageResult);
    const faStatus = pageResult.locales['fa'].ok ? '✅ PASS' : `❌ FAIL: ${JSON.stringify(pageResult.locales['fa'])}`;
    console.log(`[Page ${String(p.id).padStart(2, '0')}] ${p.name.padEnd(25)} (${p.path.padEnd(20)}) -> FA: ${faStatus}`);
  }
  
  console.log('\n-----------------------------------------------------------');
  console.log(`AUDIT COMPLETE: ${PAGES.length} pages checked across 5 languages (${PAGES.length * LOCALES.length} requests).`);
  console.log(`TOTAL ISSUES: ${totalErrors}`);
  console.log('-----------------------------------------------------------\n');
}

runAudit();
