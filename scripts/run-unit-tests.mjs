// Unit-test runner with isolated database.
//
// Local dev: DATABASE_URL points at the shared `itrip` database. This wrapper
// transparently retargets the suite at `itrip_test` (same credentials/host),
// applies migrations, and runs vitest — so test fixtures never pollute dev data.
// CI/other environments: any DATABASE_URL whose database is not exactly `itrip`
// is used unchanged; TEST_DATABASE_URL always wins when provided.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function execSyncSafe(cmd) {
  try {
    return execSync(cmd, { stdio: 'pipe', encoding: 'utf8' }).toString().trim();
  } catch {
    return '';
  }
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envText = fs.existsSync(path.join(root, '.env'))
  ? fs.readFileSync(path.join(root, '.env'), 'utf8')
  : '';
const readEnv = (k) => {
  const m = envText.match(new RegExp('^' + k + '="?([^"\\r\\n]+)"?', 'm'));
  return m ? m[1] : undefined;
};

const dbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || readEnv('DATABASE_URL');
if (!dbUrl) {
  console.error('No DATABASE_URL available for tests');
  process.exit(1);
}

const isLocalDevDb = /\/itrip(\?|$)/.test(dbUrl);
const testUrl = isLocalDevDb && !process.env.TEST_DATABASE_URL
  ? dbUrl.replace(/\/itrip(\?|$)/, '/itrip_test$1')
  : dbUrl;

if (isLocalDevDb) {
  console.log('[test:unit] using isolated database:', testUrl.replace(/:[^:@/]+@/, ':***@'));
  const migrate = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    shell: true,
    cwd: root,
    env: { ...process.env, DATABASE_URL: testUrl },
  });
  if (migrate.status !== 0) {
    console.error('[test:unit] failed to apply migrations to the test database');
    process.exit(migrate.status ?? 1);
  }
}

const hasReporterArg = process.argv.slice(2).some((a) => a.startsWith('--reporter'));
const artifactDir = path.join(root, 'results');
fs.mkdirSync(artifactDir, { recursive: true });
const jsonOut = path.relative(root, path.join(artifactDir, 'unit.json')).replace(/\\/g, '/');
// Always emit a machine-readable artifact alongside the human output, so the
// quality report (scripts/generate-quality-report.mjs) reflects a REAL run
// instead of a hand-copied number in a markdown file.
const reporterArgs = hasReporterArg
  ? []
  : ['--reporter=default', '--reporter=json', `--outputFile.json=${jsonOut}`];

const vitest = spawnSync('npx', ['vitest', 'run', ...process.argv.slice(2), ...reporterArgs], {
  stdio: 'inherit',
  shell: true,
  cwd: root,
  env: {
    ...process.env,
    DATABASE_URL: testUrl,
    DEMO_MODE: process.env.DEMO_MODE || 'true',
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE || 'true',
  },
});
// QR-003: bind the evidence artifact to the measured commit. A unit.json from
// another commit must not be mistaken for evidence about this one.
try {
  const commit = execSyncSafe('git rev-parse HEAD');
  const branch = execSyncSafe('git rev-parse --abbrev-ref HEAD');
  const dirty = execSyncSafe('git status --porcelain') !== '';
  const artifactPath = path.join(artifactDir, 'unit.json');
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    artifact.commit = commit;
    artifact.branch = branch;
    artifact.dirty = dirty;
    artifact.generatedAt = new Date().toISOString();
    fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
  }
} catch {
  // provenance stamping is best-effort; the vitest exit code stays authoritative
}
if (vitest.status === 0) {
  try {
    const { syncMetricsAndDocs } = await import('./sync-metrics-and-docs.mjs');
    syncMetricsAndDocs({ write: true });
  } catch (syncErr) {
    // Non-blocking
  }
}
process.exit(vitest.status ?? 1);
