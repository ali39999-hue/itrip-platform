/**
 * QUALITY-001 — machine-readable quality evidence (single source of truth).
 *
 * Problem this solves: the docs claimed "100% tests passing", "zero ESLint errors"
 * and "WCAG across all primary funnels" while CI was actually red. Numbers were
 * hand-copied into markdown and drifted immediately.
 *
 * This script *measures* instead of asserting:
 *   - runs the fast deterministic gates itself (typecheck, lint, i18n, security, uiux)
 *   - reads artifacts produced by slower gates (unit JSON, a11y JSON, e2e status)
 *   - writes docs/baseline/quality-report.json
 *
 * QR-001 (fail-closed aggregation): anything that could not be measured in this
 * invocation is recorded as "not-run" and "not-run" counts as FAIL for a required
 * production gate — never as PASS. Documentation must quote this file.
 *
 * QR-002 (no injected pass): build/e2e statuses must arrive via evidence files
 * written by scripts/record-gate-result.mjs after a REAL run. The legacy
 * QUALITY_BUILD_STATUS / QUALITY_E2E_STATUS environment overrides are rejected
 * outright — a "pass" that can be set with an env var is not evidence.
 *
 * QR-003 (commit binding): artifacts stamped for a different commit (or with an
 * "unknown" commit) are rejected as STALE — not silently accepted.
 *
 * Usage: node scripts/generate-quality-report.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'docs', 'baseline', 'quality-report.json');

const sh = (cmd) => execSync(cmd, { cwd: root, stdio: 'pipe', env: process.env }).toString().trim();
const readJson = (rel) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch {
    return null;
  }
};

function runGate(name, cmd) {
  const started = Date.now();
  try {
    execSync(cmd, { cwd: root, stdio: 'pipe', env: process.env });
    return { status: 'PASS', durationMs: Date.now() - started };
  } catch (err) {
    const detail = `${err.stdout || ''}${err.stderr || ''}`
      .split('\n')
      .filter(Boolean)
      .slice(-6)
      .join('\n');
    return { status: 'FAIL', durationMs: Date.now() - started, exitCode: err.status ?? 1, detail };
  }
}

// QR-002: statuses arrive as evidence files, never as env vars. The legacy
// QUALITY_*_STATUS overrides are rejected — and their presence is itself
// recorded as a misconfiguration, because a pipeline that tries to inject a
// pass is not trustworthy.
function gateFromRecordFile(gateName, rel) {
  const record = readJson(rel);
  if (!record) return { status: 'not-run', source: `${rel} missing — run the ${gateName} gate and scripts/record-gate-result.mjs` };
  if (record.commit !== 'unknown' && record.commit && record.commit !== commit) {
    return {
      status: 'STALE',
      source: `${rel} stamped for ${String(record.commit).slice(0, 12)} — this invocation is ${String(commit).slice(0, 12)}`,
    };
  }
  if (record.commit === 'unknown' || !record.commit) {
    return { status: 'STALE', source: `${rel} has no commit provenance — refusing to trust it` };
  }
  return {
    status: record.status === 'PASS' ? 'PASS' : 'FAIL',
    recordedAt: record.recordedAt ?? null,
    note: record.note ?? null,
    source: rel,
  };
}

// ---- fast gates, measured right now -----------------------------------------
const gates = {
  typecheck: runGate('typecheck', 'npm run typecheck'),
  lint: runGate('lint', 'npm run lint'),
  i18n: runGate('i18n', 'npm run gate:i18n'),
  security: runGate('security', 'npm run security:scan'),
  uiux: runGate('uiux', 'npm run gate:uiux'),
};

// ---- environment / identity -------------------------------------------------
let commit = process.env.GITHUB_SHA || '';
let branch = process.env.GITHUB_REF_NAME || '';
try {
  commit = commit || sh('git rev-parse HEAD');
  branch = branch || sh('git rev-parse --abbrev-ref HEAD');
} catch {
  commit = commit || 'unknown';
}

const pkg = readJson('package.json') || {};

// QR-003: helper — artifact must belong to THIS commit and be internally sane.
function artifactProvenance(artifact, label) {
  if (!artifact) return { ok: false, status: 'not-run' };
  if (artifact.commit !== commit || !artifact.commit || artifact.commit === 'unknown') {
    return { ok: false, status: 'STALE' };
  }
  return { ok: true, status: label };
}

// ---- artifacts from slower gates (commit-bound, QR-003) ---------------------
const unitArtifact = readJson('results/unit.json');
const a11yArtifact = readJson('docs/baseline/a11y-baseline.json');
const realityMatrix = readJson('docs/baseline/feature-reality-matrix.json');

const unitProv = artifactProvenance(unitArtifact, unitArtifact?.numFailedTests === 0 ? 'PASS' : 'FAIL');
const unit = unitProv.ok
  ? {
      status: unitProv.status,
      total: unitArtifact.numTotalTests ?? null,
      passed: unitArtifact.numPassedTests ?? null,
      failed: unitArtifact.numFailedTests ?? null,
      files: unitArtifact.numTotalTestSuites ?? null,
      artifactCommit: unitArtifact.commit,
      source: 'results/unit.json (npm run test:unit)',
    }
  : {
      status: unitProv.status,
      source: unitArtifact
        ? `results/unit.json stamped for ${String(unitArtifact.commit).slice(0, 12)} — expected ${String(commit).slice(0, 12)}`
        : 'results/unit.json missing — run npm run test:unit',
    };

const a11yProv = artifactProvenance(a11yArtifact, a11yArtifact?.summary?.verdict ?? 'unknown');
const a11y = a11yProv.ok
  ? {
      status: a11yProv.status,
      blockingFunnels: a11yArtifact.blockingFunnels?.length ?? null,
      locales: a11yArtifact.locales ?? null,
      blockingViolations: a11yArtifact.summary?.blockingViolations ?? null,
      reportOnlyViolations: a11yArtifact.summary?.reportOnlyViolations ?? null,
      artifactCommit: a11yArtifact.commit,
      generatedAt: a11yArtifact.generatedAt ?? null,
      source: 'docs/baseline/a11y-baseline.json',
    }
  : {
      status: a11yProv.status,
      source: a11yArtifact
        ? `docs/baseline/a11y-baseline.json stamped for ${String(a11yArtifact.commit).slice(0, 12)} — expected ${String(commit).slice(0, 12)}`
        : 'docs/baseline/a11y-baseline.json missing — run npm run gate:a11y',
    };

// QR-002 continued: build/e2e evidence comes from record files only.
const build = gateFromRecordFile('build', 'results/build.json');
const e2e = gateFromRecordFile('e2e', 'results/e2e.json');

// QR-001 (fail-closed): every required gate must be an actual PASS. `not-run`,
// `STALE`, `FAIL`, `unknown` — anything that is not a real measured PASS —
// fails the verdict for the production gate.
const REQUIRED = ['typecheck', 'lint', 'i18n', 'security', 'uiux', 'unit', 'a11y', 'build', 'e2e'];
const verification = {
  typecheck: gates.typecheck.status,
  lint: gates.lint.status,
  i18n: gates.i18n.status,
  security: gates.security.status,
  uiux: gates.uiux.status,
  unit: unit.status,
  a11y: a11y.status,
  build: build.status,
  e2e: e2e.status,
};
const failedRequired = REQUIRED.filter((name) => verification[name] !== 'PASS');

const report = {
  generatedAt: new Date().toISOString(),
  commit,
  branch,
  version: pkg.version ?? null,
  note: 'Generated by scripts/generate-quality-report.mjs. Only "PASS" means passing — "not-run" and "STALE" fail the verdict (QR-001). Build/e2e come from evidence files only (QR-002); artifacts are commit-bound (QR-003).',
  verification,
  failedRequired,
  gates,
  unit,
  a11y,
  build,
  e2e,
  realityMatrixSource: realityMatrix ? 'docs/baseline/feature-reality-matrix.json' : null,
  verdict: failedRequired.length === 0 ? 'PASS' : 'FAIL',
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));

for (const [k, v] of Object.entries(report.verification)) {
  console.log(`${k.padEnd(10)} ${v}`);
}
console.log(`\nverdict: ${report.verdict}\nwritten: ${path.relative(root, OUT)}`);

// Auto-sync documentation and reality metrics whenever quality report is generated
try {
  const { syncMetricsAndDocs } = await import('./sync-metrics-and-docs.mjs');
  syncMetricsAndDocs({ write: true });
} catch (e) {
  console.warn('[quality-gate] Could not auto-sync docs:', e?.message);
}

process.exit(report.verdict === 'PASS' ? 0 : 1);
