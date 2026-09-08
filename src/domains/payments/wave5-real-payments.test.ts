import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { Money } from '@/lib/finance';
import { PaymentDomainService } from './PaymentDomainService';
import {
  ShetabPspAdapter,
  validateLivePspConfiguration,
  LivePspConfigurationError,
} from './adapters/ShetabPspAdapter';
import {
  CustomerRefundAdapter,
  validateIranianIban,
  validateCardNumber,
} from './adapters/CustomerRefundAdapter';
import { PaymentReconciliationReportService } from './PaymentReconciliationReportService';

describe('Wave 5: Real Payment & PSP Gateway Suite (PAY-101 to PAY-110)', () => {
  const suffix = `w5_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const secretKey = crypto.randomBytes(32).toString('hex');
  const merchantId = `merch_${suffix}`;
  const terminalId = `term_${suffix}`;
  const testAmount = 6_000_000;
  const testCurrency = 'IRR';

  let testUserId = '';
  let testBookingId = '';
  let pspAdapter: ShetabPspAdapter;

  beforeAll(async () => {
    // 1. Create test user
    const user = await prisma.user.create({
      data: {
        id: `usr_${suffix}`,
        email: `wave5_${suffix}@itrip.test`,
        name: 'Wave 5 Tester',
      },
    });
    testUserId = user.id;

    // 2. Create test booking
    const booking = await prisma.booking.create({
      data: {
        id: `bkg_${suffix}`,
        reference: `ITR-W5-${suffix.toUpperCase()}`,
        customerId: testUserId,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'INITIATED',
        totalAmount: testAmount,
        currency: testCurrency,
      },
    });
    testBookingId = booking.id;

    // 3. Initialize configured Shetab PSP adapter
    pspAdapter = new ShetabPspAdapter({
      provider: 'SAMAN',
      merchantId,
      secretKey,
      terminalId,
    });
  });

  afterAll(async () => {
    try {
      await prisma.journalLine.deleteMany({
        where: { journalEntry: { entryNumber: { contains: suffix } } },
      });
      await prisma.journalEntry.deleteMany({
        where: { entryNumber: { contains: suffix } },
      });
      await prisma.ledgerEntry.deleteMany({
        where: { groupId: { contains: suffix } },
      });
      await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: testBookingId } });
      await prisma.payment.deleteMany({ where: { bookingId: testBookingId } });
      await prisma.paymentIntent.deleteMany({ where: { bookingId: testBookingId } });
      await prisma.webhookEvent.deleteMany({ where: { gatewayName: { contains: suffix } } });
      await prisma.operationalException.deleteMany({ where: { entityId: { contains: suffix } } });
      await prisma.booking.deleteMany({ where: { id: testBookingId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  });

  it('PAY-101: ShetabPspAdapter performs full token, verify, reverse, and settlement lifecycle with HMAC signature', async () => {
    // 1. Token request
    const tokenRes = await pspAdapter.createPayment({
      intentId: `intent_${suffix}`,
      bookingId: testBookingId,
      amount: new Money(testAmount, testCurrency),
      callbackUrl: 'https://itrip.test/callback',
    });

    expect(tokenRes.success).toBe(true);
    expect(tokenRes.status).toBe('PENDING_CUSTOMER');
    expect(tokenRes.gatewayRef).toMatch(/^shb_/);
    expect(tokenRes.redirectUrl).toContain('sep.shaparak.ir');

    // 2. Verification with valid HMAC signature
    const now = Date.now();
    const expectedData = `${tokenRes.gatewayRef}:${testAmount}:${merchantId}:${now}`;
    const validSignature = crypto.createHmac('sha256', secretKey).update(expectedData).digest('hex');

    const verifyRes = await pspAdapter.verifyPayment({
      gatewayRef: tokenRes.gatewayRef,
      expectedAmount: new Money(testAmount, testCurrency),
      merchantId,
      timestamp: now,
      signature: validSignature,
    });

    expect(verifyRes.verified).toBe(true);
    expect(verifyRes.status).toBe('CAPTURED');
    expect(verifyRes.transactionId).toBe(`txn_${tokenRes.gatewayRef}`);

    // 3. Signature tampering fails closed
    const tamperedVerify = await pspAdapter.verifyPayment({
      gatewayRef: tokenRes.gatewayRef,
      expectedAmount: new Money(testAmount, testCurrency),
      merchantId,
      timestamp: now,
      signature: 'bad_signature_digest',
    });
    expect(tamperedVerify.verified).toBe(false);
    expect(tamperedVerify.errorCode).toBe('INVALID_SIGNATURE');

    // 4. Pre-settlement reversal
    const reverseRes = await pspAdapter.reversePayment(
      tokenRes.gatewayRef,
      new Money(testAmount, testCurrency),
      'Customer cancellation before cut-off'
    );
    expect(reverseRes.success).toBe(true);
    expect(reverseRes.reversalRef).toMatch(/^rev_/);

    // 5. Settlement protocol
    const settleRes = await pspAdapter.settlePayment('batch_w5_001');
    expect(settleRes.success).toBe(true);
    expect(settleRes.settlementRef).toMatch(/^stl_/);
  });

  it('PAY-102: Missing live PSP credentials fail closed immediately when in production mode', () => {
    const oldEnv = process.env.NODE_ENV;
    const oldDemo = process.env.DEMO_MODE;
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.DEMO_MODE = 'false';

    expect(() => {
      validateLivePspConfiguration({
        merchantId: '',
        secretKey: '',
        terminalId: '',
      });
    }).toThrow(LivePspConfigurationError);

    (process.env as Record<string, string | undefined>).NODE_ENV = oldEnv;
    process.env.DEMO_MODE = oldDemo;
  });

  it('PAY-103: Local state alone cannot succeed payment — gateway Shetab stays PENDING until authority', async () => {
    const oldDemo = process.env.DEMO_MODE;
    process.env.DEMO_MODE = 'false';

    const res = await PaymentDomainService.processPayment({
      bookingId: testBookingId,
      idempotencyKey: `idem_authority_${suffix}`,
      method: 'gateway_shetab',
      amount: new Money(testAmount, testCurrency),
      currency: testCurrency,
    });

    expect(res.success).toBe(false);
    expect(res.status).toBe('PENDING');
    expect(res.gatewayRef).toBeDefined();

    // Verify booking in DB is not confirmed prematurely
    const booking = await prisma.booking.findUnique({ where: { id: testBookingId } });
    expect(booking?.status).toBe('PENDING_PAYMENT');

    process.env.DEMO_MODE = oldDemo;
  });

  it('PAY-104, PAY-106: Test duplicate webhook x3 (verify one semantic payment, capture, ledger posting, and confirmation)', async () => {
    const eventId = `wh_x3_${suffix}`;
    const gatewayRef = `shb_x3_${suffix}`;
    const now = Date.now();
    const rawPayload = {
      eventId,
      eventType: 'payment.captured',
      bookingId: testBookingId,
      gatewayRef,
      amount: testAmount,
      currency: testCurrency,
      timestamp: now,
      merchantId,
    };
    const rawBody = JSON.stringify(rawPayload);
    const signature = crypto.createHmac('sha256', secretKey).update(rawBody).digest('hex');

    // We configure the test adapter secret temporarily in env for PaymentDomainService resolution
    const oldSecret = process.env.SHETAB_SECRET_KEY;
    const oldMerchant = process.env.SHETAB_MERCHANT_ID;
    process.env.SHETAB_SECRET_KEY = secretKey;
    process.env.SHETAB_MERCHANT_ID = merchantId;

    // Call 1: First delivery -> PROCESSED
    const res1 = await PaymentDomainService.processWebhook({
      gatewayName: 'SHETAB_SAMAN',
      eventId,
      eventType: 'payment.captured',
      bookingId: testBookingId,
      gatewayRef,
      settledAmount: new Money(testAmount, testCurrency),
      settledCurrency: testCurrency,
      signature,
      timestamp: now,
      merchantId,
      rawPayload,
      rawBody,
    });

    expect(res1.processed).toBe(true);
    expect(res1.status).toBe('PROCESSED');
    expect(res1.paymentId).toBeDefined();

    // Call 2: Second duplicate delivery -> DUPLICATE with identical paymentId
    const res2 = await PaymentDomainService.processWebhook({
      gatewayName: 'SHETAB_SAMAN',
      eventId,
      eventType: 'payment.captured',
      bookingId: testBookingId,
      gatewayRef,
      settledAmount: new Money(testAmount, testCurrency),
      settledCurrency: testCurrency,
      signature,
      timestamp: now,
      merchantId,
      rawPayload,
      rawBody,
    });

    expect(res2.processed).toBe(false);
    expect(res2.status).toBe('DUPLICATE');
    expect(res2.paymentId).toBe(res1.paymentId);

    // Call 3: Third duplicate delivery -> DUPLICATE with identical paymentId
    const res3 = await PaymentDomainService.processWebhook({
      gatewayName: 'SHETAB_SAMAN',
      eventId,
      eventType: 'payment.captured',
      bookingId: testBookingId,
      gatewayRef,
      settledAmount: new Money(testAmount, testCurrency),
      settledCurrency: testCurrency,
      signature,
      timestamp: now,
      merchantId,
      rawPayload,
      rawBody,
    });

    expect(res3.processed).toBe(false);
    expect(res3.status).toBe('DUPLICATE');
    expect(res3.paymentId).toBe(res1.paymentId);

    // Assert exactly ONE payment in DB for this webhook
    const payments = await prisma.payment.findMany({
      where: { idempotencyKey: `webhook_SHETAB_SAMAN_${eventId}` },
    });
    expect(payments.length).toBe(1);

    // Assert booking confirmed
    const updatedBooking = await prisma.booking.findUnique({ where: { id: testBookingId } });
    expect(updatedBooking?.status).toBe('CONFIRMED');
    expect(updatedBooking?.paymentStatus).toBe('CAPTURED');

    // Assert exactly ONE ledger posting group exists for this webhook capture
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: { groupId: `wh_grp_${eventId}` },
    });
    expect(ledgerEntries.length).toBe(2); // 1 debit, 1 credit

    process.env.SHETAB_SECRET_KEY = oldSecret;
    process.env.SHETAB_MERCHANT_ID = oldMerchant;
  });

  it('PAY-105: Routes unknown/timeout gateway results to OperationalException reconciliation rather than blind retry', async () => {
    const unknownRes = await PaymentDomainService.handleUnknownGatewayResult({
      paymentIntentId: `intent_timeout_${suffix}`,
      gatewayRef: `shb_timeout_${suffix}`,
      reason: 'HTTP 504 Gateway Timeout from Shaparak SEP endpoint',
    });

    expect(unknownRes.status).toBe('PENDING_RECONCILIATION');
    expect(unknownRes.exceptionId).toBeDefined();

    // Verify exception recorded in Exception Center
    const exception = await prisma.operationalException.findUnique({
      where: { id: unknownRes.exceptionId },
    });
    expect(exception?.type).toBe('PAYMENT_TIMEOUT');
    expect(exception?.entityId).toBe(`intent_timeout_${suffix}`);
    expect(exception?.status).toBe('OPEN');
  });

  it('PAY-108: Payment failure, decline, and expiry reach correct terminal states', async () => {
    // 1. Create a fresh intent for failure testing
    const intent = await PaymentDomainService.createPaymentIntent({
      bookingId: `bkg_fail_${suffix}`,
      amount: new Money(1_000_000, 'IRR'),
      currency: 'IRR',
      idempotencyKey: `idem_fail_${suffix}`,
    });

    // Handle failure
    const failRes = await PaymentDomainService.handlePaymentFailure({
      paymentIntentId: intent.id,
      gatewayRef: `shb_declined_${suffix}`,
      reason: 'Insufficient card funds / user cancelled on gateway',
    });
    expect(failRes.status).toBe('FAILED');

    const failedIntent = await prisma.paymentIntent.findUnique({ where: { id: intent.id } });
    expect(failedIntent?.status).toBe('FAILED');

    // Expiry test
    const expiryIntent = await PaymentDomainService.createPaymentIntent({
      bookingId: `bkg_exp_${suffix}`,
      amount: new Money(2_000_000, 'IRR'),
      currency: 'IRR',
      idempotencyKey: `idem_exp_${suffix}`,
    });

    const expRes = await PaymentDomainService.handlePaymentExpiry({
      paymentIntentId: expiryIntent.id,
    });
    expect(expRes.status).toBe('EXPIRED');

    const expiredIntent = await prisma.paymentIntent.findUnique({ where: { id: expiryIntent.id } });
    expect(expiredIntent?.status).toBe('VOIDED');
  });

  it('PAY-109: CustomerRefundAdapter validates Iranian IBAN, card numbers, and executes gateway refund / Paya payout', async () => {
    const adapter = new CustomerRefundAdapter({
      pspSecretKey: secretKey,
      pspTerminalId: terminalId,
      payaApiKey: `test-paya-key-${crypto.randomUUID()}`,
    });

    // 1. Iranian Sheba (IBAN) format validation (ISO 7064 Mod 97)
    // Valid standard test Sheba: IR270170000000100324200001 (Melli Bank valid check digits)
    const validIban = 'IR270170000000100324200001';
    const invalidIban = 'IR999999999999999999999999';
    expect(validateIranianIban(validIban)).toBe(true);
    expect(validateIranianIban(invalidIban)).toBe(false);

    // 2. 16-digit card validation (Luhn)
    expect(validateCardNumber('6037997112345674')).toBe(true);
    expect(validateCardNumber('1234567812345678')).toBe(false);

    // 3. Direct Gateway Refund
    const gwRefund = await adapter.refundViaGateway({
      gatewayRef: `shb_ref_${suffix}`,
      amount: new Money(500_000, 'IRR'),
      reason: 'Partial cancellation',
    });
    expect(gwRefund.success).toBe(true);
    expect(gwRefund.channel).toBe('GATEWAY');
    expect(gwRefund.payoutRef).toMatch(/^gw_rfd_/);

    // 4. Interbank Paya Payout
    const payaPayout = await adapter.payoutViaPaya({
      iban: validIban,
      accountHolderName: 'علی رضایی',
      amount: new Money(1_200_000, 'IRR'),
      referenceId: `paya_ref_${suffix}`,
      description: 'استرداد وجه بلیت پرواز',
    });
    expect(payaPayout.success).toBe(true);
    expect(payaPayout.channel).toBe('PAYA');
    expect(payaPayout.payoutRef).toMatch(/^paya_/);

    // Invalid IBAN fails closed
    const badIbanPayout = await adapter.payoutViaPaya({
      iban: 'INVALID_IBAN',
      accountHolderName: 'Unknown',
      amount: new Money(1_000_000, 'IRR'),
      referenceId: `paya_bad_${suffix}`,
    });
    expect(badIbanPayout.success).toBe(false);
    expect(badIbanPayout.error).toContain('Invalid Iranian Sheba');
  });

  it('PAY-110: PaymentReconciliationReportService generates multi-way payment reconciliation report', async () => {
    const report = await PaymentReconciliationReportService.generateReport({
      currency: 'IRR',
    });

    expect(report.reportId).toBeDefined();
    expect(report.currency).toBe('IRR');
    expect(report.summary.totalPaymentsCount).toBeGreaterThanOrEqual(1);
    expect(report.summary.totalCapturedCount).toBeGreaterThanOrEqual(1);
    expect(report.summary.totalLedgerPostingsCount).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(report.discrepancies)).toBe(true);
  });
});
