/**
 * Extract unique fa/en string pairs from `locale === 'fa' ? 'A' : 'B'` ternaries
 * (plus `locale === 'en'` reversed form) into a translation catalog.
 * Usage: node scripts/extract-catalog.js   → writes .tmp-catalog.json
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

const files = walk(path.join(ROOT, 'src'));

// locale === 'fa' ? 'A' : 'B'   (string literals only, no interpolation)
const RE_FA = /locale\s*===\s*'fa'\s*\?\s*(['"])((?:(?!\1).)*)\1\s*:\s*(['"])((?:(?!\3).)*)\3/g;
// locale === 'en' ? 'A' : 'B'  → en first
const RE_EN = /locale\s*===\s*'en'\s*\?\s*(['"])((?:(?!\1).)*)\1\s*:\s*(['"])((?:(?!\3).)*)\3/g;

const catalog = {};
let total = 0;
const perFile = {};
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  let m;
  let count = 0;
  RE_FA.lastIndex = 0;
  while ((m = RE_FA.exec(src))) {
    catalog[m[2]] = m[4]; // fa → en
    count++;
  }
  RE_EN.lastIndex = 0;
  while ((m = RE_EN.exec(src))) {
    catalog[m[4]] = m[2]; // fa → en (reversed sides)
    count++;
  }
  if (count) perFile[path.relative(ROOT, f)] = count;
  total += count;
}

fs.writeFileSync(path.join(ROOT, '.tmp-catalog.json'), JSON.stringify(catalog, null, 2), 'utf8');
console.log('ternary occurrences:', total, '| unique fa strings:', Object.keys(catalog).length);
console.log('files:', Object.keys(perFile).length);
