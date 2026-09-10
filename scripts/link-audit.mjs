// One-off audit: find internal hrefs pointing to routes that don't exist in the app tree,
// and verify health endpoints respond.
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, sep } from 'node:path';

const ROOT = join(process.cwd(), 'src');
const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|mjs)$/.test(f)) files.push(p);
  }
})(ROOT);

// Collect real page routes under src/app/[locale]
const appDir = join(process.cwd(), 'src', 'app', '[locale]');
const pages = new Set();
(function walkApp(dir, rel) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const hasPage = entries.some((e) => e.isFile() && /^page\.tsx$/.test(e.name));
  if (hasPage) pages.add('/' + rel.split(sep).filter(Boolean).join('/'));
  for (const e of entries) {
    if (e.isDirectory() && !e.name.startsWith('(')) walkApp(join(dir, e.name), rel + sep + e.name);
  }
})(appDir, '');

const hrefRe = /(?:href|push|replace|redirect)\s*[=(]\s*[`'"]((?:\/[a-z-]+)?\/[a-z0-9\-/\[\]]*)[`'"]/gi;
const linkCounts = new Map();
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  let m;
  while ((m = hrefRe.exec(src))) {
    const path = m[1].split('?')[0];
    // strip locale prefix
    const stripped = path.replace(/^\/(fa|en|ar|zh|ru)\b/, '');
    if (!stripped.startsWith('/')) continue;
    if (stripped === '/' || stripped.startsWith('/api') || stripped.startsWith('/_')) continue;
    const count = linkCounts.get(stripped) || { n: 0, sample: f.replace(process.cwd(), '') };
    count.n++;
    linkCounts.set(stripped, count);
  }
}

const missing = [];
for (const [link, info] of [...linkCounts.entries()].sort((a, b) => b[1].n - a[1].n)) {
  const clean = link.replace(/\/$/, '');
  const hit = pages.has(clean) || pages.has(clean.replace(/\/\[\w+\]/, ''));
  const dynamic = [...pages].some((p) => p.includes('[') && clean.startsWith(p.split('[')[0]));
  if (!hit && !dynamic) missing.push({ link, ...info });
}

console.log(`Real page routes: ${pages.size}`);
console.log('--- linked paths with NO matching page route ---');
for (const m of missing) console.log(`${String(m.n).padStart(3)}x ${m.link}   (e.g. ${m.sample})`);
if (!missing.length) console.log('(none)');

// health endpoints
for (const ep of ['/api/health/live', '/api/health/ready']) {
  const res = await fetch('http://localhost:3000' + ep);
  console.log(res.status, ep, (await res.text()).slice(0, 100));
}
