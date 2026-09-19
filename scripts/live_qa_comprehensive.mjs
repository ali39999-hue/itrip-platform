import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const BASE_URL = 'http://localhost:3000';

const PAGES_TO_TEST = [
  { name: 'Root Home', url: '/', auth: false },
  { name: 'Persian Home', url: '/fa', auth: false },
  { name: 'Flight Search (THR -> IST)', url: '/fa/flights/search?from=THR&to=IST', auth: false },
  { name: 'Hotel Search (Istanbul)', url: '/fa/hotels/search?city=istanbul', auth: false },
  { name: 'Cart and Checkout', url: '/fa/checkout', auth: false },
  { name: 'My Trips', url: '/fa/my-trips', auth: false },
  { name: 'Admin Manifests (Unauthenticated)', url: '/fa/admin/manifests', auth: false },
  { name: 'Admin Manifests (Authenticated)', url: '/fa/admin/manifests', auth: true },
  { name: 'Health Ready API', url: '/api/health/ready', auth: false },
  { name: 'Health Live API', url: '/api/health/live', auth: false },
  { name: 'Flights Landing', url: '/fa/flights', auth: false },
  { name: 'Hotels Landing', url: '/fa/hotels', auth: false },
  { name: 'Tours Landing', url: '/fa/tours', auth: false },
  { name: 'Auth Page', url: '/fa/auth', auth: false }
];

async function runLiveAudit() {
  console.log('\n================================================================');
  console.log('FIRUZO / iTRIP PLATFORM — COMPREHENSIVE LIVE QA AUDIT');
  console.log(`Target: ${BASE_URL} | Time: ${new Date().toISOString()}`);
  console.log('================================================================\n');

  let playwright = null;
  try {
    const pw = await import('@playwright/test');
    playwright = pw.chromium;
    console.log('[QA] Playwright Chromium engine detected and loaded.');
  } catch (err) {
    console.log('[QA] Playwright import error:', err.message);
  }

  // -------------------------------------------------------------
  // PHASE 1: HTTP Endpoint Verification & HTML Structure Analysis
  // -------------------------------------------------------------
  console.log('--- PHASE 1: HTTP Endpoint Verification ---');
  const discoveredAssets = new Set();
  const httpReports = [];

  for (const item of PAGES_TO_TEST) {
    if (item.auth) continue; // Authenticated tested via Playwright / session

    const fullUrl = `${BASE_URL}${item.url}`;
    const start = Date.now();
    try {
      const res = await fetch(fullUrl, {
        headers: { 'User-Agent': 'LiveQA/1.0', 'Accept': 'text/html,*/*' },
        redirect: 'follow'
      });
      const duration = Date.now() - start;
      const text = await res.text();
      const contentType = res.headers.get('content-type') || '';

      const scripts = [...text.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);
      const stylesheets = [...text.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi)].map(m => m[1]);
      const images = [...text.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);
      const preloadFonts = [...text.matchAll(/<link[^>]+as=["']font["'][^>]+href=["']([^"']+)["']/gi)].map(m => m[1]);

      for (const s of scripts) discoveredAssets.add(s);
      for (const ss of stylesheets) discoveredAssets.add(ss);
      for (const img of images) discoveredAssets.add(img);
      for (const f of preloadFonts) discoveredAssets.add(f);

      const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : '(none)';

      const hasHydrationMismatch = /Hydration failed|hydration-error|Minified React error #(418|423|425)/i.test(text);
      const hasServerError = /Application error|Internal Server Error|Server Error/i.test(text);

      httpReports.push({
        name: item.name,
        url: item.url,
        status: res.status,
        redirected: res.redirected,
        finalUrl: res.url,
        duration,
        title,
        hasHydrationMismatch,
        hasServerError,
        scriptCount: scripts.length,
        styleCount: stylesheets.length,
        imageCount: images.length
      });

      console.log(`[HTTP ${res.status}] ${item.name.padEnd(30)} -> ${duration}ms | Redirect: ${res.redirected ? res.url.replace(BASE_URL, '') : 'None'}`);
    } catch (err) {
      console.error(`[HTTP FAIL] ${item.name} -> ${err.message}`);
      httpReports.push({ name: item.name, url: item.url, status: 'ERROR', error: err.message });
    }
  }

  // -------------------------------------------------------------
  // PHASE 2: Critical Asset Verification (CSS, Scripts, Images, Fonts)
  // -------------------------------------------------------------
  console.log('\n--- PHASE 2: Critical Asset Health Check ---');
  console.log(`Total unique assets discovered across pages: ${discoveredAssets.size}`);

  let assetOk = 0;
  let assetFail = 0;
  const brokenAssets = [];
  const checkedStylesheets = [];

  for (const assetPath of discoveredAssets) {
    let assetUrl = assetPath;
    if (assetPath.startsWith('/')) {
      assetUrl = `${BASE_URL}${assetPath}`;
    } else if (!assetPath.startsWith('http')) {
      continue; // Relative or data URI
    }

    try {
      const aRes = await fetch(assetUrl, { method: 'HEAD' });
      if (aRes.ok) {
        assetOk++;
        if (assetPath.includes('.css')) {
          checkedStylesheets.push(assetUrl);
        }
      } else {
        // Retry with GET if HEAD not supported
        const getRes = await fetch(assetUrl);
        if (getRes.ok) {
          assetOk++;
          if (assetPath.includes('.css')) {
            checkedStylesheets.push(assetUrl);
          }
        } else {
          assetFail++;
          brokenAssets.push({ url: assetUrl, status: getRes.status });
        }
      }
    } catch (err) {
      assetFail++;
      brokenAssets.push({ url: assetUrl, error: err.message });
    }
  }

  console.log(`Assets Verified: ${assetOk} OK, ${assetFail} Failed.`);
  if (brokenAssets.length > 0) {
    console.warn(`[WARNING] Broken Assets:`, JSON.stringify(brokenAssets, null, 2));
  } else {
    console.log('All discovered images, scripts, stylesheets, and fonts respond with HTTP 200!');
  }

  // CSS Variable inspection
  console.log('\n--- CSS Variables & Theme Inspection ---');
  if (checkedStylesheets.length > 0) {
    try {
      const cssRes = await fetch(checkedStylesheets[0]);
      const cssText = await cssRes.text();
      const hasBrand = cssText.includes('--brand') || cssText.includes('var(--brand');
      const hasInk = cssText.includes('--ink') || cssText.includes('var(--ink');
      const hasSurface = cssText.includes('--surface') || cssText.includes('var(--bg-surface');
      const hasPrimary = cssText.includes('--primary') || cssText.includes('var(--primary');
      console.log(`Main CSS bundle size: ${(cssText.length / 1024).toFixed(1)} KB`);
      console.log(`Design tokens check: --brand: ${hasBrand} | --ink: ${hasInk} | --surface: ${hasSurface} | --primary: ${hasPrimary}`);
    } catch (cssErr) {
      console.error('CSS inspection error:', cssErr.message);
    }
  }

  // -------------------------------------------------------------
  // PHASE 3: Playwright Live Browser Inspection (Desktop & Mobile)
  // -------------------------------------------------------------
  if (playwright) {
    console.log('\n--- PHASE 3: Playwright Live Browser & Multi-Device Smoke Tests ---');
    const browser = await playwright.launch({ headless: true });

    // 3.1 Unauthenticated pages check on Mobile (390x844) & Desktop (1440x900)
    const viewports = [
      { name: 'Desktop', width: 1440, height: 900 },
      { name: 'Mobile', width: 390, height: 844 }
    ];

    const interactiveRoutes = [
      { name: 'Home Page', path: '/fa' },
      { name: 'Flight Search Results', path: '/fa/flights/search?from=THR&to=IST' },
      { name: 'Hotel Search Results', path: '/fa/hotels/search?city=istanbul' },
      { name: 'Cart & Checkout', path: '/fa/checkout' },
      { name: 'My Trips', path: '/fa/my-trips' }
    ];

    for (const vp of viewports) {
      console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})...`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        userAgent: vp.name === 'Mobile'
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
      });

      for (const route of interactiveRoutes) {
        const page = await context.newPage();
        const consoleErrors = [];
        const hydrationErrors = [];
        const pageErrors = [];

        page.on('console', (msg) => {
          const text = msg.text();
          if (msg.type() === 'error') {
            consoleErrors.push(text.slice(0, 200));
          }
          if (/hydration|did not match|server rendered|mismatch|#418|#423|#425/i.test(text)) {
            hydrationErrors.push(text.slice(0, 200));
          }
        });

        page.on('pageerror', (err) => {
          pageErrors.push(err.message.slice(0, 200));
        });

        const startT = Date.now();
        try {
          await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
          await page.waitForTimeout(2000); // Allow client hydration to complete

          const auditData = await page.evaluate(() => {
            // Check horizontal overflow
            const win = window.innerWidth;
            const docW = document.documentElement.scrollWidth;
            const bodyW = document.body.scrollWidth;
            const overflow = docW > win + 2 || bodyW > win + 2;

            // Check H1 and main
            const h1 = document.querySelector('h1')?.innerText?.trim() || null;
            const hasMain = !!document.querySelector('main');
            const hasHeader = !!document.querySelector('header');
            const hasFooter = !!document.querySelector('footer');

            // Check broken images (only if image has completed loading and naturalWidth is 0)
            const imgs = Array.from(document.querySelectorAll('img'));
            const brokenImgs = imgs.filter(img => img.complete && img.naturalWidth === 0 && img.src && !img.src.startsWith('data:')).map(img => img.src);

            // Check fonts
            const fontsReady = document.fonts ? document.fonts.status : 'unknown';

            // Check CSS variables on root
            const rootStyles = getComputedStyle(document.documentElement);
            const bgVar = rootStyles.getPropertyValue('--background') || rootStyles.getPropertyValue('--bg-surface') || null;

            return {
              overflow,
              docW,
              win,
              h1,
              hasMain,
              hasHeader,
              hasFooter,
              brokenImagesCount: brokenImgs.length,
              brokenImgs: brokenImgs.slice(0, 3),
              totalImages: imgs.length,
              fontsReady,
              hasBgVar: !!bgVar
            };
          });

          const loadTime = Date.now() - startT;
          console.log(`  [${vp.name}] ${route.name.padEnd(25)} (${loadTime}ms):`);
          console.log(`    DOM: Main=${auditData.hasMain} | Header=${auditData.hasHeader} | Footer=${auditData.hasFooter} | Fonts=${auditData.fontsReady}`);
          console.log(`    Layout Overflow: ${auditData.overflow ? `YES (docW=${auditData.docW}, win=${auditData.win})` : 'NONE (Clean)'}`);
          console.log(`    Broken Images: ${auditData.brokenImagesCount}/${auditData.totalImages}`);
          if (auditData.brokenImagesCount > 0) {
            console.log(`      Broken URLs:`, auditData.brokenImgs);
          }
          console.log(`    Hydration Errors: ${hydrationErrors.length} | Page Errors: ${pageErrors.length} | Console Errors: ${consoleErrors.length}`);
          if (hydrationErrors.length > 0) {
            console.warn(`      HYDRATION WARNINGS:`, hydrationErrors);
          }
          if (pageErrors.length > 0) {
            console.error(`      PAGE ERRORS:`, pageErrors);
          }
          if (consoleErrors.length > 0) {
            console.warn(`      CONSOLE ERRORS:`, consoleErrors.slice(0, 3));
          }
        } catch (navErr) {
          console.error(`  [${vp.name}] ${route.name} FAILED:`, navErr.message);
        } finally {
          await page.close();
        }
      }
      await context.close();
    }

    // -------------------------------------------------------------
    // PHASE 4: Authenticated Admin Flow (/fa/admin/manifests)
    // -------------------------------------------------------------
    console.log('\n--- PHASE 4: Authenticated Admin Manifests Live Check ---');
    const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const adminPage = await adminContext.newPage();
    const adminConsoleErrors = [];
    const adminPageErrors = [];

    adminPage.on('console', msg => {
      if (msg.type() === 'error') adminConsoleErrors.push(msg.text().slice(0, 200));
    });
    adminPage.on('pageerror', err => adminPageErrors.push(err.message.slice(0, 200)));

    try {
      console.log('Logging in as Admin via NextAuth Credentials Provider...');
      const csrfRes = await adminPage.request.get(`${BASE_URL}/api/auth/csrf`);
      const { csrfToken } = await csrfRes.json();

      // SEC-014: credentials come from the environment / .env only. A default
      // password list in the repository is a published credential.
      const passwords = [
        process.env.ADMIN_PASSWORD,
        process.env.E2E_ADMIN_PASSWORD,
      ].filter((v) => typeof v === 'string' && v.length > 0);
      if (passwords.length === 0) {
        console.warn('ADMIN_PASSWORD is not configured — skipping authenticated admin QA checks.');
      }
      let loggedIn = false;

      for (const pwd of passwords) {
        const loginRes = await adminPage.request.post(`${BASE_URL}/api/auth/callback/credentials`, {
          form: {
            identifier: 'admin@firuzo.com',
            password: pwd,
            channel: 'credentials',
            csrfToken,
            json: 'true'
          }
        });
        const cookies = await adminContext.cookies();
        if (cookies.some(c => c.name.startsWith('authjs.session-token'))) {
          loggedIn = true;
          console.log(`Admin login successful with password candidate.`);
          break;
        }
      }

      if (!loggedIn) {
        console.warn('Could not authenticate via credentials callback — checking unauthenticated redirect behavior.');
      }

      console.log('Navigating to http://localhost:3000/fa/admin/manifests...');
      const adminRes = await adminPage.goto(`${BASE_URL}/fa/admin/manifests`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await adminPage.waitForTimeout(2500);

      const adminPageData = await adminPage.evaluate(() => {
        const title = document.title;
        const heading = document.querySelector('h1, h2')?.innerText?.trim();
        const hasTable = !!document.querySelector('table');
        const rows = document.querySelectorAll('tr, [data-manifest-item]').length;
        const bodyText = document.body.innerText.slice(0, 300);
        return { title, heading, hasTable, rows, bodyText, url: window.location.href };
      });

      console.log(`Admin Manifests Status: ${adminRes?.status()}`);
      console.log(`Admin Manifests URL: ${adminPageData.url}`);
      console.log(`Admin Manifests Heading: "${adminPageData.heading}" | Title: "${adminPageData.title}"`);
      console.log(`Admin Manifests Elements: Table=${adminPageData.hasTable}, Rows=${adminPageData.rows}`);
      console.log(`Admin Console Errors: ${adminConsoleErrors.length} | Page Errors: ${adminPageErrors.length}`);
      if (adminPageErrors.length > 0) {
        console.error('Admin Page Errors:', adminPageErrors);
      }
    } catch (adminErr) {
      console.error('Admin Manifests check error:', adminErr.message);
    } finally {
      await adminContext.close();
    }

    await browser.close();
  }

  // -------------------------------------------------------------
  // PHASE 5: Automated Smoke / Core Invariant Verification
  // -------------------------------------------------------------
  console.log('\n--- PHASE 5: Domain Invariants & Health Verification ---');
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health/ready`);
    const healthJson = await healthRes.json().catch(() => null);
    console.log('API /api/health/ready Response:', JSON.stringify(healthJson, null, 2));
  } catch (hErr) {
    console.warn('Health check API error:', hErr.message);
  }

  console.log('\n================================================================');
  console.log('LIVE QA AUDIT COMPLETE');
  console.log('================================================================\n');
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Comprehensive Live QA Runner Active.');
});

const PORT = 3099;
server.listen(PORT, '127.0.0.1', () => {
  runLiveAudit().catch(err => console.error('Audit fatal error:', err));
});
