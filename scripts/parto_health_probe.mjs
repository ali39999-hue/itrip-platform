// Read-only/live health probe for the Parto pipeline (parallel-session safe).
// 1) session state file exists?  2) DB cache has live rows?  3) search API serves live rows?
// Does NOT refresh/upsert anything by default (PASSIVE=1 default here would skip).
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const stateFile = resolve('.parto-portal-state.json');
console.log('[1] Session state file:', existsSync(stateFile) ? 'PRESENT' : 'MISSING');
if (existsSync(stateFile)) {
  const state = JSON.parse(readFileSync(stateFile, 'utf8'));
  const partoCookies = (state.cookies || []).filter((c) => (c.domain || '').includes('partocrs'));
  console.log(`    ${partoCookies.length} partocrs.ir cookies captured`);
}

// 2) DB cache read (read-only)
process.env.FLIGHT_REFRESH_SOURCE = 'portal';
const { prisma } = await import('../src/lib/prisma').catch(() => ({ prisma: null }));
if (!prisma) {
  console.log('[2] prisma import failed (tsx cwd) — using @prisma/client directly');
}
const { PrismaClient } = await import('@prisma/client');
const db = prisma ?? new PrismaClient();

const total = await db.flightOfferCache.count();
const fresh = await db.flightOfferCache.count({ where: { expiresAt: { gt: new Date() } } });
const bySupplier = await db.flightOfferCache.groupBy({ by: ['supplierCode'], _count: { _all: true } });
console.log('[2] FlightOfferCache: total =', total, '| fresh =', fresh);
console.log('    by supplier:', bySupplier.map((g) => `${g.supplierCode}=${g._count._all}`).join(', '));
const routes = await db.flightOfferCache.groupBy({
  by: ['routeKey', 'departureDate'],
  _count: { _all: true },
  _max: { fetchedAt: true },
});
for (const r of routes.slice(0, 8)) {
  console.log(`    ${r.routeKey} @ ${r.departureDate.toISOString().slice(0, 10)} — ${r._count._all} rows, fetched ${r._max.fetchedAt?.toISOString()}`);
}
const demand = await db.flightRouteDemand.count();
console.log('    FlightRouteDemand rows:', demand);

await db.$disconnect();
console.log('[3] Search API check → do a GET to the running dev server (separate curl).');
