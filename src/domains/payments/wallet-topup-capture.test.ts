import { describe, it, expect, afterAll } from 'vitest';
import { PaymentDomainService } from './PaymentDomainService';
import { GeneralLedgerService } from '../ledger/GeneralLedgerService';
import { prisma } from '@/lib/prisma';
import { Money } from '@/lib/finance';

/**
 * Wallet top-up gateway capture path (PAY-001).
 * Ensures a signed eCardo IPN for bookingId `wallet_topup_<userId>` credits the
 * user's ledger wallet exactly once, validates the amount against the top-up
 * PaymentIntent, and stays idempotent on duplicate events.
 */
describe('Wallet top-up gateway capture via processWebhook', () => {
  const suffix = `wlt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const topUpAmount = 2_500_000;
  const eventId = `evt_topup_${suffix}`;
  const gatewayRef = `FZ${suffix.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 10)}`;
  let userId = '';
  let topUpBookingId = '';

  afterAll(async () => {
    try {
      // Ledger cleanup must be scoped by groupId (double-entry pairs share it)
      await prisma.ledgerEntry.deleteMany({ where: { groupId: `wh_topup_grp_${eventId}` } });
      await prisma.webhookEvent.deleteMany({ where: { eventId: { contains: suffix } } });
      await prisma.payment.deleteMany({ where: { bookingId: topUpBookingId } });
      await prisma.paymentAttempt.deleteMany({ where: { paymentIntent: { bookingId: topUpBookingId } } });
      await prisma.paymentIntent.deleteMany({ where: { bookingId: topUpBookingId } });
      if (userId) {
        await prisma.account.deleteMany({ where: { ownerId: userId } });
        await prisma.user.deleteMany({ where: { id: userId } });
      }
    } catch (e) {
      console.error('Wallet topup test cleanup error:', e);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('sets up user, top-up intent and gateway attempt', async () => {
    const user = await prisma.user.create({
      data: {
        id: `usr_${suffix}`,
        email: `wlttest_${suffix}@firuzo.com`,
        name: 'Wallet Topup Tester',
      },
    });
    userId = user.id;
    topUpBookingId = `wallet_topup_${userId}`;

    const intent = await prisma.paymentIntent.create({
      data: {
        bookingId: topUpBookingId,
        amount: topUpAmount,
        currency: 'IRR',
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
        amount: topUpAmount,
        currency: 'IRT',
        status: 'PENDING_CUSTOMER',
        gatewayRef,
      },
    });

    expect(intent.bookingId).toBe(topUpBookingId);
  });

  it('captures a valid IPN and credits the wallet ledger exactly once', async () => {
    const result = await PaymentDomainService.processWebhook({
      gatewayName: 'ECARDO_GATEWAY',
      eventId,
      eventType: 'payment.captured',
      bookingId: topUpBookingId,
      gatewayRef,
      // The webhook route normalizes eCardo IRT to the platform IRR (Toman)
      settledAmount: new Money(topUpAmount, 'IRR'),
      settledCurrency: 'IRR',
      rawPayload: {
        status: 'success',
        data: { transaction_id: gatewayRef, total_amount: topUpAmount, currency: 'IRT' },
      },
    });

    expect(result.processed).toBe(true);
    expect(result.status).toBe('PROCESSED');

    const walletAccount = await prisma.account.findFirst({
      where: { ownerType: 'USER', ownerId: userId, currency: 'IRR' },
    });
    expect(walletAccount).toBeTruthy();
    const balance = await GeneralLedgerService.getAccountBalance(walletAccount!.id, 'IRR');
    expect(balance.toNumber()).toBe(topUpAmount);

    const payment = await prisma.payment.findFirst({
      where: { gatewayRef, status: 'SUCCESS' },
    });
    expect(payment?.method).toBe('gateway_ecardo');

    const intent = await prisma.paymentIntent.findFirst({
      where: { bookingId: topUpBookingId },
    });
    expect(intent?.status).toBe('SUCCESS');
  });

  it('collapses a replayed event into an idempotent DUPLICATE', async () => {
    const result = await PaymentDomainService.processWebhook({
      gatewayName: 'ECARDO_GATEWAY',
      eventId,
      eventType: 'payment.captured',
      bookingId: topUpBookingId,
      gatewayRef,
      settledAmount: new Money(topUpAmount, 'IRR'),
      settledCurrency: 'IRR',
      rawPayload: { status: 'success' },
    });

    expect(result.processed).toBe(false);
    expect(result.status).toBe('DUPLICATE');

    const walletAccount = await prisma.account.findFirst({
      where: { ownerType: 'USER', ownerId: userId, currency: 'IRR' },
    });
    const balance = await GeneralLedgerService.getAccountBalance(walletAccount!.id, 'IRR');
    expect(balance.toNumber()).toBe(topUpAmount);
  });

  it('rejects a tampered amount for the same top-up intent', async () => {
    await expect(
      PaymentDomainService.processWebhook({
        gatewayName: 'ECARDO_GATEWAY',
        eventId: `evt_tamper_${suffix}`,
        eventType: 'payment.captured',
        bookingId: topUpBookingId,
        gatewayRef,
        settledAmount: new Money(999, 'IRR'),
        settledCurrency: 'IRR',
        rawPayload: { status: 'success' },
      })
    ).rejects.toThrow(/amount tampering detected/);

    const walletAccount = await prisma.account.findFirst({
      where: { ownerType: 'USER', ownerId: userId, currency: 'IRR' },
    });
    const balance = await GeneralLedgerService.getAccountBalance(walletAccount!.id, 'IRR');
    expect(balance.toNumber()).toBe(topUpAmount);
  });

  it('never captures an IPN that reports failure — payment goes FAILED, wallet untouched', async () => {
    const result = await PaymentDomainService.processWebhook({
      gatewayName: 'ECARDO_GATEWAY',
      eventId: `evt_failed_${suffix}`,
      eventType: 'payment.failed',
      bookingId: topUpBookingId,
      gatewayRef,
      settledAmount: new Money(topUpAmount, 'IRR'),
      settledCurrency: 'IRR',
      rawPayload: { status: 'failed' },
    });

    expect(result.processed).toBe(true);
    expect(result.status).toBe('REJECTED');
    expect(result.reason).toMatch(/payment failure/i);

    const walletAccount = await prisma.account.findFirst({
      where: { ownerType: 'USER', ownerId: userId, currency: 'IRR' },
    });
    const balance = await GeneralLedgerService.getAccountBalance(walletAccount!.id, 'IRR');
    expect(balance.toNumber()).toBe(topUpAmount); // unchanged — a failure report never credits

    const failedPayments = await prisma.payment.count({
      where: { gatewayRef, status: 'SUCCESS' },
    });
    expect(failedPayments).toBe(1); // only the original legit capture, no extra capture from the failed event
  });
});
