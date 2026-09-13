// Live single-route refresh probe: proves the Parto portal pipeline works RIGHT NOW.
// Impact: one portal search (~3 HTTP calls) + upserts into the isolated FlightOfferCache table only.
process.env.FLIGHT_REFRESH_SOURCE = 'portal';
process.env.FLIGHT_CACHE_TTL_MINUTES = '60';

import { refreshRouteOffers, getCachedOffers } from '../src/services/flight-cache-service';

const route = { routeKey: 'THR-MHD', originCode: 'THR', destinationCode: 'MHD' };
const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);

console.log(`[live] refreshing ${route.routeKey} @ ${tomorrow} via Parto portal…`);
const outcome = await refreshRouteOffers(route, tomorrow);
console.log('[live] outcome:', JSON.stringify(outcome));

if (outcome.error) {
  console.error('[live] REFRESH FAILED — error above indicates session expiry or portal issue.');
  process.exit(1);
}

const rows = await getCachedOffers(route.routeKey, tomorrow);
console.log(`[live] fresh cached rows: ${rows.length}`);
for (const r of rows.slice(0, 5)) {
  console.log(`  - ${r.flightNumber} (${r.airlineName}) | ${(Number(r.totalFare) / 10).toLocaleString()} Toman | seats=${r.seatsRemaining} | ${r.isCharter ? 'چارتر' : 'سیستمی'} | ${r.departureTime.toISOString().slice(11, 16)}→${r.arrivalTime.toISOString().slice(11, 16)}`);
}
process.exit(rows.length > 0 ? 0 : 1);
