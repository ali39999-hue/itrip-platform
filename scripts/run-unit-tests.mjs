// Unit-test runner with isolated database.
//
// Local dev: DATABASE_URL points at the shared `itrip` database. This wrapper
// transparently retargets the suite at `itrip_test` (same credentials/host),
// applies migrations, and runs vitest — so test fixtures never pollute dev data.
// CI/other environments: any DATABASE_URL whose database is not exactly `itrip`
// is used unchanged; TEST_DATABASE_URL always wins when provided.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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

const vitest = spawnSync('npx', ['vitest', 'run', ...process.argv.slice(2)], {
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
process.exit(vitest.status ?? 1);
