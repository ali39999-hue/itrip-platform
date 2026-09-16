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
// ---------------------------------------------------------------------------
const SRC_DIR = path.join(ROOT, 'src');
const BASE_FILE = path.join(ROOT, 'docs', 'baseline', 'i18n-metrics.json');
const UPDATE_BASELINE = process.argv.includes('--update-baseline');

function walkSource(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (!['node_modules', '.next', '__tests__'].includes(name)) walkSource(p, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\./.test(name)) {
      out.push(p);
    }
  }
  return out;
}

/** Inline localized objects: `lt(locale, { fa: …, en: … })`. */
const INLINE_LT_RE = /lt\(\s*(?:locale|Locale)\s*,\s*\{/g;
/** Raw Persian string literals living outside the message catalog. */
const HARDCODED_FA_RE = /(['"`])(?=[^'"`]*[\u0600-\u06FF])[^'"`]{2,}?\1/g;

export function measureLocalizationDebt() {
  const files = walkSource(SRC_DIR);
  let inlineSites = 0;
  let filesWithInline = 0;
  let hardcodedFaStrings = 0;

  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    const inline = src.match(INLINE_LT_RE)?.length || 0;
    if (inline > 0) {
      inlineSites += inline;
      filesWithInline += 1;
    }
    hardcodedFaStrings += src.match(HARDCODED_FA_RE)?.length || 0;
  }

  return { scannedFiles: files.length, inlineSites, filesWithInline, hardcodedFaStrings };
}

function printAndCheckDebt(report) {
  const debt = measureLocalizationDebt();
  console.log('\n--- Localization honesty metrics (I18N-103) ---');
  console.log(`inline lt() call sites : ${debt.inlineSites} across ${debt.filesWithInline} of ${debt.scannedFiles} source files`);
  console.log(`hardcoded FA literals  : ${debt.hardcodedFaStrings}`);
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

  const delta = debt.inlineSites - baseline.inlineSites;
  console.log(`baseline inline sites  : ${baseline.inlineSites} (${baseline.updatedAt})`);
  console.log(`delta                  : ${delta >= 0 ? '+' : ''}${delta}`);
  if (delta > 0) {
    console.error(
      `\n[gate:i18n] FAILED — inline localization grew by ${delta} call site(s). ` +
        'Move the copy into messages/*.json (all 5 locales), or re-baseline intentionally with --update-baseline.',
    );
  }
  return { debt, regressed: delta > 0 };
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
