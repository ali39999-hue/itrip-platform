#!/usr/bin/env node
/**
 * I18N-102: Locale Completeness CI Gate Script.
 * Verifies 100% key parity and placeholder consistency across fa, en, ar, zh, ru.
 *
 * Usage: node scripts/i18n-completeness-gate.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const MESSAGES_DIR = path.join(ROOT, 'messages');

export const LOCALES = ['fa', 'en', 'ar', 'zh', 'ru'];
export const BASE_LOCALE = 'fa';

export function flattenKeys(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenKeys(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

export const ALLOWED_EMPTY_KEYS = new Set(['Hero.titleC']);

export function extractPlaceholders(str) {
  if (typeof str !== 'string') return [];
  // Support both simple placeholders {name} and ICU plural/select arguments {count, plural, ...}
  const matches = Array.from(str.matchAll(/\{([a-zA-Z0-9_]+)/g), (m) => m[1]);
  return Array.from(new Set(matches)).sort();
}

export function auditLocaleCompleteness(messagesDir = MESSAGES_DIR) {
  const translations = {};
  const flattened = {};
  const allKeys = new Set();

  for (const locale of LOCALES) {
    const filePath = path.join(messagesDir, `${locale}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`CRITICAL: Message file missing for locale '${locale}': ${filePath}`);
    }
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    translations[locale] = content;
    flattened[locale] = flattenKeys(content);
    Object.keys(flattened[locale]).forEach((k) => allKeys.add(k));
  }

  const report = {
    totalDistinctKeys: allKeys.size,
    locales: {},
    hasErrors: false,
    errors: [],
  };

  for (const locale of LOCALES) {
    const keys = flattened[locale];
    const missingKeys = [];
    const emptyKeys = [];
    const placeholderMismatches = [];

    for (const key of allKeys) {
      if (!(key in keys)) {
        missingKeys.push(key);
      } else if (typeof keys[key] === 'string' && keys[key].trim() === '' && !ALLOWED_EMPTY_KEYS.has(key)) {
        emptyKeys.push(key);
      } else if (typeof keys[key] === 'string' && locale !== BASE_LOCALE) {
        // Verify placeholder parity with base locale
        const baseVal = flattened[BASE_LOCALE]?.[key];
        if (typeof baseVal === 'string') {
          const basePlaceholders = extractPlaceholders(baseVal);
          const curPlaceholders = extractPlaceholders(keys[key]);
          if (basePlaceholders.join(',') !== curPlaceholders.join(',')) {
            placeholderMismatches.push({
              key,
              basePlaceholders,
              curPlaceholders,
            });
          }
        }
      }
    }

    report.locales[locale] = {
      keyCount: Object.keys(keys).length,
      missingCount: missingKeys.length,
      emptyCount: emptyKeys.length,
      placeholderMismatchCount: placeholderMismatches.length,
      missingKeys,
      emptyKeys,
      placeholderMismatches,
    };

    if (missingKeys.length > 0) {
      report.hasErrors = true;
      report.errors.push(`[${locale}] Missing ${missingKeys.length} keys: ${missingKeys.slice(0, 5).join(', ')}${missingKeys.length > 5 ? '...' : ''}`);
    }
    if (emptyKeys.length > 0) {
      report.hasErrors = true;
      report.errors.push(`[${locale}] Empty value for ${emptyKeys.length} keys: ${emptyKeys.slice(0, 5).join(', ')}`);
    }
    if (placeholderMismatches.length > 0) {
      report.hasErrors = true;
      report.errors.push(`[${locale}] Placeholder mismatch in ${placeholderMismatches.length} keys: ${placeholderMismatches.map((m) => m.key).slice(0, 3).join(', ')}`);
    }
  }

  return report;
}

// ---------------------------------------------------------------------------
// I18N-103: honest localization metrics.
//
// Key parity (above) proves the CATALOG is complete — it proves nothing about
// whether the UI actually reads from it. This repo has far more inline
// `lt(locale, {...})` sites than catalog keys, so "100% i18n" was an overclaim.
// These metrics are baselined and the gate FAILS when inline localization grows,
// so the debt can only go down deliberately.
//
// I18N-104 (defect fixed): the previous ratchet counted *total* inline
// `lt(locale, {...})` call sites and FAILED when the count grew. That penalized
// the correct repair — converting a hardcoded Persian literal into a fully
// localized 5-locale dictionary — and let this gate report PASS while it was
// actually red on the v1.8.3 release commit. Debt is now measured by the shared
// scanner (scripts/lib/i18n-debt.mjs) as:
//   1. unlocalizedFaLiterals — Persian literals living OUTSIDE any lt() dictionary,
//   2. incompleteLtCalls     — lt() dictionaries missing one or more locales.
// `inlineSites` is reported for visibility only; a 5/5-complete dictionary is
// localized, not debt.
// ---------------------------------------------------------------------------
import { measureI18nDebt } from './lib/i18n-debt.mjs';

const SRC_DIR = path.join(ROOT, 'src');
const BASE_FILE = path.join(ROOT, 'docs', 'baseline', 'i18n-metrics.json');
const UPDATE_BASELINE = process.argv.includes('--update-baseline');

function walkSource(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (!['node_modules', '.next', 'graphify-out', '__tests__'].includes(name)) walkSource(p, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\./.test(name)) {
      out.push({
        relPath: path.relative(ROOT, p).replace(/\\/g, '/'),
        content: fs.readFileSync(p, 'utf8'),
      });
    }
  }
  return out;
}

export function measureLocalizationDebt() {
  const debt = measureI18nDebt(walkSource(SRC_DIR));
  return {
    scannedFiles: debt.files,
    inlineSites: debt.ltCalls,
    hardcodedFaStrings: debt.unlocalizedFaLiterals,
    completeLtCalls: debt.completeLtCalls,
    incompleteLtCalls: debt.incompleteLtCalls,
    incompleteSamples: debt.incompleteSamples,
  };
}

function printAndCheckDebt(report) {
  const debt = measureLocalizationDebt();
  console.log('\n--- Localization honesty metrics (I18N-103 / I18N-104) ---');
  console.log(`inline lt() call sites : ${debt.inlineSites} of which ${debt.completeLtCalls} are complete (5/5 locales)`);
  console.log(`unlocalized FA literals (outside lt()): ${debt.hardcodedFaStrings}`);
  console.log(`incomplete lt() calls  : ${debt.incompleteLtCalls}`);
  console.log('NOTE: catalog key parity above does NOT mean the UI is fully localized.');

  let baseline = null;
  try {
    baseline = JSON.parse(fs.readFileSync(BASE_FILE, 'utf8'));
  } catch {
    baseline = null;
  }

  if (!baseline || UPDATE_BASELINE) {
    fs.mkdirSync(path.dirname(BASE_FILE), { recursive: true });
    fs.writeFileSync(
      BASE_FILE,
      JSON.stringify(
        {
          updatedAt: new Date().toISOString(),
          reason: baseline ? 'intentional re-baseline (--update-baseline)' : 'baseline established by the gate',
          canonicalKeys: report.totalDistinctKeys,
          ...debt,
        },
        null,
        2,
      ),
    );
    console.log(`baseline ${baseline ? 'updated' : 'created'}: ${path.relative(ROOT, BASE_FILE)}`);
    return { debt, regressed: false };
  }

  const debtRegressions = collectDebtRegressions(debt, baseline);
  if (debtRegressions.some((r) => r.startsWith('incomplete lt()'))) {
    console.error(
      `\n[gate:i18n] FAILED — incomplete lt() dictionaries grew. Add the missing locale keys (fa, en, ar, zh, ru).`
    );
  }
  if (debtRegressions.some((r) => r.startsWith('unlocalized FA'))) {
    console.error(
      `\n[gate:i18n] FAILED — unlocalized FA literals grew. Wrap the copy in lt() with all 5 locales or move it into messages/*.json.`
    );
  }
  const unlocalizedDelta = debt.hardcodedFaStrings - (baseline.unlocalizedFaLiterals ?? 0);
  const incompleteDelta = debt.incompleteLtCalls - (baseline.incompleteLtCalls ?? 0);
  console.log(`baseline unlocalized FA : ${baseline.unlocalizedFaLiterals ?? 'n/a'} (${baseline.updatedAt})`);
  console.log(`delta unlocalized FA    : ${unlocalizedDelta >= 0 ? '+' : ''}${unlocalizedDelta}`);
  console.log(`baseline incomplete lt(): ${baseline.incompleteLtCalls ?? 'n/a'}`);
  console.log(`delta incomplete lt()   : ${incompleteDelta >= 0 ? '+' : ''}${incompleteDelta}`);

  const regressed = debtRegressions.length > 0;
  if (regressed) {
    console.error(
      `\n[gate:i18n] FAILED — localization debt grew (${debtRegressions.join('; ')}). ` +
        'Localize the copy (all 5 locales) instead of hardcoding it.'
    );
  }
  return { debt, regressed };
}

function collectDebtRegressions(debt, baseline) {
  const regressions = [];
  if (debt.incompleteLtCalls > (baseline.incompleteLtCalls ?? Number.MAX_SAFE_INTEGER)) {
    regressions.push(`incomplete lt() calls ${debt.incompleteLtCalls} > ${baseline.incompleteLtCalls}`);
  }
  if (debt.hardcodedFaStrings > (baseline.unlocalizedFaLiterals ?? Number.MAX_SAFE_INTEGER)) {
    regressions.push(`unlocalized FA literals ${debt.hardcodedFaStrings} > ${baseline.unlocalizedFaLiterals}`);
  }
  return regressions;
}

// Direct CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('====================================================');
  console.log(' iTRIP I18N Completeness CI Gate (I18N-102)');
  console.log('====================================================');

  try {
    const report = auditLocaleCompleteness();

    console.log(`Total canonical translation keys: ${report.totalDistinctKeys}`);
    for (const locale of LOCALES) {
      const info = report.locales[locale];
      const status = info.missingCount === 0 && info.emptyCount === 0 && info.placeholderMismatchCount === 0 ? '✓ PASS' : '✗ FAIL';
      console.log(` - [${locale}]: ${info.keyCount} keys | Missing: ${info.missingCount} | Empty: ${info.emptyCount} | ${status}`);
    }

    const debtResult = report.hasErrors ? { regressed: false } : printAndCheckDebt(report);

    if (report.hasErrors) {
      console.error('\nI18N Completeness Gate FAILED with errors:');
      report.errors.forEach((err) => console.error('  ' + err));
      process.exit(1);
    }
    if (debtResult.regressed) process.exit(1);

    console.log('\n✓ I18N key parity PASSED: 100% parity across all 5 locales (fa, en, ar, zh, ru).');
    console.log('  Scope: catalog parity + no new inline-localization debt — see the metrics above.');
    process.exit(0);
  } catch (err) {
    console.error('\nCRITICAL ERROR in I18N Completeness Gate:', err.message);
    process.exit(1);
  }
}
