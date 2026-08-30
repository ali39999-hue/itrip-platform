const fs = require('fs');
const path = require('path');

const DO_NOT_EDIT = new Set([
  'src/components/checkout/constants.ts',
  'src/components/checkout/types.ts',
  'src/components/checkout/hooks/useCheckoutWorkflow.ts',
  'src/components/ui/Avatar.tsx',
  'src/components/ui/Card.tsx',
  'src/components/ui/Dialog.tsx',
  'src/components/ui/EmptyState.tsx',
  'src/components/ui/Sheet.tsx',
  'src/components/ui/Skeleton.tsx',
  'src/components/ui/Tabs.tsx',
  'src/components/ui/Tooltip.tsx',
  'src/components/ui/index.ts',
  'src/components/home/HomeSections.tsx',
  'src/app/[locale]/my-trips/[id]/page.tsx',
  'src/app/global-error.tsx',
  'src/app/[locale]/global-error.tsx',
]);

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk(path.join(__dirname, '..', 'src'), []);
const rows = [];
for (const f of files) {
  const rel = path.relative(path.join(__dirname, '..'), f).replace(/\\/g, '/');
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  const hits = [];
  lines.forEach((ln, i) => {
    if (/[\u0600-\u06FF]/.test(ln)) hits.push({ n: i + 1, ln: ln.trim().slice(0, 160) });
  });
  if (hits.length) rows.push({ rel, count: hits.length, hits, dne: DO_NOT_EDIT.has(rel) });
}
rows.sort((a, b) => b.count - a.count);
let tot = 0;
for (const r of rows) {
  tot += r.count;
  console.log((r.dne ? '[DNE] ' : '      ') + String(r.count).padStart(4) + '  ' + r.rel);
}
console.log('TOTAL lines with Persian/Arabic chars: ' + tot + ' in ' + rows.length + ' files');
