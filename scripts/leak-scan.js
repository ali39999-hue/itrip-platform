/** Report REAL i18n leaks: Persian text on lines that are not lt()-wrapped and not in bilingual data fields. */
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
const leaks = [];
const data = [];
for (const f of files) {
  const rel = path.relative(ROOT, f);
  const isLibData = /^src[\\/]lib[\\/](countries|data|interpreters|hotel-mock|admin-mock)\.ts$/.test(rel) || /^src[\\/]lib[\\/]money\.ts$/.test(rel);
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    if (!/[\u0600-\u06FF]/.test(line)) return;
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
    if (/lt\(locale,\s*\{/.test(line)) return; // localized via lt()
    if (/\bfa:\s*['"`]/.test(line) && /en:/.test(line)) return; // inline bilingual object literal
    const hit = rel + ':' + (i + 1) + ': ' + t.slice(0, 100);
    if (isLibData) data.push(hit);
    else leaks.push(hit);
  });
}
console.log('LEAKS (unlocalized Persian in UI code): ' + leaks.length);
const byFile = {};
for (const l of leaks) {
  const f = l.split(':')[0];
  byFile[f] = (byFile[f] || 0) + 1;
}
Object.entries(byFile)
  .sort((a, b) => b[1] - a[1])
  .forEach(([f, c]) => console.log(String(c).padStart(4), f));
console.log('\nLIB DATA (separate bucket): ' + data.length);
