/** Scan src/ for user-visible hardcoded Persian text (i18n leaks). Usage: node scripts/persian-scan.js */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// line-scoped exclusions: comments and imports
function isComment(line, col) {
  const before = line.slice(0, col);
  const c = before.lastIndexOf('//');
  const b = before.lastIndexOf('/*');
  const a = before.lastIndexOf('*/');
  if (c !== -1) return true;
  if (b !== -1 && a < b) return true;
  return false;
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|ts)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk(path.join(ROOT, 'src'));
const hits = [];
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    // strip block-comment-only lines and import lines
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    if (/^import\s/.test(trimmed) && /persian|jalali/i.test(trimmed)) return;
    const re = /[\u0600-\u06FF]/g;
    let m;
    while ((m = re.exec(line))) {
      if (isComment(line, m.index)) continue;
      hits.push(path.relative(ROOT, f) + ':' + (i + 1) + ': ' + trimmed.slice(0, 110));
      break;
    }
  });
}
console.log(hits.length + ' hits\n');
hits.forEach((h) => console.log(h));
