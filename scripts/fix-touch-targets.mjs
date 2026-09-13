// Codemod per AGENTS.md §1.3: add min-h-[44px] min-w-[44px] to icon-only controls
// flagged by scripts/uiux-audit.mjs (small-icon-target rule).
// min-height/min-width beat h-*/w-* in CSS, so this never shrinks a control.
// Usage: node scripts/fix-touch-targets.mjs [--dry]
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.argv.includes('--dry') ? 'src' : (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'src');
const DRY = process.argv.includes('--dry');
const SKIP_DIRS = new Set(['node_modules', '.next', 'test-results', '__tests__']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(p, out);
    } else if (/\.(tsx|ts)$/.test(name) && !/\.(test|spec)\./.test(name)) {
      out.push(p);
    }
  }
  return out;
}

// Real end of a JSX open tag: first `>` outside quotes and {}/() depth
// (naive first-`>` truncates at arrow functions like onClick={() => …}).
function openTagEnd(src, start, max = 4000) {
  let quote = null;
  let depth = 0;
  const end = Math.min(src.length, start + max);
  for (let i = start; i < end; i++) {
    const c = src[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{' || c === '(') { depth++; continue; }
    if (c === '}' || c === ')') { depth = Math.max(0, depth - 1); continue; }
    if (c === '>' && depth === 0) return i;
  }
  return -1;
}

const MIN = 'min-h-[44px] min-w-[44px]';

for (const file of walk(ROOT)) {
  const src = readFileSync(file, 'utf8');
  let out = '';
  let cursor = 0;
  let patched = 0;
  const btnRe = /<(button|Button|a|Link)\b[^>]*>/g;
  let m;
  while ((m = btnRe.exec(src))) {
    const tagStart = m.index;
    const tagEnd = openTagEnd(src, tagStart);
    if (tagEnd === -1) continue;
    const chunk = src.slice(tagStart, tagEnd + 1);
    // content window: this element's own children only (stop at its close tag)
    const closeMatch = src.slice(tagEnd, tagEnd + 2000).match(/<\/(?:button|Button|a|Link)>/);
    const contentEnd = closeMatch ? tagEnd + closeMatch.index : tagEnd + 600;
    const content = src.slice(tagEnd + 1, Math.min(contentEnd + 20, tagEnd + 600));
    const hasSize = /min-[wh]-\[4[48]px\]|(?:min-h|h|size)-1[12]\b|p-3\b|p-4\b|py-3\b/.test(chunk);
    const iconOnly = /aria-label|sr-only/.test(chunk + content)
      && !/\b[A-Z\u0600-\u06FF][\w\u0600-\u06FF ]{2,}</.test(content)
      && !/\{(?:t|ct)\(/.test(content);
    if (!iconOnly || hasSize) continue;

    // insert MIN into the first string literal of the className attribute
    const cm = /className=(?:\{)?[`"']/.exec(chunk);
    if (!cm) { console.warn(`SKIP (no literal className): ${relative('.', file)} @${src.slice(0, tagStart).split('\n').length}`); continue; }
    const insertAt = tagStart + cm.index + cm[0].length;
    out += src.slice(cursor, insertAt) + MIN + ' ';
    cursor = insertAt;
    patched++;
  }
  if (patched) {
    out += src.slice(cursor);
    if (!DRY) writeFileSync(file, out);
    console.log(`${DRY ? 'DRY ' : 'PATCH'} ${patched}  ${relative('.', file)}`);
  }
}
