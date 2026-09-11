// UI/UX audit per AGENTS.md mobile-first rules. Scans TSX under src/ for violations.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.argv[2] || 'src';
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

const files = walk(ROOT);
// class token boundary: not preceded by - or word char (so ms- / me- / ps- / pe- / etc. don't match)
const issues = [];
const push = (file, line, ln, rule, detail) =>
  issues.push({ file: relative('.', file), line: ln, rule, detail: line.trim().slice(0, 220) });

// physical-direction classes (AGENTS.md §3: logical properties only)
const PHYS = [
  { re: /(?<![-\w])(ml|mr|pl|pr)-[a-z0-9[\]\/.-]+/g, label: 'physical spacing' },
  { re: /(?<![-\w])(left|right)-\d/g, label: 'physical left-/right- utility' },
];
// RTL flip needed on directional chevrons/arrows (AGENTS.md §3)
const DIRECTIONAL_ICON = /\b(chevron|arrow|ArrowLeft|ArrowRight|ChevronLeft|ChevronRight)\b/i;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    const ln = i + 1;
    for (const { re, label } of PHYS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line))) {
        // skip ones that are already logical or responsive-prefixed logical (e.g. rtl:left- is suspicious too but reported)
        push(file, line, ln, `physical-${label}`, m[0]);
      }
    }
  });

  // icon-only touch targets (AGENTS.md §1.3: 44x44 min)
  const btnRe = /<(button|Button|a|Link)\b[^>]*>/g;
  let bm;
  while ((bm = btnRe.exec(src))) {
    const tagStart = bm.index;
    const lineNo = src.slice(0, tagStart).split('\n').length;
    // capture up to closing tag crudely: take 800 chars after open
    const chunk = src.slice(tagStart, tagStart + 800).split('>')[0] + '>';
    const after = src.slice(tagStart, tagStart + 2000);
    const hasSize = /min-w-\[4[48]px\]|min-h-\[4[48]px\]|h-1[01]\b|h-12\b|size-1[124]\b|p-3\b|p-4\b|px-4\b|py-3\b/.test(chunk);
    const iconOnly = /aria-label|sr-only/.test(after.slice(0, 400)) && !/\b[A-Z\u0600-\u06FF][\w\u0600-\u06FF ]{2,}</.test(after.slice(0, 600));
    if (iconOnly && !hasSize) {
      push(file, chunk, lineNo, 'small-icon-target', 'icon-only control without 44px min target');
    }
  }

  // sticky bottom bar without safe-area (AGENTS.md §1.1/§1.4)
  if (/fixed bottom-0/.test(src) && !/safe-area-inset-bottom/.test(src) && !/pb-\[env/.test(src)) {
    const lineNo = src.slice(0, src.indexOf('fixed bottom-0')).split('\n').length;
    push(file, 'fixed bottom-0 (no safe-area pb)', lineNo, 'missing-safe-area', 'sticky bar lacks env(safe-area-inset-bottom)');
  }

  // back/chevron without rtl flip (AGENTS.md §3) — quick heuristic
  const lines2 = src.split('\n');
  lines2.forEach((line, i) => {
    if (DIRECTIONAL_ICON.test(line) && /className/.test(line) && /rotate-180/.test(line) === false && /rtl:/.test(line) === false && /flipForRTL|flip-rtl|isRTL/.test(line) === false && /(ChevronLeft|ChevronRight|ArrowLeft|ArrowRight)/.test(line)) {
      push(file, line, i + 1, 'unflipped-chevron', 'directional icon without rtl:rotate-180 or RTL helper');
    }
  });

  // viewport-fit check done separately for layout files
}

console.log(JSON.stringify({ scanned: files.length, issues: issues.length }, null, 0));
const byRule = {};
for (const it of issues) (byRule[it.rule] ||= []).push(it);
for (const [rule, list] of Object.entries(byRule)) {
  console.log(`\n## ${rule} (${list.length})`);
  for (const it of list.slice(0, 40)) console.log(`${it.file}:${it.line}  ${it.detail}`);
  if (list.length > 40) console.log(`... +${list.length - 40} more`);
}
