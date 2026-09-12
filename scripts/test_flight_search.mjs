// Test flight search on both endpoints with proper criteria.
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(path.resolve(here, '..', '.env'), 'utf8');
const readEnv = (k) =>
  envText.split('\n').find((l) => l.startsWith(k + '='))?.slice(k.length + 1).trim().replace(/^"|"$/g, '');

const secret = process.env.ECARDO_TRAVEL_ORIGIN_SECRET || readEnv('ECARDO_TRAVEL_ORIGIN_SECRET');

async function test(url, method, body) {
  const resp = await fetch(url, {
    method,
    headers: {
      'User-Agent': 'FiruzoTravel/1.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Travel-Origin-Secret': secret,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const text = await resp.text();
  console.log(`[${method} ${url}] -> HTTP ${resp.status}`);
  console.log('  Preview:', text.slice(0, 300));
}

// 1. Normalized flight search with criteria
await test('https://trip.ecardo.ir/api/v1/travel/services/flight/search', 'POST', {
  criteria: { origin: 'THR', destination: 'MHD', departure_date: '2026-09-20' },
});

// 2. Direct flight search endpoint
await test('https://trip.ecardo.ir/api/v1/flight/search', 'POST', {
  origin: 'THR',
  destination: 'MHD',
  departure_date: '2026-09-20',
});

// 3. SIM products
await test('https://trip.ecardo.ir/api/v1/sim/products?country_code=IRN', 'GET');
