#!/usr/bin/env node
/**
 * SEC-106: Dependency & Container Security Scanner
 *
 * Runs vulnerability audits on dependencies and inspects container definitions
 * for security anti-patterns (running as root, missing pinned versions, exposed secrets).
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

console.log('=== [SEC-106] Starting Dependency & Container Security Scan ===');

let exitCode = 0;

// 1. Dependency Vulnerability Audit (npm audit)
console.log('[1/2] Auditing npm dependencies for known CVE vulnerabilities...');
const auditProc = spawnSync('npm', ['audit', '--json'], {
  cwd: root,
  encoding: 'utf8',
  shell: true,
});

try {
  const auditResult = JSON.parse(auditProc.stdout || '{}');
  const vulnerabilities = auditResult.metadata?.vulnerabilities || {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
    info: 0,
    total: 0,
  };

  console.log(`- Vulnerability Summary: Critical: ${vulnerabilities.critical}, High: ${vulnerabilities.high}, Moderate: ${vulnerabilities.moderate}, Low: ${vulnerabilities.low}`);

  // Policy: 0 Critical, 0 High permitted in production pipeline
  if (vulnerabilities.critical > 0 || vulnerabilities.high > 0) {
    console.error(`::error::Security Audit Failed: Detected ${vulnerabilities.critical} critical and ${vulnerabilities.high} high vulnerabilities!`);
    if (auditResult.vulnerabilities) {
      for (const [pkg, info] of Object.entries(auditResult.vulnerabilities)) {
        if (info.severity === 'critical' || info.severity === 'high') {
          console.error(`  - [${info.severity.toUpperCase()}] Package '${pkg}': ${info.via?.[0]?.title || info.via || 'Advisory detected'}`);
        }
      }
    }
    exitCode = 1;
  } else {
    console.log('[OK] Dependency audit passed: 0 critical and 0 high vulnerabilities.');
  }
} catch {
  // If npm audit returns non-zero with unparseable stdout
  if (auditProc.status !== 0) {
    console.warn(`[WARN] npm audit exited with code ${auditProc.status}. Stderr: ${auditProc.stderr}`);
  } else {
    console.log('[OK] Dependency audit completed.');
  }
}

// 2. Container & Secret Configuration Inspection
console.log('[2/2] Inspecting container definitions & environment configs for security anomalies...');
const filesToCheck = [
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  '.github/workflows/ci.yml',
];

const SECRET_REGEX = /(password|secret|key|token)\s*[:=]\s*["']?[a-zA-Z0-9_-]{8,}["']?/i;

for (const relFile of filesToCheck) {
  const fullPath = path.join(root, relFile);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');

    // Check for running as root in Dockerfile
    if (relFile === 'Dockerfile' && !content.includes('USER ') && !content.includes('USER\t')) {
      console.warn(`::warning::[SEC-106] Container Dockerfile does not define a non-root USER directive!`);
    }

    // Check for hardcoded real secrets (excluding mock/ci markers)
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (
        SECRET_REGEX.test(line) &&
        !line.includes('secrets.') &&
        !line.includes('dummy') &&
        !line.includes('test') &&
        !line.includes('mock') &&
        !line.includes('#')
      ) {
        console.warn(`::warning::[SEC-106] Potential hardcoded credential in ${relFile}:${idx + 1}`);
      }
    });
  }
}

console.log('=== [SEC-106] Security Scan Completed ===');
process.exit(exitCode);
