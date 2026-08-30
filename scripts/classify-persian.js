/** Classify Persian-text lines per file: ternary-guarded vs plain (leak to all locales). */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const files = process.argv.slice(2);

for (const f of files) {
  const full = path.join(ROOT, f);
  const src = fs.readFileSync(full, 'utf8');
  const lines = src.split(/\r?\n/);
  let ternary = 0;
  let plain = 0;
  const samples = [];
  lines.forEach((l, i) => {
    if (!/[\u0600-\u06FF]/.test(l)) return;
    const t = l.trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
    if (/===\s*'fa'/.test(l) || /!==\s*'fa'/.test(l)) {
      ternary++;
      return;
    }
    plain++;
    if (samples.length < 5) samples.push(i + 1 + ': ' + t.slice(0, 110));
  });
  console.log('=== ' + f + ' | ternary:' + ternary + ' plain:' + plain);
  samples.forEach((s) => console.log('   ' + s));
}
