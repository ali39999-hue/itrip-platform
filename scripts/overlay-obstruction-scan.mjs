/**
 * AIRA-UI-001 — overlay obstruction scan.
 *
 * Measures what REAL content the floating/sticky overlays cover, the class of
 * defect that automated gates (a11y, uiux) cannot see: a bottom sort/filter
 * pill, a sticky route bar, or the contact dock drawn on top of a card title,
 * a price, or the primary "book" CTA.
 *
 * Usage:
 *   node scripts/overlay-obstruction-scan.mjs [path] [width] [scrollY] [locale]
 *   node scripts/overlay-obstruction-scan.mjs /fa/flights/search 390 800 fa
 *   node scripts/overlay-obstruction-scan.mjs /en/hotels/search 1440 600 en
 *
 * For each fixed/sticky element (global header excluded by design) it samples
 * points inside the overlay, resolves the element underneath via
 * elementsFromPoint and prints the covered content. Zero output = no overlap.
 */
import { chromium } from '@playwright/test';

const url = process.argv[2] || '/fa/flights/search';
const width = Number(process.argv[3] || 390);
const scrollY = Number(process.argv[4] || 800);
const locale = process.argv[5] || (url.startsWith('/en') ? 'en' : 'fa');

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width, height: 844 },
  isMobile: width < 700,
  hasTouch: width < 700,
  locale: locale === 'fa' ? 'fa-IR' : 'en-US',
});
const page = await ctx.newPage();
await page.goto('http://localhost:3000' + url, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
await page.evaluate((y) => window.scrollTo(0, y), scrollY);
await page.waitForTimeout(800);

const report = await page.evaluate(() => {
  const label = (el) => `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(/\s+/).slice(0, 3).join('.')}`;
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el);
    if (s.position !== 'fixed' && s.position !== 'sticky') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 24) continue;
    if (r.bottom < 0 || r.top > window.innerHeight) continue;
    if (el.closest('header') || el.tagName === 'NAV') continue; // global chrome, by design
    const covered = new Set();
    for (let fx = 0.15; fx <= 0.85; fx += 0.35) {
      for (let fy = 0.2; fy <= 0.8; fy += 0.3) {
        const x = r.left + r.width * fx;
        const y = r.top + r.height * fy;
        for (const under of document.elementsFromPoint(x, y)) {
          if (under === el || el.contains(under)) continue;
          if (getComputedStyle(under).position === 'fixed' || under.closest('header')) continue;
          const ur = under.getBoundingClientRect();
          if (ur.width > 30 && ur.height > 16) {
            covered.add(label(under) + ' «' + (under.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) + '»');
          }
          break;
        }
      }
    }
    if (covered.size) {
      out.push({
        overlay: `${label(el)} «${(el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30)}»`,
        pos: `${s.position} z${s.zIndex}`,
        box: `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`,
        covers: [...covered].slice(0, 4),
      });
    }
  }
  return out;
});

console.log(`[overlay-scan] ${url} @${width}px scroll=${scrollY} — ${report.length} obstructing overlay(s)`);
console.log(JSON.stringify(report, null, 1));
await browser.close();
