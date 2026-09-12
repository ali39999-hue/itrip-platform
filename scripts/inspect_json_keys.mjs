import { readFileSync } from 'fs';
import { resolve } from 'path';

const raw = readFileSync(resolve('../api_hunt/portal_bundles/search_result_data_sample.txt'), 'utf8');
const data = JSON.parse(raw);

console.log('Top level keys:', Object.keys(data));
console.log('ViewData keys:', Object.keys(data.ViewData || {}));

if (data.PricedItineraries || data.ViewData?.PricedItineraries || data.Itineraries || data.Flights) {
  const list = data.PricedItineraries || data.ViewData?.PricedItineraries || data.Itineraries || data.Flights;
  console.log('Found flight list! Count:', list.length);
  console.log('First item sample:');
  console.log(JSON.stringify(list[0], null, 2).slice(0, 1000));
} else {
  for (const [k, v] of Object.entries(data)) {
    if (Array.isArray(v)) {
      console.log(`Array key: ${k} (len=${v.length})`);
      if (v.length > 0 && typeof v[0] === 'object') {
        console.log(`  First item keys of ${k}:`, Object.keys(v[0]));
      }
    }
  }
}
