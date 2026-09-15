import http from 'node:http';

const TARGET_BASE = 'http://localhost:3000';

const ROUTES_TO_TEST = [
  { name: 'Root Home', path: '/' },
  { name: 'Persian Home', path: '/fa' },
  { name: 'Flight Search', path: '/fa/flights/search?from=THR&to=IST' },
  { name: 'Hotel Search', path: '/fa/hotels/search?city=istanbul' },
  { name: 'Cart and Checkout', path: '/fa/checkout' },
  { name: 'My Trips', path: '/fa/my-trips' },
  { name: 'Admin Manifests', path: '/fa/admin/manifests' },
  { name: 'Health Ready API', path: '/api/health/ready' }
];

let testResults = [];

async function auditRoute(route) {
  const url = `${TARGET_BASE}${route.path}`;
  const start = Date.now();
  const resObj = {
    name: route.name,
    path: route.path,
    url,
    status: null,
    ok: false,
    durationMs: 0,
    contentType: null,
    redirected: false,
    finalUrl: null,
    htmlAnalysis: null,
    error: null
  };

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'LiveQA-Bot/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      redirect: 'follow'
    });

    resObj.status = res.status;
    resObj.ok = res.ok;
    resObj.durationMs = Date.now() - start;
    resObj.contentType = res.headers.get('content-type') || '';
    resObj.redirected = res.redirected;
    resObj.finalUrl = res.url;

    const bodyText = await res.text();
    resObj.bodyLength = bodyText.length;

    // Analyze HTML content
    if (resObj.contentType.includes('text/html')) {
      const titleMatch = bodyText.match(/<title[^>]*>([^<]+)<\/title>/i);
      const hasHydrationMismatch = bodyText.includes('Hydration failed') ||
                                   bodyText.includes('hydration-error') ||
                                   bodyText.includes('Minified React error #418') ||
                                   bodyText.includes('Minified React error #423') ||
                                   bodyText.includes('Minified React error #425');

      const hasServerError = bodyText.includes('Application error: a client-side exception has occurred') ||
                             bodyText.includes('Internal Server Error') ||
                             bodyText.includes('Server Error');

      // Asset references
      const scripts = [...bodyText.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);
      const stylesheets = [...bodyText.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi)].map(m => m[1]);
      const fonts = [...bodyText.matchAll(/<link[^>]+as=["']font["'][^>]+href=["']([^"']+)["']/gi)].map(m => m[1]);
      const images = [...bodyText.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);

      // CSS variables inspection
      const hasThemeVars = bodyText.includes('--background') || bodyText.includes('--ink') || bodyText.includes('font-sans');

      resObj.htmlAnalysis = {
        title: titleMatch ? titleMatch[1].trim() : '(no title)',
        hasHydrationMismatch,
        hasServerError,
        scriptCount: scripts.length,
        styleSheetCount: stylesheets.length,
        fontCount: fonts.length,
        imageCount: images.length,
        sampleStyles: stylesheets.slice(0, 3),
        sampleImages: images.slice(0, 5),
        sampleFonts: fonts.slice(0, 3),
        hasThemeVars
      };
    }
  } catch (err) {
    resObj.durationMs = Date.now() - start;
    resObj.error = err.message;
  }

  return resObj;
}

async function runAllChecks() {
  console.log('====================================================');
  console.log('STARTING LIVE QA AUDIT ON ' + TARGET_BASE);
  console.log('Time: ' + new Date().toISOString());
  console.log('====================================================\n');

  testResults = [];
  for (const route of ROUTES_TO_TEST) {
    console.log(`Checking [${route.name}] -> ${route.path}...`);
    const res = await auditRoute(route);
    testResults.push(res);
    console.log(`Result: Status ${res.status} (${res.durationMs}ms) | Redirected: ${res.redirected ? res.finalUrl : 'No'}`);
    if (res.error) {
      console.error(`  ERROR: ${res.error}`);
    }
    if (res.htmlAnalysis) {
      console.log(`  Title: ${res.htmlAnalysis.title}`);
      console.log(`  Hydration Issue: ${res.htmlAnalysis.hasHydrationMismatch} | Server Error Flag: ${res.htmlAnalysis.hasServerError}`);
      console.log(`  Assets: ${res.htmlAnalysis.scriptCount} scripts, ${res.htmlAnalysis.styleSheetCount} stylesheets, ${res.htmlAnalysis.fontCount} fonts, ${res.htmlAnalysis.imageCount} images`);
    }
    console.log('----------------------------------------------------');
  }

  console.log('\n====================================================');
  console.log('AUDIT SUMMARY:');
  const passing = testResults.filter(r => r.ok).length;
  console.log(`Passed: ${passing}/${testResults.length}`);
  for (const r of testResults) {
    console.log(`- ${r.name.padEnd(20)}: ${r.ok ? 'PASS (200)' : 'FAIL (' + r.status + ')'} [${r.durationMs}ms]`);
  }
  console.log('====================================================\n');
}

const server = http.createServer((req, res) => {
  if (req.url === '/results') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(testResults, null, 2));
  } else if (req.url === '/rerun') {
    runAllChecks().then(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'completed', results: testResults }, null, 2));
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('QA Runner Active. Endpoints: /results, /rerun');
  }
});

const PORT = 3099;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`QA Runner listening on http://127.0.0.1:${PORT}`);
  runAllChecks();
});
