// Test calling eCardo Travel live API endpoints.
// Fixed https allowlist per project SSRF policy. Secret loaded from .env.
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(path.resolve(here, '..', '.env'), 'utf8');
const readEnv = (k) =>
  envText.split('\n').find((l) => l.startsWith(k + '='))?.slice(k.length + 1).trim().replace(/^"|"$/g, '');

const secret = process.env.ECARDO_TRAVEL_ORIGIN_SECRET || readEnv('ECARDO_TRAVEL_ORIGIN_SECRET');

const ALLOWED_HOSTS = new Set(['travel-origin.ecardo.ir', 'trip.ecardo.ir']);

async function testEndpoint(url, method = 'GET', body = null, extraHeaders = {}) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
    console.log(`[SKIP] Disallowed ${url}`);
    return null;
  }
  const started = Date.now();
  try {
    const resp = await fetch(url, {
      method,
      redirect: 'manual',
      headers: {
        'User-Agent': 'FiruzoTravel/1.0',
        'Accept': 'application/json',
        'X-Travel-Origin-Secret': secret,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...extraHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    const ms = Date.now() - started;
    const text = await resp.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    console.log(`[${method} ${url}] -> HTTP ${resp.status} (${ms}ms)`);
    if (json) {
      console.log('  Data preview:', JSON.stringify(json).slice(0, 300));
    } else {
      console.log('  Raw text:', text.slice(0, 200));
    }
    return { status: resp.status, json, text };
  } catch (err) {
    console.log(`[${method} ${url}] -> ERROR: ${err.message}`);
    return null;
  }
}

console.log('=== eCardo Travel Live API Testing ===\n');

// 1. Discovery Bootstrap on trip.ecardo.ir
await testEndpoint('https://trip.ecardo.ir/api/v1/travel/bootstrap?locale=fa');

// 1b. Discovery Bootstrap on travel-origin.ecardo.ir
await testEndpoint('https://travel-origin.ecardo.ir/api/v1/travel/bootstrap?locale=fa');

// 2. Flight search via normalized services endpoint
await testEndpoint('https://trip.ecardo.ir/api/v1/travel/services/flight/search', 'POST', {
  criteria: {},
});

// 3. Hotel search via normalized services endpoint
await testEndpoint('https://trip.ecardo.ir/api/v1/travel/services/hotel/search', 'POST', {
  criteria: { city: 'Tehran', check_in: '2026-09-15', check_out: '2026-09-17', adults: 1 },
});

// 4. eSIM countries
await testEndpoint('https://trip.ecardo.ir/api/v1/sim/countries');
