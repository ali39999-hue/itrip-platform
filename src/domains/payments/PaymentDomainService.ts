import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Money } from '@/lib/finance';
import { ShetabGatewayAdapter, DemoPaymentAdapter, InternalWalletGatewayAdapter } from './gateway-port';

export interface InitiatePaymentParams {
  bookingId?: string;
  idempotencyKey: string;
  method: 'wallet_irr' | 'gateway_shetab' | 'wallet_usdt';
  amount: number | Prisma.Decimal;
  currency?: string;
  rawPayload?: Record<string, unknown>;
  customerInfo?: {
    phone?: string;
    email?: string;
  };
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  intentId?: string;
  attemptId?: string;
  gatewayRef?: string;
  redirectUrl?: string;
  status: 'INITIATED' | 'PENDING' | 'PENDING_CUSTOMER' | 'SUCCESS' | 'CAPTURED' | 'FAILED' | 'REFUNDED';
  error?: string;
}

export interface WebhookProcessParams {
  gatewayName?: string;
  eventId: string;
  eventType?: string;
  bookingId: string;
  gatewayRef: string;
  settledAmount: number | Prisma.Decimal | string;
  settledCurrency: string;
  signature?: string;
  timestamp?: number;
  merchantId?: string;
  rawPayload?: Record<string, unknown>;
}

export interface WebhookProcessResult {
  processed: boolean;
  status: 'PROCESSED' | 'DUPLICATE' | 'REJECTED' | 'FAILED';
  paymentId?: string;
  reason?: string;
}

export class PaymentDomainService {
  /**
   * Resolve appropriate gateway adapter based on method and environment
   */
  private static getAdapter(method: string) {
    if (method === 'wallet_irr' || method === 'wallet_usdt') {
      return new InternalWalletGatewayAdapter();
    }
    if (process.env.DEMO_MODE === 'true') {
      return new DemoPaymentAdapter();
    }
    return new ShetabGatewayAdapter();
  }

  /**
   * Create or retrieve an authoritative PaymentIntent (PAY-002)
   */
  static async createPaymentIntent(params: {
    bookingId: string;
    amount: number | Prisma.Decimal | Money;
    currency?: string;
    idempotencyKey: string;
    ttlMinutes?: number;
  }, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    const expiresAt = new Date(Date.now() + (params.ttlMinutes || 15) * 60 * 1000);
    
    let decimalAmount: Prisma.Decimal;
    if (params.amount instanceof Money) {
      decimalAmount = params.amount.toDecimal();
    } else if (params.amount instanceof Prisma.Decimal) {
      decimalAmount = params.amount;
    } else {
      decimalAmount = new Prisma.Decimal(params.amount.toString());
    }

    return client.paymentIntent.upsert({
      where: { idempotencyKey: params.idempotencyKey },
      update: {
        amount: decimalAmount,
        currency: (params.currency || 'IRR').toUpperCase(),
        expiresAt,
      },
      create: {
        bookingId: params.bookingId,
        amount: decimalAmount,
        currency: (params.currency || 'IRR').toUpperCase(),
        status: 'INITIATED',
        idempotencyKey: params.idempotencyKey,
        expiresAt,
      },
    });
  }

  /**
   * Process payment attempt and gateway dispatch (PAY-001, PAY-003, PAY-004)
   * Enforces idempotency, booking-scoping, and strictly fails closed.
   */
  static async processPayment(
    params: InitiatePaymentParams,
    tx?: Prisma.TransactionClient
  ): Promise<PaymentResult> {
    const client = tx || prisma;
    const currency = (params.currency || 'IRR').toUpperCase();
    const decimalAmount = params.amount instanceof Prisma.Decimal
      ? params.amount
      : new Prisma.Decimal(params.amount.toString());

    // 1. Idempotency check on existing Payment record
    const existing = await client.payment.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });

    if (existing) {
      // Replaying another booking's idempotency key must fail closed
      if (params.bookingId && existing.bookingId && existing.bookingId !== params.bookingId) {
        return {
          success: false,
          paymentId: existing.id,
          status: 'FAILED',
          error: 'Idempotency key is bound to a different booking',
        };
      }
      if (existing.status === 'SUCCESS' || existing.status === 'CAPTURED') {
        return {
          success: true,
          paymentId: existing.id,
          gatewayRef: existing.gatewayRef || undefined,
          status: 'SUCCESS',
        };
      }
      if (existing.status === 'FAILED') {
        return {
          success: false,
          paymentId: existing.id,
          status: 'FAILED',
          error: 'Payment previously failed',
        };
      }
    }

    // 2. Resolve adapter
    const adapter = this.getAdapter(params.method);

    // In production without DEMO_MODE, demo adapter must fail closed
    if (adapter.isDemo && process.env.DEMO_MODE !== 'true') {
      return {
        success: false,
        status: 'FAILED',
        error: 'Security Error: Demo payment simulation is strictly prohibited in production mode',
      };
    }

    // 3. Create or find canonical PaymentIntent (PAY-002)
    const intent = await this.createPaymentIntent({
      bookingId: params.bookingId || 'standalone',
      amount: decimalAmount,
      currency,
      idempotencyKey: `intent_${params.idempotencyKey}`,
    }, client);

    // 4. Call gateway port to create payment request
    const gatewayReq = {
      intentId: intent.id,
      bookingId: params.bookingId || '',
      amount: new Money(decimalAmount, currency),
      callbackUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/payments/callback`,
      customerInfo: params.customerInfo,
    };

    let gatewayRes;
    try {
      gatewayRes = await adapter.createPayment(gatewayReq);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        status: 'FAILED',
        error: `Gateway initialization failed: ${errorMsg}`,
      };
    }

    const gatewayRef = gatewayRes.gatewayRef;

    // 5. Create PaymentAttempt record (PAY-003)
    const attempt = await client.paymentAttempt.create({
      data: {
        paymentIntentId: intent.id,
        gatewayName: adapter.name,
        method: params.method,
        amount: decimalAmount,
        currency,
        status: gatewayRes.status === 'SUCCESS' ? 'SUCCESS' : 'PENDING_CUSTOMER',
        gatewayRef,
        rawPayload: JSON.stringify(gatewayRes.rawResponse || {}),
      },
    });

    // 6. Record GatewayTransaction
    await client.gatewayTransaction.create({
      data: {
        attemptId: attempt.id,
        gatewayName: adapter.name,
        gatewayRef,
        transactionType: 'SALE',
        amount: decimalAmount,
        currency,
        status: gatewayRes.status === 'SUCCESS' ? 'SUCCESS' : 'PENDING',
        rawResponse: JSON.stringify(gatewayRes.rawResponse || {}),
      },
    });

    // 7. Upsert Payment record for backward compatibility & direct query tracking
    const initialStatus = params.method === 'gateway_shetab' ? 'PENDING' : 'SUCCESS';
    const payment = await client.payment.upsert({
      where: { idempotencyKey: params.idempotencyKey },
      update: {
        status: initialStatus,
        gatewayRef,
        amount: decimalAmount,
        method: params.method,
      },
      create: {
        bookingId: params.bookingId,
        idempotencyKey: params.idempotencyKey,
        method: params.method,
        gatewayRef,
        amount: decimalAmount,
        currency,
        status: initialStatus,
        rawPayload: params.rawPayload ? JSON.stringify(params.rawPayload) : null,
      },
    });

    return {
      success: initialStatus === 'SUCCESS',
      paymentId: payment.id,
      intentId: intent.id,
      attemptId: attempt.id,
      gatewayRef,
      redirectUrl: gatewayRes.redirectUrl,
      status: initialStatus as PaymentResult['status'],
    };
  }

  /**
   * Authoritative Signed Webhook & Callback Verification (PAY-005, PAY-006, PAY-007)
   * Exactly-once processing with replay protection, cryptographic signatures, and amount validation.
   */
  static async processWebhook(
    params: WebhookProcessParams,
    tx?: Prisma.TransactionClient
  ): Promise<WebhookProcessResult> {
    const client = tx || prisma;
    const now = Date.now();
    const gatewayName = params.gatewayName || 'SHETAB_GATEWAY';
    const eventType = params.eventType || 'payment.captured';

    // 1. Replay Protection: Timestamp freshness check (PAY-006)
    if (params.timestamp) {
      const eventTime = Number(params.timestamp);
      const ageMs = Math.abs(now - eventTime);
      const maxAgeMs = 5 * 60 * 1000; // 5 minutes max clock skew / replay window
      if (ageMs > maxAgeMs) {
        return {
          processed: false,
          status: 'REJECTED',
          reason: 'Webhook timestamp outside 5-minute replay window (stale or future replay)',
        };
      }
    }

    // 2. Idempotency Check: WebhookEvent unique constraint (PAY-006, PAY-007)
    const existingWebhook = await client.webhookEvent.findUnique({
      where: {
        gatewayName_eventId: {
          gatewayName,
          eventId: params.eventId,
        },
      },
    });

    if (existingWebhook) {
      if (existingWebhook.status === 'PROCESSED') {
        const existingPayment = await client.payment.findUnique({
          where: { idempotencyKey: `webhook_${gatewayName}_${params.eventId}` },
        });
        return {
          processed: false,
          status: 'DUPLICATE',
          paymentId: existingPayment?.id,
          reason: 'Duplicate webhook event previously processed and captured (idempotent)',
        };
      }
      if (existingWebhook.status === 'REJECTED') {
        return {
          processed: false,
          status: 'REJECTED',
          reason: `Webhook was previously rejected: ${existingWebhook.rejectionReason}`,
        };
      }
    }

    // Record or update WebhookEvent to RECEIVED
    const webhookRecord = await client.webhookEvent.upsert({
      where: {
        gatewayName_eventId: {
          gatewayName,
          eventId: params.eventId,
        },
      },
      update: {
        status: 'RECEIVED',
        payload: JSON.stringify(params.rawPayload || {}),
      },
      create: {
        gatewayName,
        eventId: params.eventId,
        eventType,
        signature: params.signature,
        payload: JSON.stringify(params.rawPayload || {}),
        status: 'RECEIVED',
      },
    });

    // 3. Cryptographic Signature Verification (PAY-005: Strictly Fail-Closed)
    const isDemo = process.env.DEMO_MODE === 'true';
    if (!isDemo && !params.signature) {
      await client.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: { status: 'REJECTED', rejectionReason: 'WEBHOOK_FAIL_CLOSED: Missing cryptographic signature in production' },
      });
      throw new Error('WEBHOOK_FAIL_CLOSED: Missing required cryptographic signature in production mode');
    }

    const adapter = gatewayName === 'SHETAB_GATEWAY'
      ? new ShetabGatewayAdapter()
      : isDemo
        ? new DemoPaymentAdapter()
        : new ShetabGatewayAdapter();

    if (adapter.verifyWebhook && params.rawPayload && params.signature) {
      const rawString = JSON.stringify(params.rawPayload);
      const verifyRes = await adapter.verifyWebhook(rawString, params.signature);
      if (!verifyRes.valid) {
        await client.webhookEvent.update({
          where: { id: webhookRecord.id },
          data: { status: 'REJECTED', rejectionReason: verifyRes.error || 'Invalid cryptographic signature' },
        });
        throw new Error(`WEBHOOK_FAIL_CLOSED: ${verifyRes.error || 'Cryptographic signature verification failed'}`);
      }
    }

    // 4. Booking & Financial Validation
    const booking = await client.booking.findUnique({
      where: { id: params.bookingId },
    });

    if (!booking) {
      await client.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: { status: 'REJECTED', rejectionReason: `Booking not found: ${params.bookingId}` },
      });
      throw new Error(`Payment webhook error: Booking ${params.bookingId} not found`);
    }

    const expectedAmount = new Prisma.Decimal(booking.totalAmount.toString());
    const incomingAmount = params.settledAmount instanceof Prisma.Decimal
      ? params.settledAmount
      : new Prisma.Decimal(params.settledAmount.toString());

    if (!expectedAmount.equals(incomingAmount)) {
      const reason = `Amount mismatch: expected ${expectedAmount.toString()} but received ${incomingAmount.toString()}`;
      await client.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: { status: 'REJECTED', rejectionReason: reason },
      });
      throw new Error(`Payment webhook amount tampering detected: ${reason}`);
    }

    if (booking.currency.toUpperCase() !== params.settledCurrency.toUpperCase()) {
      const reason = `Currency mismatch: expected ${booking.currency} but received ${params.settledCurrency}`;
      await client.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: { status: 'REJECTED', rejectionReason: reason },
      });
      throw new Error(`Payment webhook currency mismatch: ${reason}`);
    }

    // 5. Atomic Capture Execution (PAY-002, PAY-007)
    const idempotencyKey = `webhook_${gatewayName}_${params.eventId}`;

    const payment = await client.payment.create({
      data: {
        bookingId: params.bookingId,
        idempotencyKey,
        method: 'gateway_shetab',
        gatewayRef: params.gatewayRef,
        amount: incomingAmount,
        currency: params.settledCurrency.toUpperCase(),
        status: 'SUCCESS',
        rawPayload: params.rawPayload ? JSON.stringify(params.rawPayload) : null,
      },
    });

    // Update WebhookEvent to PROCESSED
    await client.webhookEvent.update({
      where: { id: webhookRecord.id },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    });

    // Update Booking status
    await client.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: 'CAPTURED',
        status: 'CONFIRMED',
      },
    });

    // Add relational status history (BOOK-004)
    await client.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: 'CONFIRMED',
        actor: 'GATEWAY_WEBHOOK',
        reason: `Payment verified and captured via ${params.gatewayName} (ref: ${params.gatewayRef})`,
        correlationId: `corr_wh_${params.eventId}`,
      },
    });

    return {
      processed: true,
      status: 'PROCESSED',
      paymentId: payment.id,
    };
  }
}
