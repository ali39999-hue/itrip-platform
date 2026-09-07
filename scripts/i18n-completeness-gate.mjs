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

    if (report.hasErrors) {
      console.error('\nI18N Completeness Gate FAILED with errors:');
      report.errors.forEach((err) => console.error('  ' + err));
      process.exit(1);
    } else {
      console.log('\n✓ I18N Completeness Gate PASSED: 100% parity across all 5 locales (fa, en, ar, zh, ru).');
      process.exit(0);
    }
  } catch (err) {
    console.error('\nCRITICAL ERROR in I18N Completeness Gate:', err.message);
    process.exit(1);
  }
}
