import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(path.resolve(here, '..', '.env'), 'utf8');
const readEnv = (k) =>
  envText.split('\n').find((l) => l.startsWith(k + '='))?.slice(k.length + 1).trim().replace(/^"|"$/g, '');

const secret = process.env.ECARDO_TRAVEL_ORIGIN_SECRET || readEnv('ECARDO_TRAVEL_ORIGIN_SECRET');

const offerId = 'master_json:hotel:129';
const resp = await fetch(`https://trip.ecardo.ir/api/v1/travel/services/hotel/offers/${encodeURIComponent(offerId)}?locale=fa`, {
  headers: {
    'User-Agent': 'FiruzoTravel/1.0',
    Accept: 'application/json',
    'X-Travel-Origin-Secret': secret,
  },
  signal: AbortSignal.timeout(10000),
});

console.log('HTTP', resp.status);
const json = await resp.json();
console.log('Offer:', JSON.stringify(json, null, 2).slice(0, 1200));
