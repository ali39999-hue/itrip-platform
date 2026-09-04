import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('I18N Completeness Validation Suite (I18N-002)', () => {
  const messagesDir = path.resolve(__dirname, '../../../messages');
  const locales = ['fa', 'en', 'ar', 'zh', 'ru'];

  it('verifies that all 5 production locales exist and contain valid JSON', () => {
    for (const loc of locales) {
      const filePath = path.join(messagesDir, `${loc}.json`);
      expect(fs.existsSync(filePath), `Message file missing for locale ${loc}`).toBe(true);
      const raw = fs.readFileSync(filePath, 'utf-8');
      expect(() => JSON.parse(raw), `Invalid JSON in ${loc}.json`).not.toThrow();
    }
  });

  it('validates that top-level namespace keys exist across all 5 locales without regression', () => {
    const namespacesPerLocale: Record<string, string[]> = {};

    for (const loc of locales) {
      const filePath = path.join(messagesDir, `${loc}.json`);
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      namespacesPerLocale[loc] = Object.keys(parsed);
    }

    const baseline = namespacesPerLocale['fa'];
    expect(baseline.length).toBeGreaterThan(10);

    // Essential UI namespaces required for B2C and ERP
    const coreNamespaces = ['Nav', 'Common', 'Home', 'Flights', 'HotelsSearch', 'Footer', 'Logo', 'Auth', 'Admin'];
    for (const ns of coreNamespaces) {
      for (const loc of locales) {
        expect(
          namespacesPerLocale[loc].includes(ns),
          `Core namespace '${ns}' must be present in ${loc}.json`
        ).toBe(true);
      }
    }
  });
});
