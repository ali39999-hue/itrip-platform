// Read-only AGENTS.md §3 conformance scan: physical (left/right) Tailwind
// utilities must not be used in RTL-first components — logical properties
// (ms/me/ps/pe/start/end) are required. rtl:-prefixed usages are tolerated.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'src');

const violations = [];
const physicalRe = /(?:^|[\s"'`])(ml|mr|pl|pr)-\d|(?:^|[\s"'`])(left|right)-\d|(?:^|[\s"'`])text-(left|right)\b|(?:^|[\s"'`])float-(left|right)\b|(?:^|[\s"'`])(left|right)-full/g;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(p); continue; }
    if (!/\.(tsx|ts)$/.test(entry.name)) continue;
    const text = fs.readFileSync(p, 'utf8');
    text.split('\n').forEach((line, i) => {
      const stripped = line.replace(/rtl:/g, '');
      physicalRe.lastIndex = 0;
      if (physicalRe.test(stripped)) {
        violations.push(`${path.relative(root, p).replace(/\\/g, '/')}:${i + 1}: ${line.trim().slice(0, 110)}`);
      }
    });
  }
}

walk(srcDir);
console.log(`physical-utility violations: ${violations.length}`);
for (const v of violations.slice(0, 40)) console.log('  ' + v);
