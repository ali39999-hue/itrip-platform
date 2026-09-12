// End-to-end pipe test: signed eCardo IPN → cloudflare tunnel → webhook route
// → wallet_topup capture branch → postTopUp ledger credit. Then full cleanup.
// Single fixed https host (the dev tunnel URL), no redirects.
import { readFileSync } from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const TUNNEL_HOST = 'worship-supplement-swaziland-markers.trycloudflare.com';

const here = path.dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(path.resolve(here, '..', '.env'), 'utf8');
const readEnv = (key) =>
  envText.split('\n').find((l) => l.startsWith(key + '='))?.slice(key.length + 1).trim().replace(/^"|"$/g, '');

const dbUrl = readEnv('DATABASE_URL');
const secret = readEnv('ECARDO_SECRET_KEY');
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

const suffix = `pipe_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
const userId = `usr_${suffix}`;
const bookingId = `wallet_topup_${userId}`;
const amount = 3; // USD (min top-up 1)
const eventId = `evt_${suffix}`;
const gatewayRef = `FZ${suffix.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 10)}`;

async function postIpn(payloadObj, expectStatus) {
  const resp = await fetch(`https://${TUNNEL_HOST}/api/payments/webhook?gateway=ecardo`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payloadObj),
    signal: AbortSignal.timeout(30000),
  });
  const text = await resp.text();
  console.log(`IPN POST → HTTP ${resp.status} (expected ${expectStatus}): ${text.slice(0, 200)}`);
  return resp.status;
}

try {
  // Step 0: reachability — invalid JSON must 400 without touching the DB.
  const reach = await fetch(`https://${TUNNEL_HOST}/api/payments/webhook?gateway=ecardo`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/json' },
    body: 'not-json',
    signal: AbortSignal.timeout(30000),
  });
  console.log(`Reachability: HTTP ${reach.status} (expected 400 for invalid JSON)`);
  if (reach.status !== 400) throw new Error('Tunnel or webhook route not reachable');

  // Step 1: fixture — user, top-up intent, gateway attempt (as processPayment leaves them)
  await prisma.user.create({ data: { id: userId, email: `pipe_${suffix}@firuzo.com`, name: 'IPN Pipe Tester' } });
  const intent = await prisma.paymentIntent.create({
    data: {
      bookingId,
      amount,
      currency: 'USD',
      status: 'INITIATED',
      idempotencyKey: `topup_${suffix}`,
      expiresAt: new Date(Date.now() + 20 * 60 * 1000),
    },
  });
  await prisma.paymentAttempt.create({
    data: {
      paymentIntentId: intent.id,
      gatewayName: 'ECARDO_GATEWAY',
      method: 'gateway_ecardo',
      amount,
      currency: 'USD',
      status: 'PENDING_CUSTOMER',
      gatewayRef,
    },
  });
  console.log(`Fixture ready: ${bookingId} | intent ${intent.id} | ref ${gatewayRef} | ${amount} USD`);

  // Step 2: signed IPN exactly like eCardo sends (HMAC over transaction_id + total_amount)
  const signature = crypto.createHmac('sha256', secret).update(`${gatewayRef}${amount}`).digest('hex');
  const status = await postIpn(
    { status: 'success', signature, data: { transaction_id: gatewayRef, total_amount: amount, currency: 'USD' } },
    200
  );
  if (status !== 200) throw new Error('Signed IPN was not accepted');

  // Step 3: verify capture side effects
  const balanceEntries = await prisma.ledgerEntry.findMany({
    where: { account: { ownerType: 'USER', ownerId: userId, currency: 'USD' } },
    select: { direction: true, amount: true },
  });
  const balance = balanceEntries.reduce(
    (acc, e) => acc + (e.direction === 'CREDIT' ? Number(e.amount) : -Number(e.amount)),
    0
  );
  const payment = await prisma.payment.findFirst({ where: { gatewayRef, status: 'SUCCESS' } });
  const intentAfter = await prisma.paymentIntent.findUnique({ where: { id: intent.id } });
  console.log(`Wallet ledger balance: ${balance} USD (expected ${amount})`);
  console.log(`Payment row: ${payment ? 'SUCCESS ✓' : 'MISSING ✗'} | Intent status: ${intentAfter.status}`);
  if (balance !== amount || !payment || intentAfter.status !== 'SUCCESS') throw new Error('Capture verification failed');

  console.log('\n✅ FULL PIPE VERIFIED: tunnel → webhook → HMAC verify → wallet capture → ledger credit');
} catch (err) {
  console.error(`PIPE TEST FAILED: ${err.message}`);
  process.exitCode = 1;
} finally {
  // Step 4: cleanup everything created by this test (ledger by groupId)
  try {
    await prisma.ledgerEntry.deleteMany({ where: { groupId: `wh_topup_grp_${eventId}` } });
    await prisma.ledgerEntry.deleteMany({ where: { account: { ownerType: 'USER', ownerId: userId } } });
    await prisma.account.deleteMany({ where: { ownerId: userId } });
    await prisma.webhookEvent.deleteMany({ where: { eventId } });
    await prisma.payment.deleteMany({ where: { bookingId } });
    await prisma.paymentAttempt.deleteMany({ where: { paymentIntent: { bookingId } } });
    await prisma.paymentIntent.deleteMany({ where: { bookingId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    console.log('Cleanup done.');
  } catch (e) {
    console.error(`Cleanup error: ${e.message}`);
  }
  await prisma.$disconnect();
}
