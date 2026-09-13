// Read-only i18n coverage scan for the inline lt() dictionary mechanism.
// next-intl has gate:i18n (messages/*.json), but ~170 files use lt(locale,
// {fa,en,ar,zh,ru}) inline dictionaries with NO completeness gate. lt() is
// RTL-safe by design (ar falls back to fa, zh/ru to en — I18N-103), so this
// tool tracks PARTIAL coverage as a budget, not a build breaker:
//   node scripts/lt-coverage-scan.mjs                    # report
//   node scripts/lt-coverage-scan.mjs --update-baseline  # accept current count
//   node scripts/lt-coverage-scan.mjs --check            # gate: fail on regression
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'src');
const LOCALES = ['fa', 'en', 'ar', 'zh', 'ru'];

const stats = { files: 0, calls: 0, complete: 0, missing: [] };

function scanText(rel, text) {
  let idx = 0;
  while ((idx = text.indexOf('lt(', idx)) !== -1) {
    // call must be lt(locale, { ... }) — find the opening brace after the comma
    const head = text.slice(idx, idx + 24);
    if (!/^lt\(\s*[a-zA-Z_.]+\s*,\s*\{/.test(head)) { idx += 3; continue; }
    const braceStart = text.indexOf('{', idx);
    let depth = 0, j = braceStart;
    for (; j < text.length; j++) {
      if (text[j] === '{') depth++;
      else if (text[j] === '}') { depth--; if (depth === 0) break; }
    }
    const body = text.slice(braceStart, j + 1);
    // Spread-built objects (e.g. lt(locale, { ...(override?.title?.fa ? {fa…} : {}) }))
    // source their strings from CMS data, not inline literals — exclude them.
    if (/\.\.\.\s*\(/.test(body)) { idx = j; continue; }
    const lineNo = text.slice(0, idx).split('\n').length;
    const present = LOCALES.filter((l) => new RegExp(`\\b${l}\\s*:`, 'm').test(body));
    stats.calls++;
    if (present.length === LOCALES.length) stats.complete++;
    else if (present.length === 0) stats.missing.push(`${rel}:${lineNo}: no locale keys (computed/spread)`);
    else stats.missing.push(`${rel}:${lineNo}: missing ${LOCALES.filter((l) => !present.includes(l)).join(', ')}`);
    idx = j;
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(p); continue; }
    if (!/\.(tsx|ts)$/.test(entry.name) || entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) continue;
    stats.files++;
    scanText(path.relative(root, p).replace(/\\/g, '/'), fs.readFileSync(p, 'utf8'));
  }
}

walk(srcDir);
console.log(`files: ${stats.files} | lt() calls: ${stats.calls} | complete (5/5 locales): ${stats.complete}`);
console.log(`incomplete calls: ${stats.missing.length}`);

const byFile = new Map();
for (const m of stats.missing) {
  const f = m.split(':')[0];
  byFile.set(f, (byFile.get(f) || 0) + 1);
}
console.log('--- by file (worst first) ---');
for (const [f, n] of [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)) {
  console.log(`  ${String(n).padStart(4)}  ${f}`);
}

const verbose = process.argv.includes('--all');
console.log(`--- details${verbose ? ' (all)' : ' (first 40; --all for everything)'} ---`);
for (const m of stats.missing.slice(0, verbose ? stats.missing.length : 40)) console.log('  ' + m);

const baselinePath = path.join(root, 'docs', 'baseline', 'lt-i18n-baseline.json');
const mode = process.argv[2] || '';
if (mode === '--update-baseline') {
  fs.writeFileSync(
    baselinePath,
    JSON.stringify({ incomplete: stats.missing.length, total: stats.calls, generatedAt: new Date().toISOString() }, null, 2),
    'utf8'
  );
  console.log(`baseline updated: incomplete=${stats.missing.length}`);
} else if (mode === '--check') {
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  if (stats.missing.length > baseline.incomplete) {
    console.error(`GATE FAIL: lt() incomplete count ${stats.missing.length} > baseline ${baseline.incomplete} — new strings shipped without all five locales.`);
    process.exit(1);
  }
  console.log(`GATE PASS: incomplete ${stats.missing.length} <= baseline ${baseline.incomplete}`);
}
