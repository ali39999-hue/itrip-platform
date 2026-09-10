/**
 * A11Y-001 — WCAG-oriented accessibility baseline measurement.
 *
 * Scans the key public pages with axe-core (via @axe-core/playwright) against
 * the running dev/prod server and writes a machine-readable JSON report plus a
 * human summary. This is a MEASUREMENT tool, not a gate: A11Y-002 (CI gate)
 * requires the product owner to pick the blocking severity threshold first.
 *
 * Usage: node scripts/a11y-baseline.mjs [baseUrl] [outFile]
 */
import { chromium } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import fs from 'fs';

const BASE = process.argv[2] || 'http://localhost:3000';
const OUT = process.argv[3] || 'docs/baseline/a11y-baseline.json';

const LOCALE = 'fa'; // default locale, RTL
const PAGES = [
  { path: `/${LOCALE}`, name: 'home' },
  { path: `/${LOCALE}/flights`, name: 'flights-landing' },
  { path: `/${LOCALE}/hotels`, name: 'hotels-landing' },
  { path: `/${LOCALE}/services`, name: 'services' },
  { path: `/${LOCALE}/support`, name: 'support' },
];

const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor'];

try {
  await fetch(BASE, { signal: AbortSignal.timeout(3000) });
} catch (err) {
  console.error(`[gate:a11y] Error: Cannot connect to server at ${BASE}.`);
  console.error(`Please ensure the Next.js server is running (e.g. 'npm run dev' or 'npm start') before executing gate:a11y.`);
  process.exit(1);
}

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const report = { generatedAt: new Date().toISOString(), baseUrl: BASE, pages: {} };
let exitCode = 0;

for (const { path, name } of PAGES) {
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 45000 });
  } catch {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  }

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const violations = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact || 'minor',
    help: v.help,
    nodes: v.nodes.length,
    sampleTarget: v.nodes[0]?.target?.join(' ') || '',
  }));

  report.pages[name] = {
    url: `${BASE}${path}`,
    violationCount: violations.reduce((s, v) => s + v.nodes, 0),
    byRule: violations,
    passes: results.passes?.length || 0,
  };

  const summary = IMPACT_ORDER
    .map((i) => `${i}=${violations.filter((v) => v.impact === i).reduce((s, v) => s + v.nodes, 0)}`)
    .join(' ');
  console.log(`${name}: ${report.pages[name].violationCount} nodes failing (${summary})`);
}

await browser.close();

fs.mkdirSync(OUT.includes('/') ? OUT.substring(0, OUT.lastIndexOf('/')) : '.', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(`Report written to ${OUT}`);
process.exit(exitCode);
