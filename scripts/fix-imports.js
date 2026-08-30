/**
 * Repair misplaced `import { lt } from '@/lib/lt';` lines: move each to after
 * the true last import STATEMENT (handles multiline imports).
 * Usage: node scripts/fix-imports.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|ts)$/.test(e.name)) out.push(p);
  }
  return out;
}

const LT_IMPORT = /^import\s*\{\s*lt\s*\}\s*from\s*'@\/lib\/lt';\s*$/;

for (const f of walk(path.join(ROOT, 'src'))) {
  let lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  const hasBad = lines.some((l) => LT_IMPORT.test(l));
  const usesLt = lines.some((l) => /\blt\(locale,/.test(l));
  if (!hasBad) continue;

  // remove all lt import lines
  lines = lines.filter((l) => !LT_IMPORT.test(l));

  if (!usesLt) {
    fs.writeFileSync(f, lines.join('\n'), 'utf8');
    continue;
  }

  // find end of last import statement (single-line ends with ';', multiline ends after 'from ...;' line)
  let insertAt = 0;
  let inImport = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!inImport && /^import\s/.test(t)) {
      if (/;\s*$/.test(t) && /from\s+['"]/.test(t)) insertAt = i + 1; // single-line complete
      else inImport = true; // multiline or side-effect import
    } else if (inImport) {
      if (/;\s*$/.test(t)) {
        insertAt = i + 1;
        inImport = false;
      }
    }
  }
  lines.splice(insertAt, 0, "import { lt } from '@/lib/lt';");
  fs.writeFileSync(f, lines.join('\n'), 'utf8');
  console.log('fixed:', path.relative(ROOT, f));
}
