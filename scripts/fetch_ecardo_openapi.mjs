// Fetch eCardo Travel OpenAPI specification using credentials from environment.
// Strictly conforms to SSRF guidelines: fixed https allowlist, no credentials hardcoded.
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(path.resolve(here, '..', '.env'), 'utf8');
const readEnv = (k) =>
  envText.split('\n').find((l) => l.startsWith(k + '='))?.slice(k.length + 1).trim().replace(/^"|"$/g, '');

const secret = process.env.ECARDO_TRAVEL_ORIGIN_SECRET || readEnv('ECARDO_TRAVEL_ORIGIN_SECRET');
if (!secret) {
  console.error('ECARDO_TRAVEL_ORIGIN_SECRET is missing from environment');
  process.exit(1);
}

const ALLOWED_HOSTS = new Set(['travel-origin.ecardo.ir', 'trip.ecardo.ir']);

async function safeFetch(targetUrl, headers = {}) {
  const parsed = new URL(targetUrl);
  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error(`SSRF blocked: Disallowed host or protocol: ${targetUrl}`);
  }
  return fetch(targetUrl, {
    method: 'GET',
    redirect: 'manual',
    headers: {
      'User-Agent': 'FiruzoTravel/1.0',
      'X-Travel-Origin-Secret': secret,
      ...headers,
    },
    signal: AbortSignal.timeout(30000),
  });
}

console.log('Fetching eCardo Travel OpenAPI YAML...');
try {
  const resp = await safeFetch('https://travel-origin.ecardo.ir/api/v1/travel/openapi.yaml');
  console.log(`HTTP ${resp.status} ${resp.statusText}`);
  if (!resp.ok) {
    const errBody = await resp.text();
    console.error(`Failed to fetch OpenAPI YAML: HTTP ${resp.status}: ${errBody.slice(0, 300)}`);
    process.exit(1);
  }

  const yamlContent = await resp.text();
  const outPath = path.resolve(here, '..', 'docs', 'specs', 'ecardo-travel-openapi.yaml');
  writeFileSync(outPath, yamlContent, 'utf8');
  console.log(`Saved OpenAPI spec to ${outPath} (${yamlContent.length} bytes, ${yamlContent.split('\n').length} lines)`);
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
