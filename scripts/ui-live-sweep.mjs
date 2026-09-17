// Live UI sweep: renders every user-facing route at mobile/tablet/desktop and
// reports hard, measurable defects (horizontal overflow, sub-44px tap targets,
// CLS-prone images, missing per-page h1, dev-time console errors) plus
// screenshots for visual review.
//
// Usage (dev server must be running on :3000):
//   node scripts/ui-live-sweep.mjs             # full sweep
//   node scripts/ui-live-sweep.mjs --quick     # core routes only
//   node scripts/ui-live-sweep.mjs --shots     # also write screenshots
//
// Output: results/ui-sweep/report.json + results/ui-sweep/*.jpg (with --shots)
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.SWEEP_BASE || 'http://localhost:3000';
const OUT = 'results/ui-sweep';
const SHOTS = process.argv.includes('--shots');
const QUICK = process.argv.includes('--quick');

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844, isMobile: true },
  { name: 'desktop', width: 1440, height: 900, isMobile: false },
];

const TABLET = { name: 'tablet', width: 768, height: 1024, isMobile: true };
// Smallest phone still in use (iPhone SE 1st gen / Galaxy Fold cover) — AGENTS.md
// & responsive-design skill mandate a 320px check with zero horizontal scroll.
const XS = { name: 'xs320', width: 320, height: 640, isMobile: true };

const ROUTES = [
  { name: 'home', url: '/fa' },
  { name: 'flights', url: '/fa/flights' },
  { name: 'hotels', url: '/fa/hotels' },
  { name: 'tours', url: '/fa/tours' },
  { name: 'services', url: '/fa/services' },
  { name: 'destinations', url: '/fa/destinations' },
  { name: 'visa', url: '/fa/visa' },
  { name: 'insurance', url: '/fa/insurance' },
  { name: 'esim', url: '/fa/esim' },
  { name: 'trains', url: '/fa/trains' },
  { name: 'transfers', url: '/fa/transfers' },
  { name: 'city-pass', url: '/fa/city-pass' },
  { name: 'travelogues', url: '/fa/travelogues' },
  { name: 'snapp', url: '/fa/snapp' },
  { name: 'plan', url: '/fa/plan' },
  { name: 'wallet', url: '/fa/wallet' },
  { name: 'my-trips', url: '/fa/my-trips' },
  { name: 'invoices', url: '/fa/invoices' },
  { name: 'account', url: '/fa/account' },
  { name: 'support', url: '/fa/support' },
  { name: 'auth', url: '/fa/auth' },
  { name: 'en-home', url: '/en' },
  { name: 'en-hotels', url: '/en/hotels' },
  { name: 'en-flights', url: '/en/flights' },
];

const CORE = new Set(['home', 'flights', 'hotels', 'tours', 'services', 'wallet']);

// Runs inside the page: pure DOM measurements, no app coupling.
function collect() {
  const vw = window.innerWidth;
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return null;
    if (r.width < 1 || r.height < 1) return null;
    if (r.bottom < -200 || r.top > window.innerHeight + 4000) return null;
    return r;
  };
  const path = (el) => {
    const bits = [];
    let n = el;
    for (let i = 0; i < 4 && n && n.nodeType === 1; i++) {
      const cls = (n.className || '').toString().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
      bits.unshift(n.tagName.toLowerCase() + (cls ? '.' + cls : '') + (n.id ? '#' + n.id : ''));
      n = n.parentElement;
    }
    return bits.join(' > ');
  };

  // 1) horizontal overflow — document level + worst offenders
  const overflow = [];
  if (document.documentElement.scrollWidth > vw + 1) {
    for (const el of document.querySelectorAll('body *')) {
      const r = vis(el);
      if (!r) continue;
      const st = getComputedStyle(el);
      if (st.position === 'fixed') continue;
      const over = Math.round(r.right - vw);
      const wide = el.scrollWidth - el.clientWidth;
      if (over > 2 || (wide > 2 && !/hidden|clip|auto|scroll/.test(st.overflowX))) {
        overflow.push({ sel: path(el), right: Math.round(r.right), overflow: over, scrollW: el.scrollWidth, clientW: el.clientWidth });
      }
    }
    overflow.sort((a, b) => b.overflow - a.overflow);
  }

  // 2) tap targets (AGENTS.md §1.3 — 44x44)
  const small = [];
  const SEL = 'a[href], button, [role="button"], input:not([type="hidden"]), select, [role="tab"], [role="switch"]';
  for (const el of document.querySelectorAll(SEL)) {
    const r = vis(el);
    if (!r) continue;
    const st = getComputedStyle(el);
    if (st.pointerEvents === 'none') continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    const inline = st.display.includes('inline') && !st.display.startsWith('inline-') && el.closest('p, li');
    if (inline) continue;
    if (r.width < 44 || r.height < 44) {
      // fontSize < 16px on a text input makes iOS Safari zoom the whole page on focus.
      const fs = parseFloat(getComputedStyle(el).fontSize) || 0;
      small.push({
        sel: path(el),
        tag: el.tagName.toLowerCase(),
        w: Math.round(r.width),
        h: Math.round(r.height),
        fs: Math.round(fs * 10) / 10,
        iosZoom: el.tagName === 'INPUT' && /text|search|email|tel|number|password/.test(el.getAttribute('type') || 'text') && fs < 16,
        parent: (el.parentElement?.tagName || '').toLowerCase() + (el.parentElement?.getAttribute('role') ? '[role=' + el.parentElement.getAttribute('role') + ']' : ''),
        text: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
      });
    }
  }

  // 3) images at CLS/alt risk
  const imgs = { total: 0, noAlt: [], noDims: [], eagerBelowFold: 0 };
  for (const el of document.querySelectorAll('img')) {
    const r = vis(el);
    if (!r) continue;
    imgs.total++;
    if (!el.hasAttribute('alt')) imgs.noAlt.push(path(el));
    const hasDims = el.getAttribute('width') && el.getAttribute('height');
    const positioned = ['absolute', 'fixed'].includes(getComputedStyle(el).position);
    if (!hasDims && !positioned) imgs.noDims.push({ sel: path(el), w: Math.round(r.width), h: Math.round(r.height) });
    if (el.getAttribute('loading') !== 'lazy' && r.top > window.innerHeight * 0.9) imgs.eagerBelowFold++;
  }

  // 4) headings + landmarks
  const h1s = [...document.querySelectorAll('h1')].map((h) => (h.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60));

  // 5) fixed chrome geometry (bottom nav / sticky bars) + body bottom padding
  const fixedBottom = [...document.querySelectorAll('body *')].filter((el) => {
    const st = getComputedStyle(el);
    if (st.position !== 'fixed') return false;
    const r = el.getBoundingClientRect();
    return r.height > 30 && r.bottom >= window.innerHeight - 4 && r.width > window.innerWidth * 0.4;
  }).map((el) => ({ sel: path(el), h: Math.round(el.getBoundingClientRect().height), z: getComputedStyle(el).zIndex }));
  const header = document.querySelector('header');

  return {
    vw,
    docScrollW: document.documentElement.scrollWidth,
    bodyScrollW: document.body.scrollWidth,
    pageHeight: Math.round(document.documentElement.scrollHeight),
    overflow: overflow.slice(0, 10),
    smallCount: small.length,
    smallUnder24: small.filter((s) => s.h < 24).length,
    iosZoomInputs: small.filter((s) => s.iosZoom).length,
    small: small.slice(0, 30),
    imgs,
    h1s,
    fixedBottom,
    headerH: header ? Math.round(header.getBoundingClientRect().height) : 0,
    bodyPadBottom: getComputedStyle(document.body).paddingBottom,
  };
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const results = [];

for (const route of ROUTES) {
  if (QUICK && !CORE.has(route.name)) continue;
  const vps = QUICK ? VIEWPORTS : [...VIEWPORTS, XS, ...(CORE.has(route.name) ? [TABLET] : [])];
  for (const vp of vps) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
      locale: route.url.startsWith('/en') ? 'en-US' : 'fa-IR',
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 160)));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160));
    });
    let status = 0;
    try {
      const res = await page.goto(BASE + route.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      status = res ? res.status() : 0;
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(400);
      const data = await page.evaluate(collect);
      results.push({ route: route.name, url: route.url, vp: vp.name, status, ...data, errors: [...new Set(errors)].slice(0, 6) });
      if (SHOTS) {
        await page
          .screenshot({
            path: `${OUT}/${route.name}-${vp.name}.jpg`,
            fullPage: true,
            clip: { x: 0, y: 0, width: vp.width, height: Math.min(Math.max(data.pageHeight, vp.height), 5200) },
            type: 'jpeg',
            quality: 60,
          })
          .catch(() => {});
      }
    } catch (e) {
      results.push({ route: route.name, url: route.url, vp: vp.name, status, fatal: String(e).slice(0, 200), errors: [...new Set(errors)].slice(0, 6) });
    }
    await ctx.close();
  }
}
await browser.close();

writeFileSync(`${OUT}/report.json`, JSON.stringify(results, null, 2));
console.log(`swept ${results.length} route/viewport combos → ${OUT}/report.json\n`);
for (const r of results) {
  const flag = r.fatal
    ? 'FATAL'
    : `overflow=${r.overflow?.length ?? '-'} small=${r.smallCount ?? '-'} <24px=${r.smallUnder24 ?? '-'} iosZoom=${r.iosZoomInputs ?? '-'} imgs=${r.imgs?.total ?? '-'} h1=${r.h1s?.length ?? '-'} errs=${r.errors?.length ?? '-'}`;
  console.log(`${r.route.padEnd(14)} ${String(r.vp).padEnd(8)} ${String(r.status).padEnd(4)} ${flag}${r.fatal ? ' ' + r.fatal : ''}`);
}


