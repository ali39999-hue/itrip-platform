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
import { measureI18nDebt } from './lib/i18n-debt.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(root, 'src');

function walkSource(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (!['node_modules', '.next', 'graphify-out', '__tests__'].includes(name)) walkSource(p, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\./.test(name)) {
      out.push({
        relPath: path.relative(root, p).replace(/\\/g, '/'),
        content: fs.readFileSync(p, 'utf8'),
      });
    }
  }
  return out;
}

const debt = measureI18nDebt(walkSource(SRC_DIR));
console.log(
  `files: ${debt.files} | lt() calls: ${debt.ltCalls} | complete (5/5 locales): ${debt.completeLtCalls}`
);
console.log(`incomplete lt() calls (debt): ${debt.incompleteLtCalls}`);
console.log(`unlocalized FA literals outside lt() (debt): ${debt.unlocalizedFaLiterals}`);

const byFile = new Map();
for (const m of debt.incompleteSamples) {
  const f = m.split(':')[0];
  byFile.set(f, (byFile.get(f) || 0) + 1);
}
console.log('--- incomplete by file (worst first) ---');
for (const [f, n] of [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)) {
  console.log(`  ${String(n).padStart(4)}  ${f}`);
}

const verbose = process.argv.includes('--all');
console.log(`--- details${verbose ? ' (all)' : ' (first 40; --all for everything)'} ---`);
for (const m of debt.incompleteSamples.slice(0, verbose ? debt.incompleteSamples.length : 40)) {
  console.log('  ' + m);
}

const baselinePath = path.join(root, 'docs', 'baseline', 'lt-i18n-baseline.json');
const mode = process.argv[2] || '';
if (mode === '--update-baseline') {
  fs.writeFileSync(
    baselinePath,
    JSON.stringify(
      {
        incomplete: debt.incompleteLtCalls,
        unlocalizedFaLiterals: debt.unlocalizedFaLiterals,
        total: debt.ltCalls,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    ),
    'utf8'
  );
  console.log(`baseline updated: incomplete=${debt.incompleteLtCalls} unlocalizedFaLiterals=${debt.unlocalizedFaLiterals}`);
} else if (mode === '--check') {
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const incompleteOk = debt.incompleteLtCalls <= (baseline.incomplete ?? Number.MAX_SAFE_INTEGER);
  const unlocalizedOk = debt.unlocalizedFaLiterals <= (baseline.unlocalizedFaLiterals ?? Number.MAX_SAFE_INTEGER);
  if (!incompleteOk) {
    console.error(
      `GATE FAIL: incomplete lt() calls ${debt.incompleteLtCalls} > baseline ${baseline.incomplete} — new strings shipped without all five locales.`
    );
  }
  if (!unlocalizedOk) {
    console.error(
      `GATE FAIL: unlocalized FA literals ${debt.unlocalizedFaLiterals} > baseline ${baseline.unlocalizedFaLiterals} — new hardcoded Persian text shipped outside the localization mechanism.`
    );
  }
  if (!incompleteOk || !unlocalizedOk) process.exit(1);
  console.log(
    `GATE PASS: incomplete ${debt.incompleteLtCalls} <= ${baseline.incomplete}; unlocalized FA ${debt.unlocalizedFaLiterals} <= ${baseline.unlocalizedFaLiterals}`
  );
}
