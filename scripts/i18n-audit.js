/**
 * i18n audit: compares key sets across all locale files against `fa` (base),
 * detects untranslated values (identical to fa), and ICU placeholder mismatches.
 * Usage: node scripts/i18n-audit.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASE = 'fa';
const locales = ['fa', 'en', 'ar', 'zh', 'ru'];

const msgs = {};
for (const l of locales) {
  msgs[l] = JSON.parse(fs.readFileSync(path.join(ROOT, 'messages', l + '.json'), 'utf8'));
}

function keys(o, p = '') {
  let r = [];
  for (const k of Object.keys(o)) {
    const v = o[k];
    const keyPath = p ? p + '.' + k : k;
    if (typeof v === 'object' && v !== null) r = r.concat(keys(v, keyPath));
    else r.push(keyPath);
  }
  return r;
}

function placeholders(v) {
  const s = String(v);
  // ICU {var, plural, ...} / {var, select, ...}: only the leading argument name counts;
  // nested {# ...} branches are plural internals, not placeholders.
  const names = new Set();
  for (const m of s.matchAll(/\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}/g)) names.add(m[1]);
  for (const m of s.matchAll(/\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*(?:plural|select|selectordinal)\b/g)) names.add(m[1]);
  return [...names].sort().join(',');
}

const baseKeys = keys(msgs[BASE]);
const baseSet = new Set(baseKeys);
console.log(`base (${BASE}) keys: ${baseKeys.length}`);

let problems = 0;
for (const l of locales.filter((x) => x !== BASE)) {
  const kl = keys(msgs[l]);
  const set = new Set(kl);
  const missing = baseKeys.filter((k) => !set.has(k));
  const extra = kl.filter((k) => !baseSet.has(k));
  console.log(`\n=== ${l}: ${kl.length} keys | missing ${missing.length} | extra ${extra.length}`);
  if (missing.length) {
    problems += missing.length;
    console.log('  MISSING: ' + missing.join(', '));
  }
  if (extra.length) {
    problems += extra.length;
    console.log('  EXTRA: ' + extra.join(', '));
  }
  // placeholder mismatch (ICU)
  const phIssues = [];
  for (const k of baseKeys) {
    if (!set.has(k)) continue;
    const a = placeholders(getPath(msgs[BASE], k));
    const b = placeholders(getPath(msgs[l], k));
    if (a !== b) phIssues.push(`${k} [${a}] vs [${b}]`);
  }
  if (phIssues.length) {
    problems += phIssues.length;
    console.log('  PLACEHOLDER MISMATCH:');
    phIssues.forEach((x) => console.log('    ' + x));
  }
  // untranslated: identical string to fa for non-trivial values (skip proper nouns/numbers)
  const same = [];
  for (const k of baseKeys) {
    if (!set.has(k)) continue;
    const fa = getPath(msgs[BASE], k);
    const t = getPath(msgs[l], k);
    if (typeof fa === 'string' && typeof t === 'string' && fa === t && /[\u0600-\u06FF]/.test(fa)) {
      same.push(k + ' => "' + fa.slice(0, 40) + '"');
    }
  }
  if (same.length) {
    console.log('  UNTRANSLATED (fa text kept as-is): ' + same.length);
    same.slice(0, 30).forEach((x) => console.log('    ' + x));
    if (same.length > 30) console.log('    ... +' + (same.length - 30));
  }
}

function getPath(o, p) {
  return p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
}

console.log(`\n${problems === 0 ? 'OK: structure consistent' : 'PROBLEMS: ' + problems}`);
