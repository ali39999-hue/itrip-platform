// Single source of truth for localization-debt measurement (I18N-103).
//
// WHY THIS MODULE EXISTS
// ----------------------
// Two scripts used to measure "inline localization" independently and disagreed
// (scripts/i18n-completeness-gate.mjs vs scripts/lt-coverage-scan.mjs), and the
// ratcheted metric was wrong: it counted *total* `lt(locale, {...})` call sites
// and FAILED when the count grew. That penalized exactly the correct repair —
// converting a hardcoded Persian literal into a fully localized 5-locale
// dictionary — and let the v1.8.3 release ship a quality report that claimed
// `i18n: PASS` while the gate was actually red on HEAD.
//
// Debt is therefore defined precisely, and both consumers use this module:
//   1. unlocalizedFaLiterals — Persian string literals that live OUTSIDE any
//      `lt(...)` dictionary (real untranslated UI text),
//   2. incompleteLtCalls     — `lt(...)` dictionaries that are MISSING one or
//      more of the five locales (partially localized).
//
// `inlineLtSites` is reported for visibility only and is not a debt signal:
// a 5/5-complete inline dictionary is localized, not debt.
export const LOCALES = ['fa', 'en', 'ar', 'zh', 'ru'];

const PERSIAN_CHAR = '\\u0600-\\u06FF';

/** Matches `lt(<identifier>, { ... })` and returns the brace body. */
function iterateLtCalls(src, onCall) {
  let idx = 0;
  while ((idx = src.indexOf('lt(', idx)) !== -1) {
    const head = src.slice(idx, idx + 24);
    if (!/^lt\(\s*[a-zA-Z_.]+\s*,\s*\{/.test(head)) {
      idx += 3;
      continue;
    }
    const braceStart = src.indexOf('{', idx);
    let depth = 0;
    let end = braceStart;
    for (; end < src.length; end++) {
      if (src[end] === '{') depth++;
      else if (src[end] === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    const body = src.slice(braceStart, end + 1);
    onCall(body, src.slice(0, idx).split('\n').length);
    idx = end;
  }
}

/** Removes every `lt(...)` dictionary so only OUTSIDE literals remain. */
function stripLtDictionaries(src) {
  let out = '';
  let cursor = 0;
  iterateLtCalls(src, (body) => {
    const start = src.indexOf(body, cursor);
    if (start < 0) return;
    out += src.slice(cursor, start);
    cursor = start + body.length;
  });
  out += src.slice(cursor);
  return out;
}

function countFaLiterals(src) {
  const re = new RegExp(`(['"\`])(?=[^'"\`]*[${PERSIAN_CHAR}])[^'"\`]{2,}?\\1`, 'g');
  return (src.match(re) || []).length;
}

export function measureI18nDebt(files) {
  let ltCalls = 0;
  let completeLtCalls = 0;
  let incompleteLtCalls = 0;
  let unlocalizedFaLiterals = 0;
  const incompleteSamples = [];

  for (const file of files) {
    const src = file.content;

    iterateLtCalls(src, (body, lineNo) => {
      // Spread-built objects source their strings from CMS data, not literals.
      if (/\.\.\.\s*\(/.test(body)) return;
      ltCalls++;
      const present = LOCALES.filter((l) => new RegExp(`\\b${l}\\s*:`, 'm').test(body));
      if (present.length === LOCALES.length) {
        completeLtCalls++;
      } else {
        incompleteLtCalls++;
        if (incompleteSamples.length < 40) {
          const missing = LOCALES.filter((l) => !present.includes(l)).join(', ');
          incompleteSamples.push(`${file.relPath}:${lineNo}: missing ${missing || '(computed/spread)'}`);
        }
      }
    });

    unlocalizedFaLiterals += countFaLiterals(stripLtDictionaries(src));
  }

  return {
    files: files.length,
    ltCalls,
    completeLtCalls,
    incompleteLtCalls,
    incompleteSamples,
    unlocalizedFaLiterals,
  };
}