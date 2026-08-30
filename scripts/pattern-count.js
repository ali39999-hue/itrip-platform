/** Count i18n ternary pattern variants across src/. Usage: node scripts/pattern-count.js */
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

const files = walk(path.join(ROOT, 'src'));
const stats = {};
const bump = (k, n) => (stats[k] = (stats[k] || 0) + n);

// pattern: locale === 'fa' ? <expr> : <expr>   (also !== and 'en' first)
const COND = /(\w+)\s*(===|!==)\s*'(fa|en)'\s*\?/g;
// whole ternary with two plain string literals (no interpolation, single/double/backtick-free)
const FULL_LITERAL = /\w+\s*(?:===|!==)\s*'(?:fa|en)'\s*\?\s*(['"])(?:(?!\1).)*\1\s*:\s*(['"])(?:(?!\2).)*\2/g;
// whole ternary with template literals on one or both sides
const FULL_TEMPLATE = /\w+\s*(?:===|!==)\s*'(?:fa|en)'\s*\?\s*`[^`]*`[^?]*:\s*`[^`]*`/g;

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  let m;
  COND.lastIndex = 0;
  while ((m = COND.exec(src))) {
    bump('cond:' + m[1] + ' ' + m[2] + ' ' + m[3], 1);
  }
  FULL_LITERAL.lastIndex = 0;
  bump('full_string_literal', (src.match(FULL_LITERAL) || []).length);
  FULL_TEMPLATE.lastIndex = 0;
  bump('full_template_literal', (src.match(FULL_TEMPLATE) || []).length);
}

for (const [k, v] of Object.entries(stats).sort((a, b) => b[1] - a[1])) console.log(String(v).padStart(5), k);
