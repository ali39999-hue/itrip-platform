/**
 * Apply translated catalog: rewrite `locale === 'fa' ? 'A' : 'B'` (and reversed
 * `locale === 'en'`) into `lt(locale, { fa, en, ar, zh, ru })` calls.
 * Usage: node scripts/apply-catalog.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, '.tmp-catalog-translated.json'), 'utf8'));

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|ts)$/.test(e.name)) out.push(p);
  }
  return out;
}

const q = (v) => `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function ltCall(entry) {
  return `lt(locale, { fa: ${q(entry.fa)}, en: ${q(entry.en)}, ar: ${q(entry.ar)}, zh: ${q(entry.zh)}, ru: ${q(entry.ru)} })`;
}

const RE_FA = /locale\s*===\s*'fa'\s*\?\s*(['"])((?:(?!\1).)*)\1\s*:\s*(['"])((?:(?!\3).)*)\3/g;
const RE_EN = /locale\s*===\s*'en'\s*\?\s*(['"])((?:(?!\1).)*)\1\s*:\s*(['"])((?:(?!\3).)*)\3/g;

let filesChanged = 0;
let replaced = 0;
const missing = new Set();

for (const f of walk(path.join(ROOT, 'src'))) {
  let src = fs.readFileSync(f, 'utf8');
  const before = src;

  src = src.replace(RE_FA, (whole, _q1, faVal, _q2, enVal) => {
    const e = catalog[faVal];
    if (!e) {
      missing.add(faVal);
      return whole;
    }
    replaced++;
    return ltCall(e);
  });

  src = src.replace(RE_EN, (whole, _q1, enVal, _q2, faVal) => {
    const e = catalog[faVal];
    if (!e) {
      missing.add(faVal);
      return whole;
    }
    replaced++;
    return ltCall(e);
  });

  if (src !== before) {
    if (!/from ['"]@\/lib\/lt['"]/.test(src)) {
      // insert import after the last import statement
      const imports = [...src.matchAll(/^import .*$/gm)];
      if (imports.length) {
        const last = imports[imports.length - 1];
        const idx = last.index + last[0].length;
        src = src.slice(0, idx) + `\nimport { lt } from '@/lib/lt';` + src.slice(idx);
      } else {
        src = `import { lt } from '@/lib/lt';\n` + src;
      }
    }
    fs.writeFileSync(f, src, 'utf8');
    filesChanged++;
  }
}

console.log('files changed:', filesChanged, '| ternaries replaced:', replaced);
if (missing.size) {
  console.log('MISSING CATALOG ENTRIES:');
  missing.forEach((m) => console.log('  ' + m));
}
