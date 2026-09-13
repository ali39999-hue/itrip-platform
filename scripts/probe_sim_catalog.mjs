import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(path.resolve(here, '..', '.env'), 'utf8');
const readEnv = (k) =>
  envText.split('\n').find((l) => l.startsWith(k + '='))?.slice(k.length + 1).trim().replace(/^"|"$/g, '');

const secret = process.env.ECARDO_TRAVEL_ORIGIN_SECRET || readEnv('ECARDO_TRAVEL_ORIGIN_SECRET');

async function get(pathStr) {
  const resp = await fetch(`https://trip.ecardo.ir/api${pathStr}`, {
    headers: {
      'User-Agent': 'FiruzoTravel/1.0',
      'Accept': 'application/json',
      'X-Travel-Origin-Secret': secret,
    },
    signal: AbortSignal.timeout(10000),
  });
  const json = await resp.json().catch(() => null);
  console.log(`[${pathStr}] -> HTTP ${resp.status}`);
  console.log('Result:', JSON.stringify(json, null, 2).slice(0, 1500));
}

await get('/v1/sim/countries');
await get('/v1/sim/products');
await get('/v1/sim/airports');
await get('/v1/sim/hotels');
