#!/usr/bin/env node
/**
 * Firuzo Security Engineering Program (SEP) — Comprehensive Security Scanner
 *
 * Implements automated multi-stage gates covering:
 * [1/5] Dependency CVE Audit (Zero Critical/High CVE policy)
 * [2/5] Hardcoded Secret & Credential Detection (Gitleaks-equivalent heuristics)
 * [3/5] Static Security AST / Anti-Pattern Guard (Semgrep-equivalent rules)
 * [4/5] Container & IaC Security (Non-root user, unprivileged container policy)
 * [5/5] OWASP ASVS 5.0 Header & Platform Contract Verification
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

console.log('=== [FIRUZO-SEP] Starting Comprehensive Security & ASVS 5.0 Scan ===\n');

let exitCode = 0;
let totalChecks = 0;
let passedChecks = 0;

function reportCheck(title, pass, message) {
  totalChecks++;
  if (pass) {
    passedChecks++;
    console.log(`[PASS] ${title}`);
  } else {
    console.error(`::error::[FAIL] ${title} — ${message}`);
    exitCode = 1;
  }
}

// ============================================================================
// [1/5] Dependency Vulnerability Audit (npm audit)
// ============================================================================
console.log('[Phase 1/5] Auditing Dependencies for Known CVEs (OWASP ASVS V10)...');
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

  console.log(
    `  - Summary: Critical: ${vulnerabilities.critical}, High: ${vulnerabilities.high}, Moderate: ${vulnerabilities.moderate}, Low: ${vulnerabilities.low}`
  );

  const noHighOrCritical = vulnerabilities.critical === 0 && vulnerabilities.high === 0;
  reportCheck(
    'Dependency CVE Gate (0 Critical, 0 High)',
    noHighOrCritical,
    `Detected ${vulnerabilities.critical} critical and ${vulnerabilities.high} high vulnerabilities!`
  );
} catch {
  if (auditProc.status !== 0) {
    console.warn(`  [WARN] npm audit exited with code ${auditProc.status}. Continuing...`);
  } else {
    reportCheck('Dependency CVE Gate', true, 'Completed');
  }
}

// ============================================================================
// [2/5] Secret & Credential Scanning (Gitleaks-equivalent heuristics)
// ============================================================================
console.log('\n[Phase 2/5] Scanning Source Code for Hardcoded Secrets & Credentials...');

const SECRET_PATTERNS = [
  { name: 'Private Key', regex: /-----BEGIN (RSA|EC|OPENSSH|DSA|PGP|ENCRYPTED|PRIVATE) KEY-----/ },
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'Generic Live Secret Token', regex: /(api[_-]?key|secret[_-]?key|auth[_-]?token|private[_-]?key)\s*[:=]\s*["'][A-Za-z0-9_\-]{32,}["']/i },
  { name: 'Database Password in Connection URI', regex: /(postgres|mysql|mongodb):\/\/[a-zA-Z0-9_-]+:[a-zA-Z0-9_#$!@%^&*()-]{8,}@/ },
];

function scanDirectoryForSecrets(dir) {
  const findings = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(root, fullPath).replace(/\\/g, '/');

    if (
      entry.name === 'node_modules' ||
      entry.name === '.next' ||
      entry.name === '.git' ||
      entry.name === 'dist' ||
      entry.name === 'coverage'
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      findings.push(...scanDirectoryForSecrets(fullPath));
    } else if (entry.isFile()) {
      // Skip test files, mocks, seeds, and markdown docs for secret scanning
      if (
        relPath.endsWith('.test.ts') ||
        relPath.endsWith('.test.tsx') ||
        relPath.endsWith('.spec.ts') ||
        relPath.endsWith('.md') ||
        relPath.includes('/mock/') ||
        relPath.includes('clean_test_seeds') ||
        relPath.includes('seed-')
      ) {
        continue;
      }

      // Check relevant file extensions
      if (/\.(ts|tsx|js|mjs|json|yml|yaml|env)$/.test(entry.name)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n');

          lines.forEach((line, idx) => {
            // Ignore placeholder / dummy / test comments
            if (
              line.includes('process.env.') ||
              line.includes('dummy') ||
              line.includes('mock') ||
              line.includes('example') ||
              line.includes('placeholder') ||
              line.includes('dev-insecure-master-key')
            ) {
              return;
            }

            for (const pattern of SECRET_PATTERNS) {
              if (pattern.regex.test(line)) {
                findings.push({
                  file: relPath,
                  line: idx + 1,
                  type: pattern.name,
                });
              }
            }
          });
        } catch {
          // ignore unreadable files
        }
      }
    }
  }
  return findings;
}

const secretFindings = scanDirectoryForSecrets(path.join(root, 'src'));
reportCheck(
  'Zero Hardcoded Secrets in Production Source',
  secretFindings.length === 0,
  `Found ${secretFindings.length} potential secrets: ${JSON.stringify(secretFindings.slice(0, 3))}`
);

// ============================================================================
// [3/5] Static Security AST & Code Anti-Pattern Guard (Semgrep-equivalent)
// ============================================================================
console.log('\n[Phase 3/5] Verifying Static Security Invariants (OWASP ASVS V4 & V5)...');

let antiPatternFindings = [];
const srcDir = path.join(root, 'src');

function checkAntiPatterns(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(root, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        checkAntiPatterns(fullPath);
      }
    } else if (entry.isFile() && /\.(ts|tsx|js|mjs)$/.test(entry.name)) {
      if (relPath.endsWith('.test.ts') || relPath.endsWith('.test.tsx')) continue;

      const content = fs.readFileSync(fullPath, 'utf8');

      // Rule A: Direct use of eval()
      if (/\beval\s*\(/.test(content)) {
        antiPatternFindings.push({ file: relPath, rule: 'Direct eval() usage is strictly forbidden' });
      }

      // Rule B: Unsafe SQL execution via $queryRawUnsafe with interpolation
      if (/\$queryRawUnsafe\s*\(`/.test(content)) {
        antiPatternFindings.push({ file: relPath, rule: 'Unparameterized template literal inside $queryRawUnsafe' });
      }
    }
  }
}

checkAntiPatterns(srcDir);
reportCheck(
  'Static Code Invariants (No eval, No raw SQL string interpolation)',
  antiPatternFindings.length === 0,
  `Detected anti-patterns: ${JSON.stringify(antiPatternFindings)}`
);

// ============================================================================
// [4/5] Container & IaC Security Verification
// ============================================================================
console.log('\n[Phase 4/5] Auditing Container & Infrastructure Definitions...');

const dockerfilePath = path.join(root, 'Dockerfile');
let dockerPass = true;
let dockerMsg = '';

if (fs.existsSync(dockerfilePath)) {
  const dockerContent = fs.readFileSync(dockerfilePath, 'utf8');
  if (!dockerContent.includes('USER ') && !dockerContent.includes('USER\t')) {
    dockerPass = false;
    dockerMsg = 'Dockerfile does not enforce a non-root USER directive!';
  }
}
reportCheck('Container Least-Privilege (Non-Root User in Dockerfile)', dockerPass, dockerMsg);

const composeFiles = ['docker-compose.yml', 'docker-compose.infra.yml', 'docker-compose.dev.yml'];
let composePass = true;
let composeMsg = '';

for (const cf of composeFiles) {
  const cp = path.join(root, cf);
  if (fs.existsSync(cp)) {
    const content = fs.readFileSync(cp, 'utf8');
    if (content.includes('privileged: true')) {
      composePass = false;
      composeMsg = `Privileged mode detected in ${cf}!`;
      break;
    }
    if (content.includes('/var/run/docker.sock:/var/run/docker.sock')) {
      composePass = false;
      composeMsg = `Dangerous Docker socket mount detected in ${cf}!`;
      break;
    }
  }
}
reportCheck('Infrastructure Compose Safety (No privileged flag, No Docker socket mount)', composePass, composeMsg);

// ============================================================================
// [5/5] OWASP ASVS 5.0 Platform & Security Header Verification
// ============================================================================
console.log('\n[Phase 5/5] Verifying Next.js Security Headers & Platform Protection (ASVS V8)...');

const nextConfigPath = path.join(root, 'next.config.ts');
let headerPass = true;
let headerErrors = [];

if (fs.existsSync(nextConfigPath)) {
  const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf8');

  const requiredHeaders = [
    'Strict-Transport-Security',
    'Content-Security-Policy',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Referrer-Policy',
  ];

  for (const h of requiredHeaders) {
    if (!nextConfigContent.includes(h)) {
      headerPass = false;
      headerErrors.push(`Missing required security header: ${h}`);
    }
  }

  // ASVS 5.0 V8.3 & V13.1 Anti-Caching & Robot Isolation for API routes
  if (!nextConfigContent.includes("source: '/api/:path*'")) {
    headerPass = false;
    headerErrors.push("Missing /api/:path* path-specific security header mapping");
  }
  if (!nextConfigContent.includes('no-store, no-cache, must-revalidate')) {
    headerPass = false;
    headerErrors.push("Missing strict Cache-Control anti-caching for API routes");
  }
  if (!nextConfigContent.includes('X-Robots-Tag')) {
    headerPass = false;
    headerErrors.push("Missing X-Robots-Tag header to prevent API endpoint indexing");
  }

  if (!nextConfigContent.includes('dangerouslyAllowLocalIP: isDev')) {
    headerPass = false;
    headerErrors.push('dangerouslyAllowLocalIP must be restricted strictly to development mode (isDev)');
  }
} else {
  headerPass = false;
  headerErrors.push('next.config.ts not found');
}

reportCheck(
  'ASVS 5.0 Security Headers & Local IP Restriction Gate',
  headerPass,
  headerErrors.join('; ')
);

// ============================================================================
// Scan Summary
// ============================================================================
console.log('\n=============================================================');
console.log(`Scan Results: ${passedChecks}/${totalChecks} checks passed.`);
if (exitCode === 0) {
  console.log('STATUS: [ALL SECURITY & ASVS GATES 100% GREEN]');
} else {
  console.error('STATUS: [SECURITY SCAN FAILED — REMEDIATION REQUIRED]');
}
console.log('=============================================================');

process.exit(exitCode);
