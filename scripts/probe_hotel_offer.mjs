import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(path.resolve(here, '..', '.env'), 'utf8');
const readEnv = (k) =>
  envText.split('\n').find((l) => l.startsWith(k + '='))?.slice(k.length + 1).trim().replace(/^"|"$/g, '');

const secret = process.env.ECARDO_TRAVEL_ORIGIN_SECRET || readEnv('ECARDO_TRAVEL_ORIGIN_SECRET');

const resp = await fetch('https://trip.ecardo.ir/api/v1/travel/services/hotel/search', {
  method: 'POST',
  headers: {
    'User-Agent': 'FiruzoTravel/1.0',
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Travel-Origin-Secret': secret,
  },
  body: JSON.stringify({
    criteria: { city: 'Tehran', check_in: '2026-09-15', check_out: '2026-09-17', adults: 2 },
  }),
});

const json = await resp.json();
console.log('Total offers:', json.data?.offers?.length);
if (json.data?.offers?.[0]) {
  console.log('Offer 0:', JSON.stringify(json.data.offers[0], null, 2));
}
