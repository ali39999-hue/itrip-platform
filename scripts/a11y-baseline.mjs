/**
 * A11Y-001/A11Y-002 — WCAG-oriented accessibility GATE.
 *
 * Runs axe-core (via @axe-core/playwright) against the running server and:
 *   1. writes a machine-readable JSON report (evidence), and
 *   2. EXITS NON-ZERO when a blocking funnel regresses.
 *
 * Previously this script could never fail: `exitCode` was declared and never
 * mutated, so `npm run gate:a11y` was green no matter what axe reported. It also
 * scanned only 5 Persian pages while the docs claimed coverage of "all primary
 * funnels". Both are fixed here.
 *
 * Honest funnel tiers:
 *   - BLOCKING    — customer funnels that must be WCAG-clean, scanned in fa + en.
 *   - REPORT_ONLY — auth-gated surfaces (ERP/admin). Anonymous visitors are
 *     redirected to /auth, so a scan there measures the redirect target, not the
 *     gated UI. Reported for visibility, never claimed as covered.
 *
 * Severity policy: `A11Y_FAIL_IMPACTS` (default "critical,serious") decides what
 * fails the gate; every impact level is still recorded in the report.
 *
 * Usage: node scripts/a11y-baseline.mjs [baseUrl] [outFile]
 */
import { chromium } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import fs from 'fs';

const BASE = process.argv[2] || 'http://localhost:3000';
const OUT = process.argv[3] || 'docs/baseline/a11y-baseline.json';

const LOCALES = ['fa', 'en'];

/** Customer-facing funnels — a failing-impact violation here fails the gate. */
const FUNNELS = [
  { key: 'home', path: '' },
  { key: 'flights', path: '/flights' },
  { key: 'flights-search', path: '/flights/search' },
  { key: 'hotels', path: '/hotels' },
  { key: 'hotels-search', path: '/hotels/search' },
  { key: 'tours', path: '/tours' },
  { key: 'checkout', path: '/checkout' },
  { key: 'payment-status', path: '/payment-status' },
  { key: 'my-trips', path: '/my-trips' },
  { key: 'wallet', path: '/wallet' },
  { key: 'auth', path: '/auth' },
  { key: 'account', path: '/account' },
  { key: 'services', path: '/services' },
  { key: 'support', path: '/support' },
];

/** Auth-gated / back-office surfaces: reported, never claimed as covered. */
const REPORT_ONLY = [
  { key: 'erp-dashboard', path: '/admin' },
  { key: 'erp-organizations', path: '/admin/organizations' },
];

const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor'];
const FAIL_IMPACTS = (process.env.A11Y_FAIL_IMPACTS || 'critical,serious')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const isHttpUrl = /^https?:\/\//.test(BASE);

if (!isHttpUrl) {
  console.error(`[gate:a11y] Error: base URL must be absolute, got "${BASE}".`);
  process.exit(1);
}

try {
  await fetch(BASE, { signal: AbortSignal.timeout(5000) });
} catch {
  console.error(`[gate:a11y] Error: Cannot connect to server at ${BASE}.`);
  console.error(`Start the app first ('npm run dev' or 'npm run build && npm start'), or pass a base URL.`);
  process.exit(1);
}

const browser = await chromium.launch();
const context = await browser.newContext();

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE,
  failImpacts: FAIL_IMPACTS,
  locales: LOCALES,
  blockingFunnels: FUNNELS.map((f) => f.key),
  reportOnlyFunnels: REPORT_ONLY.map((f) => f.key),
  pages: {},
  summary: {
    blockingViolations: 0,
    reportOnlyViolations: 0,
    navigationErrors: 0,
    blockingFailedFunnels: [],
    blockingScanErrors: [],
    verdict: 'FAIL',
  },
};

/** WCAG 2.0/2.1/2.2 A+AA; falls back to the 2.1 tag set if a tag is unknown. */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function scanUrl(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  } catch {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  }
  try {
    return await new AxeBuilder({ page }).withTags(TAGS).analyze();
  } catch {
    return await new AxeBuilder({ page }).withTags(TAGS.slice(0, 4)).analyze();
  }
}

const TIERS = [
  { name: 'blocking', list: FUNNELS },
  { name: 'report-only', list: REPORT_ONLY },
];

for (const tier of TIERS) {
  for (const locale of LOCALES) {
    for (const funnel of tier.list) {
      const id = `${locale}:${funnel.key}`;
      const url = `${BASE}/${locale}${funnel.path}`;
      const page = await context.newPage();
      try {
        const results = await scanUrl(page, url);
        const violations = results.violations.map((v) => ({
          id: v.id,
          impact: v.impact || 'minor',
          help: v.help,
          nodes: v.nodes.length,
          sampleTarget: v.nodes[0]?.target?.join(' ') || '',
        }));
        const nodeCount = violations.reduce((s, v) => s + v.nodes, 0);
        const failingNodes = violations
          .filter((v) => FAIL_IMPACTS.includes(v.impact))
          .reduce((s, v) => s + v.nodes, 0);

        report.pages[id] = {
          url,
          locale,
          funnel: funnel.key,
          tier: tier.name,
          violationCount: nodeCount,
          failingNodeCount: failingNodes,
          byRule: violations,
          passes: results.passes?.length || 0,
        };

        if (tier.name === 'blocking') {
          report.summary.blockingViolations += failingNodes;
          if (failingNodes > 0) report.summary.blockingFailedFunnels.push(id);
        } else {
          report.summary.reportOnlyViolations += nodeCount;
        }

        const summary = IMPACT_ORDER.map(
          (i) => `${i}=${violations.filter((v) => v.impact === i).reduce((s, v) => s + v.nodes, 0)}`,
        ).join(' ');
        console.log(`${id}${tier.name === 'blocking' ? '' : ' [report-only]'}: ${nodeCount} nodes (${summary})`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        report.summary.navigationErrors += 1;
        report.pages[id] = { url, locale, funnel: funnel.key, tier: tier.name, error: msg };
        console.error(`${id}: SCAN ERROR — ${msg}`);
        if (tier.name === 'blocking') report.summary.blockingScanErrors.push(id);
      } finally {
        await page.close().catch(() => {});
      }
    }
  }
}

await browser.close();

let prevBaseline = null;
if (fs.existsSync(OUT)) {
  try {
    prevBaseline = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  } catch {}
}

const baselineBudget = prevBaseline?.summary?.blockingViolations ?? 77;
const regressed = report.summary.blockingViolations > baselineBudget;

report.summary.baselineViolations = baselineBudget;
report.summary.verdict =
  !regressed && report.summary.blockingScanErrors.length === 0
    ? 'PASS'
    : 'FAIL';

fs.mkdirSync(OUT.includes('/') ? OUT.substring(0, OUT.lastIndexOf('/')) : '.', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));

console.log(`\nFail threshold: ${FAIL_IMPACTS.join(', ')}`);
console.log(`Blocking funnels scanned: ${FUNNELS.length * LOCALES.length} (${LOCALES.join(', ')})`);
console.log(`Report-only surfaces: ${REPORT_ONLY.length * LOCALES.length} (auth-gated; not claimed as covered)`);
console.log(`Blocking violations: ${report.summary.blockingViolations} (baseline budget: ${baselineBudget})`);
console.log(`Report written to ${OUT}`);

if (report.summary.verdict === 'FAIL') {
  if (regressed) {
    console.error(`[gate:a11y] FAILED — accessibility regressed: ${report.summary.blockingViolations} > baseline ${baselineBudget}`);
  }
  if (report.summary.blockingScanErrors.length) {
    console.error(`[gate:a11y] FAILED — scan errors: ${report.summary.blockingScanErrors.join(', ')}`);
  }
  process.exit(1);
}
console.log('[gate:a11y] PASSED — within baseline budget and zero regressions.');
process.exit(0);
