// Design-excellence audit per frontend-design / card-heavy / web-design-guidelines skills.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'src';
const SKIP = new Set(['node_modules', '.next', 'test-results', '__tests__']);
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) { if (!SKIP.has(name)) walk(p, out); }
    else if (/\.tsx$/.test(name) && !/\.(test|spec)\./.test(name)) out.push(p);
  }
  return out;
}

const files = walk(ROOT).filter(f => !f.includes('admin')); // user-facing surfaces first
const findings = { pressFeedback: [], scrollerNoSnap: [], scrollerNoTouchAction: [], heavyAnimNoReduce: [] };

for (const f of files) {
  const s = readFileSync(f, 'utf8');
  const rel = relative('.', f);

  // 1) clickable card-like buttons/links (rounded-2xl/xl + border or shadow) lacking active:scale press feedback
  const clickableRe = /<(button|Link|a)\b[^>]*className="([^"]*)"/g;
  let m;
  while ((m = clickableRe.exec(s))) {
    const cls = m[1];
    const isCardlike = /(rounded-(2xl|3xl)|shadow-elev|border border-line)/.test(cls) && /(p-3|p-4|p-5|px-4|gap-3)/.test(cls);
    const hasPress = /active:scale|active:scale-\[|card-lift|press-effect/.test(cls);
    if (isCardlike && !hasPress) findings.pressFeedback.push({ file: rel, cls: cls.slice(0, 110) });
  }

  // 2) horizontal scrollers (chips/cards) without snap or without touch-pan-x
  const scrollRe = /className="([^"]*overflow-x-auto[^"]*)"/g;
  while ((m = scrollRe.exec(s))) {
    const cls = m[1];
    if (!/snap-x|snap-mandatory|snap-proximity/.test(cls)) findings.scrollerNoSnap.push({ file: rel, cls: cls.slice(0, 110) });
    if (!/touch-pan-x|touch-none|\[touch-action/.test(cls)) findings.scrollerNoTouchAction.push({ file: rel, cls: cls.slice(0, 110) });
  }
}

const g = readFileSync('src/app/globals.css', 'utf8');
console.log(JSON.stringify({
  tapHighlight: g.includes('-webkit-tap-highlight-color'),
  reducedMotionGuard: /prefers-reduced-motion/.test(g),
  tabularNums: /tabular-nums|font-variant-numeric/.test(g),
  ...Object.fromEntries(Object.entries(findings).map(([k, v]) => [k, v.length])),
}, null, 0));
for (const [k, v] of Object.entries(findings)) {
  console.log(`\n## ${k} (${v.length})`);
  const seen = new Set();
  for (const it of v) {
    const key = it.file + it.cls.slice(0, 40);
    if (seen.has(key)) continue; seen.add(key);
    console.log(`${it.file}  |  ${it.cls}`);
    if (seen.size > 25) { console.log('...'); break; }
  }
}
