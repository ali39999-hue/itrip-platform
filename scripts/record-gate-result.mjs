#!/usr/bin/env node
/**
 * QR-004 — records a gate result into a machine-readable artifact.
 *
 * Quality build/E2E statuses must come from REAL runs of the corresponding
 * commands, never from an env var (`QUALITY_BUILD_STATUS=pass`) set in CI.
 * CI runs the build/tests first, then records the measured outcome:
 *
 *   npm run build && node scripts/record-gate-result.mjs build pass -- npm run build
 *   node scripts/record-gate-result.mjs build fail
 *
 * Writes results/<gate>.json with commit binding so the quality report can
 * verify that the evidence belongs to the commit under test.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [gate, status, ...noteParts] = process.argv.slice(2);

const ALLOWED_GATES = ['build', 'e2e', 'migration', 'responsive', 'dr-drill', 'live-verify'];
const ALLOWED_STATUS = ['pass', 'fail'];

if (!ALLOWED_GATES.includes(gate) || !ALLOWED_STATUS.includes(status)) {
  console.error(`Usage: node scripts/record-gate-result.mjs <${ALLOWED_GATES.join('|')}> <pass|fail> [note...]`);
  process.exit(2);
}

function git(cmd) {
  try {
    return execSync(cmd, { cwd: root, stdio: 'pipe' }).toString().trim();
  } catch {
    return '';
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const record = {
  gate,
  status: status === 'pass' ? 'PASS' : 'FAIL',
  recordedAt: new Date().toISOString(),
  version: pkg.version || 'unknown',
  commit: process.env.GITHUB_SHA || git('git rev-parse HEAD') || 'unknown',
  branch: process.env.GITHUB_REF_NAME || git('git rev-parse --abbrev-ref HEAD') || '',
  note: noteParts.join(' ').replace(/^--\s*/, '') || null,
};

fs.mkdirSync(path.join(root, 'results'), { recursive: true });
const out = path.join(root, 'results', `${gate}.json`);
fs.writeFileSync(out, JSON.stringify(record, null, 2));
console.log(`[record-gate-result] ${gate}=${record.status} @ ${record.commit.slice(0, 12)} -> ${path.relative(root, out)}`);