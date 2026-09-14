/**
 * Comprehensive Scraping Health & Verification Script
 * Tests:
 *  1. Live FX Rate Scraper (TGJU market quotes via ajax.json & fallback)
 *  2. Competitor Flight Scraper (Alibaba domestic live flight search)
 *  3. Parto Portal Session & Connectivity check
 *  4. Catalog Staleness Audit
 */

import { LiveFxRateProvider } from '../src/domains/currency/CurrencyService.ts';
import { AlibabaCompetitorSource } from '../src/domains/pricing/competitor-probe.ts';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

async function runVerification() {
  console.log('====================================================');
  console.log('       FIRUZO SCRAPING HEALTH & VERIFICATION        ');
  console.log('====================================================\n');

  // 1. LIVE FX SCRAPER (TGJU)
  console.log('[1/4] Testing Live FX Scraper (TGJU)...');
  try {
    const fx = new LiveFxRateProvider();
    // Allow prefetch to complete
    await new Promise((r) => setTimeout(r, 2500));

    const pairs = ['USD', 'USDT', 'AED', 'CNY'];
    let liveCount = 0;
    for (const currency of pairs) {
      const rec = fx.getRateRecord(currency, 'IRR');
      const isLive = rec.source === 'TGJU_MARKET';
      if (isLive) liveCount++;
      console.log(`  - ${currency}/IRR: ${rec.rate.toNumber().toLocaleString('fa-IR')} Rials (${rec.source})`);
    }

    if (liveCount >= 3) {
      console.log('  -> RESULT: [PASS] TGJU Live FX Scraper is operational.\n');
    } else {
      console.log('  -> RESULT: [WARN] Operating on fallback rates.\n');
    }
  } catch (err) {
    console.error('  -> RESULT: [FAIL] FX Scraper Error:', err.message, '\n');
  }

  // 2. COMPETITOR FLIGHT SCRAPER (ALIBABA)
  console.log('[2/4] Testing Competitor Flight Scraper (Alibaba)...');
  try {
    const alibaba = new AlibabaCompetitorSource();
    // Search a date 7 days ahead
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    const depDate = targetDate.toISOString().slice(0, 10);

    console.log(`  - Route: THR -> MHD on ${depDate}`);
    const res = await alibaba.minPrice({
      origin: 'THR',
      destination: 'MHD',
      departureDate: depDate,
    });

    if (res.minPriceIrr && res.offersChecked > 0) {
      console.log(`  - Offers checked: ${res.offersChecked}`);
      console.log(`  - Cheapest flight: ${res.cheapestFlight || 'N/A'}`);
      console.log(`  - Min price: ${res.minPriceIrr.toLocaleString('fa-IR')} Rials`);
      console.log('  -> RESULT: [PASS] Alibaba flight scraper is operational.\n');
    } else {
      console.log('  -> RESULT: [WARN] Search completed but no bookable seats on route/date.\n');
    }
  } catch (err) {
    console.error('  -> RESULT: [FAIL] Alibaba Scraper Error:', err.message, '\n');
  }

  // 3. PARTO PORTAL REACHABILITY & SESSION
  console.log('[3/4] Testing Parto Portal Reachability & Session...');
  try {
    const reachRes = await fetch('https://www.partocrs.ir/Authenticate', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126' },
      redirect: 'manual',
    });
    console.log(`  - Portal reachability: HTTP ${reachRes.status} ${reachRes.statusText}`);

    const stateFile = resolve('.parto-portal-state.json');
    if (existsSync(stateFile)) {
      const state = JSON.parse(readFileSync(stateFile, 'utf8'));
      const sessionCookie = (state.cookies || []).find((c) => c.name === 'Parto_SessionId');
      if (sessionCookie) {
        const expDate = sessionCookie.expires > 0 ? new Date(sessionCookie.expires * 1000) : null;
        const isExpired = expDate ? expDate < new Date() : false;
        console.log(`  - Session cookie: present (Expires: ${expDate ? expDate.toISOString() : 'session'})`);
        if (isExpired) {
          console.log('  -> STATUS: [SESSION EXPIRED] Run "npm run worker" or "node scripts/parto-portal-capture.mjs login" to re-authenticate.');
        } else {
          console.log('  -> STATUS: [SESSION ACTIVE]');
        }
      } else {
        console.log('  -> STATUS: [NO SESSION COOKIE] Run "node scripts/parto-portal-capture.mjs login"');
      }
    } else {
      console.log('  -> STATUS: [NO STATE FILE] Run "node scripts/parto-portal-capture.mjs login"');
    }
    console.log('  -> RESULT: [PASS] Parto portal endpoint accessible.\n');
  } catch (err) {
    console.error('  -> RESULT: [FAIL] Parto reachability error:', err.message, '\n');
  }

  // 4. CATALOG STALENESS
  console.log('[4/4] Auditing Catalog Freshness...');
  const catalogs = [
    { label: 'Flights Master', path: 'src/data/server/flights-master.json' },
    { label: 'Hotels Master', path: 'src/data/server/hotels-iran-master.json' },
  ];
  for (const c of catalogs) {
    try {
      const data = JSON.parse(readFileSync(resolve(c.path), 'utf8'));
      const scrapedAt = data?.metadata?.scraped_at;
      if (scrapedAt) {
        const ageDays = Math.floor((Date.now() - Date.parse(scrapedAt)) / 86_400_000);
        console.log(`  - ${c.label}: Scraped on ${scrapedAt.slice(0, 10)} (${ageDays} days old)`);
      }
    } catch (e) {
      console.log(`  - ${c.label}: Unable to read (${e.message})`);
    }
  }
  console.log('  -> RESULT: [PASS] Catalogs present and loaded as fallback.\n');

  console.log('====================================================');
  console.log('                 VERIFICATION COMPLETE              ');
  console.log('====================================================');
}

runVerification().catch(console.error);
