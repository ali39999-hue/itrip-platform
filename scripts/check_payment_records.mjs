// Inspect recent payment records in the dev database to see where user
// top-up / checkout attempts actually stopped.
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(here, '..', '.env');
const envText = readFileSync(envPath, 'utf8');
const dbUrl = envText
  .split('\n')
  .find((l) => l.startsWith('DATABASE_URL'))
  ?.slice('DATABASE_URL='.length)
  .trim()
  .replace(/^"|"$/g, '');

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

const intents = await prisma.paymentIntent.findMany({
  where: { createdAt: { gte: since } },
  orderBy: { createdAt: 'desc' },
  take: 15,
  select: { id: true, bookingId: true, amount: true, currency: true, status: true, createdAt: true },
});
console.log('=== PaymentIntents (24h) ===');
for (const i of intents) console.log(`${i.createdAt.toISOString()} | ${i.bookingId} | ${i.amount} ${i.currency} | ${i.status} | ${i.id}`);

const attempts = await prisma.paymentAttempt.findMany({
  where: { createdAt: { gte: since } },
  orderBy: { createdAt: 'desc' },
  take: 15,
  select: { id: true, gatewayName: true, method: true, status: true, gatewayRef: true, amount: true, currency: true, createdAt: true },
});
console.log('\n=== PaymentAttempts (24h) ===');
for (const a of attempts) console.log(`${a.createdAt.toISOString()} | ${a.gatewayName} | ${a.method} | ${a.status} | ref=${a.gatewayRef} | ${a.amount} ${a.currency}`);

const payments = await prisma.payment.findMany({
  where: { updatedAt: { gte: since } },
  orderBy: { updatedAt: 'desc' },
  take: 15,
  select: { id: true, bookingId: true, method: true, status: true, gatewayRef: true, amount: true, currency: true, updatedAt: true },
});
console.log('\n=== Payments (24h, by updatedAt) ===');
for (const p of payments) console.log(`${p.updatedAt.toISOString()} | ${p.bookingId} | ${p.method} | ${p.status} | ref=${p.gatewayRef} | ${p.amount} ${p.currency}`);

const hooks = await prisma.webhookEvent.findMany({
  where: { createdAt: { gte: since } },
  orderBy: { createdAt: 'desc' },
  take: 15,
  select: { gatewayName: true, eventId: true, eventType: true, status: true, rejectionReason: true, createdAt: true },
});
console.log('\n=== WebhookEvents (24h) — did any IPN arrive? ===');
if (hooks.length === 0) console.log('(none — no gateway IPN reached this server in 24h)');
for (const h of hooks) console.log(`${h.createdAt.toISOString()} | ${h.gatewayName} | ${h.eventId} | ${h.status} | ${h.rejectionReason || ''}`);

const gtx = await prisma.gatewayTransaction.findMany({
  where: { createdAt: { gte: since } },
  orderBy: { createdAt: 'desc' },
  take: 10,
  select: { gatewayName: true, gatewayRef: true, status: true, amount: true, currency: true, createdAt: true },
});
console.log('\n=== GatewayTransactions (24h) ===');
for (const g of gtx) console.log(`${g.createdAt.toISOString()} | ${g.gatewayName} | ref=${g.gatewayRef} | ${g.status} | ${g.amount} ${g.currency}`);

await prisma.$disconnect();
