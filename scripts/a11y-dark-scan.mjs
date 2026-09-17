/**
 * AIRA-UI-002 — dark-mode accessibility scan.
 *
 * `gate:a11y` (scripts/a11y-baseline.mjs) only ever runs in light mode, while
 * the app ships a first-class dark theme (localStorage `firuzo-theme` +
 * `.dark` class with its own token set). Contrast is theme-dependent, so a
 * light-only axe run leaves the dark palette completely unverified.
 *
 * Usage: node scripts/a11y-dark-scan.mjs [path ...] [--width=390]
 *   node scripts/a11y-dark-scan.mjs /fa /fa/hotels /fa/flights/search
 *
 * Reports critical/serious violations per route; exits non-zero when any are
 * found, so it can be wired next to the existing gate once the backlog is 0.
 */
import { chromium } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

const args = process.argv.slice(2);
const widthArg = args.find((a) => a.startsWith('--width='));
const width = widthArg ? Number(widthArg.split('=')[1]) : 390;
const paths = args.filter((a) => !a.startsWith('--'));
const routes = paths.length ? paths : ['/fa', '/fa/flights', '/fa/hotels', '/fa/tours'];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width, height: 844 },
  isMobile: width < 700,
  hasTouch: width < 700,
  colorScheme: 'dark',
  locale: 'fa-IR',
});
await ctx.addInitScript(() => {
  try {
    localStorage.setItem('firuzo-theme', 'dark');
  } catch {}
});

let total = 0;
for (const url of routes) {
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000' + url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(600);
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  const byRule = {};
  for (const v of r.violations) {
    if (!['critical', 'serious'].includes(v.impact)) continue;
    byRule[v.id] = { impact: v.impact, nodes: v.nodes.length, sample: String(v.nodes[0]?.target || '').slice(0, 90) };
  }
  const count = Object.values(byRule).reduce((a, b) => a + b.nodes, 0);
  total += count;
  console.log(`[dark-a11y] ${url} — critical/serious: ${count}`);
  for (const [id, info] of Object.entries(byRule)) console.log(`   ${id} [${info.impact}] x${info.nodes} @ ${info.sample}`);
  await page.close();
}
await browser.close();
console.log(`\n[dark-a11y] total critical/serious nodes: ${total}`);
process.exit(total > 0 ? 1 : 0);
