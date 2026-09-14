import { describe, it, expect, afterAll } from 'vitest';
import { signTopUpCallback, verifyTopUpCallback } from './callback-security';
import { handlePaymentCallback } from './payment-callback-handler';
import { GeneralLedgerService } from '../ledger/GeneralLedgerService';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

describe('Callback Security & Authoritative Top-Up Capture Suite', () => {
  const suffix = `cbsec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const userId = `usr_${suffix}`;
  const topupId = `topup_intent_${suffix}`;
  const amount = 5_000_000;
  const currency = 'IRR';
  const gatewayRef = `FZ${suffix.toUpperCase().slice(0, 8)}`;
  let paymentId = '';

  afterAll(async () => {
    try {
      await prisma.ledgerEntry.deleteMany({ where: { groupId: { contains: suffix } } });
      await prisma.ledgerEntry.deleteMany({ where: { groupId: { contains: paymentId } } });
      await prisma.account.deleteMany({ where: { ownerId: userId } });
      await prisma.payment.deleteMany({ where: { bookingId: `wallet_topup_${userId}` } });
      await prisma.paymentIntent.deleteMany({ where: { bookingId: `wallet_topup_${userId}` } });
      await prisma.user.deleteMany({ where: { id: userId } });
    } catch (e) {
      console.error('Callback security test cleanup error:', e);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('signTopUpCallback and verifyTopUpCallback produce and validate cryptographic signatures', () => {
    const sig = signTopUpCallback(userId, topupId, amount, currency);
    expect(sig).toBeDefined();
    expect(typeof sig).toBe('string');
    expect(sig.length).toBe(64); // SHA-256 hex length

    // Valid signature matches
    expect(verifyTopUpCallback(sig, userId, topupId, amount, currency)).toBe(true);

    // Tampered amount fails
    expect(verifyTopUpCallback(sig, userId, topupId, 10_000_000, currency)).toBe(false);

    // Tampered userId fails
    expect(verifyTopUpCallback(sig, 'other_user', topupId, amount, currency)).toBe(false);

    // Tampered topupId fails
    expect(verifyTopUpCallback(sig, userId, 'different_intent', amount, currency)).toBe(false);

    // Tampered currency fails
    expect(verifyTopUpCallback(sig, userId, topupId, amount, 'USD')).toBe(false);
  });

  it('handlePaymentCallback with valid signature authoritatively captures wallet top-up to ledger', async () => {
    // 1. Create user
    await prisma.user.create({
      data: {
        id: userId,
        email: `${suffix}@firuzo.com`,
        name: 'Callback Security Tester',
      },
    });

    // 2. Create PaymentIntent and Payment in PENDING state
    const intent = await prisma.paymentIntent.create({
      data: {
        bookingId: `wallet_topup_${userId}`,
        amount,
        currency,
        status: 'INITIATED',
        idempotencyKey: `intent_${topupId}`,
        expiresAt: new Date(Date.now() + 20 * 60 * 1000),
      },
    });

    const payment = await prisma.payment.create({
      data: {
        bookingId: `wallet_topup_${userId}`,
        paymentIntentId: intent.id,
        idempotencyKey: topupId,
        method: 'gateway_ecardo',
        gatewayRef,
        amount,
        currency,
        status: 'PENDING',
      },
    });
    paymentId = payment.id;

    // 3. Generate valid callback signature
    const validSig = signTopUpCallback(userId, topupId, amount, currency);

    // 4. Simulate eCardo browser return
    const callbackUrl = `http://localhost:3000/api/payments/callback?bookingId=wallet_topup_${userId}&order_id=wallet_topup_${userId}&topupId=${topupId}&sig=${validSig}&status=success&ref=${gatewayRef}`;
    const req = new NextRequest(callbackUrl);

    const response = await handlePaymentCallback(req);

    // 5. Verify redirection status is confirmed
    const location = response.headers.get('location') || '';
    expect(location).toContain('status=confirmed');
    expect(location).toContain(`ref=${gatewayRef}`);

    // 6. Verify database payment status flipped to SUCCESS
    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(updatedPayment?.status).toBe('SUCCESS');

    // 7. Verify ledger was credited with the exact amount
    const balances = await GeneralLedgerService.getUserBalances(userId);
    expect(balances.IRR.toNumber()).toBe(amount);
  });

  it('handlePaymentCallback fails closed on invalid/missing signature without crediting ledger', async () => {
    const unverifiedTopupId = `unverified_${suffix}`;
    const unverifiedPayment = await prisma.payment.create({
      data: {
        bookingId: `wallet_topup_${userId}`,
        idempotencyKey: unverifiedTopupId,
        method: 'gateway_ecardo',
        gatewayRef: `FZ_UNV_${suffix.slice(0, 4)}`,
        amount: 1_000_000,
        currency: 'IRR',
        status: 'PENDING',
      },
    });

    // Caller provides forged or missing signature
    const fakeSig = '0000000000000000000000000000000000000000000000000000000000000000';
    const callbackUrl = `http://localhost:3000/api/payments/callback?bookingId=wallet_topup_${userId}&topupId=${unverifiedTopupId}&sig=${fakeSig}&status=success`;
    const req = new NextRequest(callbackUrl);

    const response = await handlePaymentCallback(req);

    // Must NOT be confirmed — should remain processing awaiting authoritative IPN
    const location = response.headers.get('location') || '';
    expect(location).toContain('status=processing');

    // Payment in DB must remain PENDING
    const checkPayment = await prisma.payment.findUnique({ where: { id: unverifiedPayment.id } });
    expect(checkPayment?.status).toBe('PENDING');

    // Ledger balance must not have changed
    const balances = await GeneralLedgerService.getUserBalances(userId);
    expect(balances.IRR.toNumber()).toBe(amount);

    await prisma.payment.delete({ where: { id: unverifiedPayment.id } });
  });
});
