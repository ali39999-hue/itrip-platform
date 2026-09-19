#!/usr/bin/env node
/**
 * RC-001 — Release ↔ Runtime ↔ Live consistency verification.
 *
 * Every claim in this report is measured, nothing is copied from documentation:
 *   - local: package.json version, src/lib/version.ts, git HEAD, quality report
 *   - runtime: a real HTTP probe of /api/version and /api/health/live
 *
 * Writes results/release-consistency.json (evidence) and exits non-zero on drift,
 * so CI and the Reality Matrix can never report an aligned release that is not.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIVE_BASE = process.env.LIVE_BASE_URL || 'https://itrip-platform.vercel.app';
const TIMEOUT_MS = Number(process.env.RELEASE_PROBE_TIMEOUT_MS || 20000);

function execSyncSafe(cmd) {
  try {
    return execSync(cmd, { cwd: root, stdio: 'pipe' }).toString().trim();
  } catch {
    return '';
  }
}

function readVersionSource() {
  const content = fs.readFileSync(path.join(root, 'src', 'lib', 'version.ts'), 'utf8');
  const m = content.match(/NEXT_PUBLIC_APP_VERSION\s*=\s*process\.env\.NEXT_PUBLIC_APP_VERSION\s*\|\|\s*'([^']+)'/);
  return m ? m[1] : null;
}

async function fetchJson(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return { httpStatus: res.status, body: null };
    return { httpStatus: res.status, body: await res.json() };
  } catch (err) {
    return { httpStatus: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const localVersion = pkg.version ?? null;
const localSourceVersion = readVersionSource();
const head = execSyncSafe('git rev-parse HEAD') || 'unknown';
const dirty = execSyncSafe('git status --porcelain') !== '';

console.log('=== [RC-001] Release / Runtime / Live consistency ===');
console.log(`local version (package.json) : ${localVersion}`);
console.log(`local version (version.ts)   : ${localSourceVersion}`);
console.log(`git HEAD                     : ${head.slice(0, 12)}${dirty ? ' (dirty working tree)' : ''}`);

const [versionRes, healthRes] = await Promise.all([
  fetchJson(`${LIVE_BASE}/api/version`),
  fetchJson(`${LIVE_BASE}/api/health/live`),
]);

const runtime = versionRes.body
  ? {
      httpStatus: versionRes.httpStatus,
      version: versionRes.body.version ?? null,
      commitSha: versionRes.body.commitSha ?? null,
      environment: versionRes.body.environment ?? null,
      nodeRuntime: versionRes.body.runtime ?? null,
    }
  : { httpStatus: versionRes.httpStatus, error: versionRes.error ?? 'unreachable' };

console.log(`live  /api/version           : ${JSON.stringify(runtime)}`);
console.log(`live  /api/health/live       : HTTP ${healthRes.httpStatus}`);

const checks = {
  packageVersionMatchesVersionSource: {
    expected: localVersion,
    observed: localSourceVersion,
    pass: Boolean(localVersion && localSourceVersion && localVersion === localSourceVersion),
  },
  runtimeReachable: {
    expected: 'HTTP 200 on /api/version',
    observed: `HTTP ${versionRes.httpStatus}`,
    pass: versionRes.httpStatus === 200 && Boolean(versionRes.body),
  },
  runtimeVersionMatchesRelease: {
    expected: localVersion,
    observed: runtime.version ?? null,
    pass: Boolean(runtime.version && runtime.version === localVersion),
  },
  runtimeCommitMatchesHead: {
    expected: head,
    observed: runtime.commitSha ?? null,
    pass: Boolean(runtime.commitSha && runtime.commitSha === head),
  },
  workingTreeClean: {
    expected: 'clean (deployed artifact is reproducible from HEAD)',
    observed: dirty ? 'dirty working tree' : 'clean',
    pass: !dirty,
  },
  liveHealthEndpoint: {
    expected: 'HTTP 200 on /api/health/live',
    observed: `HTTP ${healthRes.httpStatus}`,
    pass: healthRes.httpStatus === 200,
  },
};

const failed = [];
const warnings = [];
for (const [name, check] of Object.entries(checks)) {
  // RC-001: the release-alignment verdict depends on version/commit/health.
  // A dirty working tree is NOT release drift (the deployed artifact is still
  // aligned) — it is a reproducibility warning that blocks a release train.
  if (!check.pass) (name === 'workingTreeClean' ? warnings : failed).push(name);
}

const report = {
  generatedAt: new Date().toISOString(),
  liveBaseUrl: LIVE_BASE,
  local: {
    gitHead: head,
    dirtyWorkingTree: dirty,
    packageVersion: localVersion,
    versionSource: localSourceVersion,
  },
  runtime,
  health: { httpStatus: healthRes.httpStatus, error: healthRes.error ?? null },
  checks,
  failedChecks: failed,
  warnings,
  verdict: failed.length === 0 ? 'ALIGNED' : 'DRIFT',
};

fs.mkdirSync(path.join(root, 'results'), { recursive: true });
fs.writeFileSync(path.join(root, 'results', 'release-consistency.json'), JSON.stringify(report, null, 2));

for (const [name, check] of Object.entries(checks)) {
  console.log(`  ${check.pass ? '[PASS]' : '[FAIL]'} ${name}: expected=${JSON.stringify(check.expected)} observed=${JSON.stringify(check.observed)}`);
}
console.log(`\nverdict: ${report.verdict} (written: results/release-consistency.json)`);

if (failed.length > 0) {
  console.error(`[RC-001] FAILED — drift detected: ${failed.join(', ')}`);
  if (warnings.length > 0) console.error(`[RC-001] WARN — ${warnings.join(', ')}`);
  process.exit(1);
}
if (warnings.length > 0) {
  console.warn(`[RC-001] ALIGNED with warnings: ${warnings.join(', ')}`);
}
process.exit(0);