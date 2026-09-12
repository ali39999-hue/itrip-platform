// Read-only API response-contract scan (audit 2026-09-12 follow-up).
// Convention (src/lib/api-response.ts): error bodies must be
// { success: false, error } and success bodies carry success: true.
// Excluded: external contracts (payments/webhook = eCardo IPN) and infra
// probes (health/live, health/ready, version, capabilities).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = path.join(root, 'src', 'app', 'api');
const EXCLUDED = ['payments\\webhook', 'payments/webhook', 'health', 'version', 'capabilities'];

const issues = [];
const routeFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(p); continue; }
    if (entry.name !== 'route.ts') continue;
    const rel = path.relative(root, p);
    routeFiles.push(rel);
    if (EXCLUDED.some((x) => rel.includes(x))) continue;
    const text = fs.readFileSync(p, 'utf8');
    text.split('\n').forEach((line, i) => {
      if (/json\(\s*\{\s*error:/.test(line)) {
        issues.push(`${rel.replace(/\\/g, '/')}:${i + 1}: ${line.trim().slice(0, 100)}`);
      }
    });
  }
}

walk(apiDir);
console.log(`route files scanned: ${routeFiles.length}`);
console.log(`error bodies missing success:false: ${issues.length}`);
for (const v of issues) console.log('  ' + v);
