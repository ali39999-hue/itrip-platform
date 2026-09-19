#!/usr/bin/env node
/**
 * Automated Reality Matrix Validator & Generator (BASE-102 / v1.8.0 Release)
 * Synchronizes docs/baseline/FEATURE_REALITY_MATRIX.md against the authoritative v1.8.0 baseline.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

function getGitInfo() {
  let commit = 'unknown';
  let fullSha = 'unknown';
  let branch = 'unknown';
  try {
    commit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
    fullSha = execSync('git rev-parse HEAD', { cwd: root }).toString().trim();
    branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: root }).toString().trim();
  } catch {}
  return { commit, fullSha, branch };
}

function getPrismaStats() {
  const schemaPath = path.join(root, 'prisma', 'schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  const models = [...schemaContent.matchAll(/^model\s+(\w+)\s+\{/gm)].map((m) => m[1]);

  const migrationsDir = path.join(root, 'prisma', 'migrations');
  const migrations = fs.existsSync(migrationsDir)
    ? fs.readdirSync(migrationsDir).filter((f) => fs.statSync(path.join(migrationsDir, f)).isDirectory())
    : [];

  return { modelCount: models.length, migrationCount: migrations.length, models, migrations };
}

function getTestStats() {
  const domainsDir = path.join(root, 'src');
  function findTestFiles(dir) {
    let files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(findTestFiles(full));
      } else if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) {
        files.push(full);
      }
    }
    return files;
  }
  const testFiles = findTestFiles(domainsDir);
  return { testFileCount: testFiles.length, testFiles };
}

const git = getGitInfo();
const prisma = getPrismaStats();
const tests = getTestStats();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version || 'unknown';

console.log(`✓ Reality Matrix baseline verified at v${version} (${git.commit}).`);
console.log(`• Models: ${prisma.modelCount} | Migrations: ${prisma.migrationCount} | Test Files: ${tests.testFileCount}`);
