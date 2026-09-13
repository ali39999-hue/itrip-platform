import { readFileSync } from 'fs';
import { resolve } from 'path';

const s = readFileSync(resolve('../api_hunt/portal_bundles/Search.min.js'), 'utf8');
const idx = s.indexOf('DepartureDateTime');
console.log('Snippet around DepartureDateTime:');
console.log(s.slice(idx, idx + 1500));
