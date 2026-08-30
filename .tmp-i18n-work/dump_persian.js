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

// Only these are in scope for extraction (Task 2 admin surface + components)
const SCOPE = process.argv[2]
  ? process.argv[2].split('|')
  : null;

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk(path.join(__dirname, '..', 'src'), []);
for (const f of files) {
  const rel = path.relative(path.join(__dirname, '..'), f).replace(/\\/g, '/');
  if (DO_NOT_EDIT.has(rel)) continue;
  if (SCOPE && !SCOPE.includes(rel)) continue;
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  const hits = [];
  lines.forEach((ln, i) => {
    if (/[\u0600-\u06FF]/.test(ln)) hits.push(String(i + 1).padStart(4) + ': ' + ln.trim().slice(0, 200));
  });
  if (hits.length) {
    console.log('\n===== ' + rel + ' (' + hits.length + ')');
    console.log(hits.join('\n'));
  }
}
