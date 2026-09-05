import { describe, it, expect, afterAll } from 'vitest';
import { PaymentDomainService } from './PaymentDomainService';
import { ShetabGatewayAdapter, DemoPaymentAdapter } from './gateway-port';
import { prisma } from '@/lib/prisma';
import { Money } from '@/lib/finance';

describe('Payment Hardening Suite (PAY-001 to PAY-008)', () => {
  const suffix = `pay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  let testUserId = '';
  let testBookingId = '';
  const testAmount = 5_000_000;
  const testCurrency = 'IRR';

  afterAll(async () => {
    try {
      await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: testBookingId } });
      await prisma.payment.deleteMany({ where: { bookingId: testBookingId } });
      await prisma.paymentIntent.deleteMany({ where: { bookingId: testBookingId } });
      await prisma.webhookEvent.deleteMany({ where: { gatewayName: 'SHETAB_GATEWAY' } });
      await prisma.booking.deleteMany({ where: { id: testBookingId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
    } catch (e) {
      console.error('Test cleanup error:', e);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('sets up a test user and booking for payment hardening verification', async () => {
    const user = await prisma.user.create({
      data: {
        id: `usr_${suffix}`,
        email: `paytest_${suffix}@firuzo.com`,
        name: 'Payment Tester',
      },
    });
    testUserId = user.id;

    const booking = await prisma.booking.create({
      data: {
        id: `bkg_${suffix}`,
        reference: `ITR-${suffix.toUpperCase()}`,
        customerId: testUserId,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'INITIATED',
        totalAmount: testAmount,
        currency: testCurrency,
      },
    });
    testBookingId = booking.id;

    expect(booking.totalAmount.toNumber()).toBe(testAmount);
  });

  it('PAY-001: Demo payment adapter fails closed when DEMO_MODE is not true', async () => {
    const oldEnv = process.env.DEMO_MODE;
    process.env.DEMO_MODE = 'false';

    const demoAdapter = new DemoPaymentAdapter();
    await expect(
      demoAdapter.createPayment({
        intentId: 'test_intent',
        bookingId: testBookingId,
        amount: Money.from(1000),
        callbackUrl: 'http://localhost:3000',
      })
    ).rejects.toThrow(/disabled in production/i);

    process.env.DEMO_MODE = oldEnv;
  });

  it('PAY-002, PAY-003: Canonical lifecycle creates PaymentIntent, PaymentAttempt and GatewayTransaction', async () => {
    const idempotencyKey = `idem_lifecycle_${suffix}`;
    const res = await PaymentDomainService.processPayment({
      bookingId: testBookingId,
      idempotencyKey,
      method: 'wallet_irr',
      amount: testAmount,
      currency: testCurrency,
    });

    expect(res.success).toBe(true);
    expect(res.intentId).toBeDefined();
    expect(res.attemptId).toBeDefined();

    // Verify DB records
    const intent = await prisma.paymentIntent.findUnique({
      where: { id: res.intentId },
      include: { attempts: { include: { transactions: true } } },
    });

    expect(intent).not.toBeNull();
    expect(intent?.bookingId).toBe(testBookingId);
    expect(intent?.attempts.length).toBeGreaterThan(0);
    expect(intent?.attempts[0].transactions.length).toBeGreaterThan(0);
    expect(intent?.attempts[0].transactions[0].transactionType).toBe('SALE');
  });

  it('PAY-005: Webhook with incorrect HMAC signature is rejected and fails closed', async () => {
    const secretKey = 'test_secret_key_123';
    const adapter = new ShetabGatewayAdapter({
      merchantId: 'merch_001',
      secretKey,
      terminalId: 'term_001',
    });

    const bodyObj = {
      eventId: `evt_sig_fail_${suffix}`,
      eventType: 'payment.captured',
      bookingId: testBookingId,
      gatewayRef: `ref_sig_${suffix}`,
      amount: testAmount,
      currency: testCurrency,
      timestamp: Date.now(),
      merchantId: 'merch_001',
    };
    const rawBody = JSON.stringify(bodyObj);
    const bogusSignature = '0000000000000000000000000000000000000000000000000000000000000000';

    const verifyRes = await adapter.verifyWebhook(rawBody, bogusSignature);
    expect(verifyRes.valid).toBe(false);
    expect(verifyRes.error).toMatch(/signature/i);
  });

  it('PAY-006: Webhook with stale timestamp (> 5 mins) is rejected (Replay Protection)', async () => {
    const staleTimestamp = Date.now() - (10 * 60 * 1000); // 10 minutes ago
    const eventId = `evt_stale_${suffix}`;

    const res = await PaymentDomainService.processWebhook({
      gatewayName: 'SHETAB_GATEWAY',
      eventId,
      eventType: 'payment.captured',
      bookingId: testBookingId,
      gatewayRef: `ref_stale_${suffix}`,
      settledAmount: testAmount,
      settledCurrency: testCurrency,
      timestamp: staleTimestamp,
    });

    expect(res.processed).toBe(false);
    expect(res.status).toBe('REJECTED');
    expect(res.reason).toMatch(/5-minute replay window/i);
  });

  it('PAY-007: Same webhook x3 produces exactly 1 capture and 2 idempotent DUPLICATE responses', async () => {
    const eventId = `evt_repeat_x3_${suffix}`;
    const gatewayRef = `ref_x3_${suffix}`;
    const now = Date.now();

    // Call 1
    const res1 = await PaymentDomainService.processWebhook({
      gatewayName: 'SHETAB_GATEWAY',
      eventId,
      eventType: 'payment.captured',
      bookingId: testBookingId,
      gatewayRef,
      settledAmount: testAmount,
      settledCurrency: testCurrency,
      timestamp: now,
    });

    expect(res1.processed).toBe(true);
    expect(res1.status).toBe('PROCESSED');
    expect(res1.paymentId).toBeDefined();

    // Call 2 (duplicate)
    const res2 = await PaymentDomainService.processWebhook({
      gatewayName: 'SHETAB_GATEWAY',
      eventId,
      eventType: 'payment.captured',
      bookingId: testBookingId,
      gatewayRef,
      settledAmount: testAmount,
      settledCurrency: testCurrency,
      timestamp: now,
    });

    expect(res2.processed).toBe(false);
    expect(res2.status).toBe('DUPLICATE');

    // Call 3 (duplicate)
    const res3 = await PaymentDomainService.processWebhook({
      gatewayName: 'SHETAB_GATEWAY',
      eventId,
      eventType: 'payment.captured',
      bookingId: testBookingId,
      gatewayRef,
      settledAmount: testAmount,
      settledCurrency: testCurrency,
      timestamp: now,
    });

    expect(res3.processed).toBe(false);
    expect(res3.status).toBe('DUPLICATE');

    // Verify exactly ONE payment row created for this webhook
    const payments = await prisma.payment.findMany({
      where: { idempotencyKey: `webhook_SHETAB_GATEWAY_${eventId}` },
    });
    expect(payments.length).toBe(1);

    // Verify booking updated to CONFIRMED
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: testBookingId },
    });
    expect(updatedBooking?.status).toBe('CONFIRMED');
    expect(updatedBooking?.paymentStatus).toBe('CAPTURED');
  });

  it('Amount tampering: Webhook with mismatched amount is rejected', async () => {
    const eventId = `evt_tamper_amt_${suffix}`;
    await expect(
      PaymentDomainService.processWebhook({
        gatewayName: 'SHETAB_GATEWAY',
        eventId,
        eventType: 'payment.captured',
        bookingId: testBookingId,
        gatewayRef: `ref_tamper_${suffix}`,
        settledAmount: 100, // Expected 5,000,000
        settledCurrency: testCurrency,
        timestamp: Date.now(),
      })
    ).rejects.toThrow(/amount tampering detected/i);
  });

  it('Currency mismatch: Webhook with mismatched currency is rejected', async () => {
    const eventId = `evt_mismatch_curr_${suffix}`;
    await expect(
      PaymentDomainService.processWebhook({
        gatewayName: 'SHETAB_GATEWAY',
        eventId,
        eventType: 'payment.captured',
        bookingId: testBookingId,
        gatewayRef: `ref_curr_${suffix}`,
        settledAmount: testAmount,
        settledCurrency: 'USD', // Expected IRR
        timestamp: Date.now(),
      })
    ).rejects.toThrow(/currency mismatch/i);
  });
});
