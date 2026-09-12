import { readFileSync } from 'fs';
import { resolve } from 'path';

const raw = readFileSync(resolve('../api_hunt/portal_bundles/search_result_data_sample.txt'), 'utf8');
const data = JSON.parse(raw);

const item = data.PricedItineraries[0];
console.log('TotalFare:', item.TotalFare);
console.log('Currency:', item.Currency);
console.log('FlightSegments:', JSON.stringify(item.FlightSegments, null, 2));
console.log('DataAttribute sample:', JSON.stringify(item.DataAttribute, null, 2));
