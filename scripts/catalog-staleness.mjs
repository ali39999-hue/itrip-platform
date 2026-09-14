#!/usr/bin/env node
/**
 * Catalog staleness check (SCRAPING-ROADMAP: reference-catalog refresh)
 *
 * The flight/hotel reference catalogs (src/data/server/*-master.json) are
 * point-in-time eghamat24.com scrapes. This script reports their age so the
 * team notices when serving data drifts too far from reality. Warn-only by
 * default (exit 0); pass --strict to exit 1 when any file is stale.
 *
 * Usage:
 *   node scripts/catalog-staleness.mjs            # report
 *   node scripts/catalog-staleness.mjs --strict   # report + non-zero exit
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const MAX_AGE_DAYS = Number(process.env.CATALOG_MAX_AGE_DAYS) || 30;
const strict = process.argv.includes('--strict');

const files = [
  { label: 'flights', path: 'src/data/server/flights-master.json', scrapedAtKey: 'metadata.scraped_at' },
  { label: 'hotels', path: 'src/data/server/hotels-iran-master.json', scrapedAtKey: 'metadata.scraped_at' },
];

function pick(obj, dotted) {
  return dotted.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

let anyStale = false;
for (const file of files) {
  try {
    const data = JSON.parse(readFileSync(resolve(file.path), 'utf8'));
    const scrapedAt = pick(data, file.scrapedAtKey);
    if (!scrapedAt) {
      console.log(`[catalog:${file.label}] ${file.path} — no ${file.scrapedAtKey} field`);
      anyStale = true;
      continue;
    }
    const ageDays = Math.floor((Date.now() - Date.parse(scrapedAt)) / 86_400_000);
    const stale = ageDays > MAX_AGE_DAYS;
    if (stale) anyStale = true;
    const extras = [];
    if (data?.metadata?.total_hotels !== undefined) extras.push(`hotels=${data.metadata.total_hotels}`);
    if (data?.routes !== undefined) extras.push(`routes=${data.routes.length}`);
    if (data?.airports !== undefined) extras.push(`airports=${data.airports.length}`);
    console.log(
      `[catalog:${file.label}] scraped ${scrapedAt.slice(0, 10)} → ${ageDays}d old ` +
        `(threshold ${MAX_AGE_DAYS}d) ${stale ? '⚠ STALE — re-scrape from an Iranian IP' : '✔ fresh'} ` +
        `${extras.join(', ')}`
    );
  } catch (err) {
    console.log(`[catalog:${file.label}] ${file.path} — unreadable: ${err.message}`);
    anyStale = true;
  }
}

console.log(
  '\nRefresh runbook: re-run the eghamat24 catalog extraction from an Iranian IP, keep the same schema,',
  'then update metadata.scraped_at. The JSONs are the static fallback behind the live Parto cache.'
);

process.exit(strict && anyStale ? 1 : 0);
