import { readFileSync } from 'fs';
import { resolve } from 'path';

const raw = readFileSync(resolve('../api_hunt/portal_bundles/search_result_data_sample.txt'), 'utf8');
const data = JSON.parse(raw);

const item = data.PricedItineraries[0];
console.log('Keys of PricedItinerary:', Object.keys(item));
console.log('FareSourceCode:', item.FareSourceCode);
console.log('AirItineraryPricingInfo:', JSON.stringify(item.AirItineraryPricingInfo, null, 2));
console.log('OriginDestinationOptions segments count:', item.OriginDestinationOptions?.[0]?.FlightSegments?.length);
const seg = item.OriginDestinationOptions?.[0]?.FlightSegments?.[0];
console.log('First segment sample:', JSON.stringify(seg, null, 2));
