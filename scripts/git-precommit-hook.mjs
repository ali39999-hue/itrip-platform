/**
 * GIT-PRECOMMIT-HOOK.MJS
 *
 * Runs automatically before commits to guarantee that README.md,
 * FEATURE_REALITY_MATRIX.md, and docs/ARCHITECTURE.fa.md are 100%
 * up to date with the latest code, tests, and migrations.
 */
import { syncMetricsAndDocs } from './sync-metrics-and-docs.mjs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('[pre-commit] Verifying and synchronizing documentation metrics...');
const result = syncMetricsAndDocs({ write: true });

if (result.hasDrift) {
  try {
    execSync('git add README.md docs/baseline/FEATURE_REALITY_MATRIX.md docs/ARCHITECTURE.fa.md', {
      cwd: root,
      stdio: 'inherit',
    });
    console.log('[pre-commit] Staged updated documentation files.');
  } catch {
    // Non-git environment or already staged
  }
}
process.exit(0);
