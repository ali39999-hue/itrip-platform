import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts|css)$/.test(n) && !n.includes('.test.')) out.push(p);
  }
  return out;
}
for (const f of walk('src')) {
  const s = readFileSync(f, 'utf8');
  const lines = s.split('\n');
  lines.forEach((l, i) => {
    if (/theme/i.test(l) && /toggle|switch|localStorage|classList|'dark'|"dark"|moon|Sun|Moon/i.test(l)) {
      console.log(`${f}:${i + 1}  ${l.trim().slice(0, 150)}`);
    }
  });
}
