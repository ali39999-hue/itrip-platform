import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Money } from '@/lib/finance';
import { DemoPaymentAdapter, InternalWalletGatewayAdapter, EcardoGatewayAdapter } from './gateway-port';
import { ShetabPspAdapter, validateLivePspConfiguration } from './adapters/ShetabPspAdapter';
import { GeneralLedgerService } from '../ledger/GeneralLedgerService';
import { OperationalExceptionService, ExceptionSeverity } from '../finance/three-way-reconciliation';
import { businessMetrics } from '@/lib/observability/business-metrics';
import { getAppBaseUrl } from '@/lib/runtime-url';

export interface InitiatePaymentParams {
  bookingId?: string;
  idempotencyKey: string;
  method: 'wallet_irr' | 'gateway_shetab' | 'wallet_usdt' | 'gateway_ecardo';
  amount: Money; // MONEY-101: Money is the only core financial input
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
  amount?: Money; // MONEY-104: Return Money from internal financial services
  currency?: string;
  status: 'INITIATED' | 'PENDING' | 'PENDING_CUSTOMER' | 'SUCCESS' | 'CAPTURED' | 'FAILED' | 'REFUNDED';
  error?: string;
}

export interface WebhookProcessParams {
  gatewayName?: string;
  eventId: string;
  eventType?: string;
  bookingId: string;
  gatewayRef: string;
  settledAmount: Money; // MONEY-101: Money is the only core financial input
  settledCurrency?: string;
  signature?: string;
  timestamp?: number;
  merchantId?: string;
  rawPayload?: Record<string, unknown>;
  /** Exact raw request body bytes as received from the gateway — used for HMAC. */
  rawBody?: string;
}

export interface WebhookProcessResult {
  processed: boolean;
  status: 'PROCESSED' | 'DUPLICATE' | 'REJECTED' | 'FAILED';
  paymentId?: string;
  reason?: string;
}

export class PaymentDomainService {
  /**
   * PAY-102: Startup live PSP configuration validation.
   * Fails closed immediately in production mode if credentials are missing.
   */
  static validateStartupPspConfig(): void {
    validateLivePspConfiguration();
  }

  /**
   * Resolve appropriate gateway adapter based on method and environment.
   * In production, the Shetab PSP adapter is required and enforced.
   */
  private static getAdapter(method: string) {
    if (method === 'wallet_irr' || method === 'wallet_usdt') {
      return new InternalWalletGatewayAdapter();
    }
    if (method === 'gateway_ecardo') {
      return new EcardoGatewayAdapter();
    }
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction && process.env.DEMO_MODE === 'true') {
      return new DemoPaymentAdapter();
    }
    return new ShetabPspAdapter();
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
    const moneyAmount = params.amount instanceof Money
      ? params.amount
      : new Money(params.amount.toString(), params.currency || 'IRR');
    const decimalAmount = moneyAmount.toDecimal();
    const currency = (params.currency || moneyAmount.currency || 'IRR').toUpperCase();

    return client.paymentIntent.upsert({
      where: { idempotencyKey: params.idempotencyKey },
      update: {
        amount: decimalAmount,
        currency,
        expiresAt,
      },
      create: {
        bookingId: params.bookingId,
        amount: decimalAmount,
        currency,
        status: 'INITIATED',
        idempotencyKey: params.idempotencyKey,
        expiresAt,
      },
    });
  }

  /**
   * Process payment attempt and gateway dispatch (PAY-001, PAY-003, PAY-004, PAY-103)
   * Enforces idempotency, booking-scoping, and strictly fails closed.
   * PAY-103: Local state alone can never mean successful gateway payment.
   */
  static async processPayment(
    params: InitiatePaymentParams,
    tx?: Prisma.TransactionClient
  ): Promise<PaymentResult> {
    const client = tx || prisma;
    const moneyAmount = (params.amount as unknown) instanceof Money
      ? (params.amount as unknown as Money)
      : new Money(String(params.amount), params.currency || 'IRR');
    const currency = (params.currency || moneyAmount.currency || 'IRR').toUpperCase();
    const decimalAmount = moneyAmount.toDecimal();

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
      amount: moneyAmount,
      currency,
      idempotencyKey: `intent_${params.idempotencyKey}`,
    }, client);

    // 4. Call gateway port to create payment request
    const gatewayReq = {
      intentId: intent.id,
      bookingId: params.bookingId || '',
      amount: new Money(decimalAmount, currency),
      callbackUrl: `${getAppBaseUrl()}/api/payments/callback`,
      customerInfo: params.customerInfo,
    };

    let gatewayRes;
    try {
      gatewayRes = await adapter.createPayment(gatewayReq);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      businessMetrics.recordPaymentFailed(adapter.name, errorMsg);
      return {
        success: false,
        status: 'FAILED',
        error: `Gateway initialization failed: ${errorMsg}`,
      };
    }

    const gatewayRef = gatewayRes.gatewayRef;

    // PAY-103: PSP authority is mandatory. Local state alone can never mean successful payment.
    // Wallet is internal balance, but gateway payments MUST remain PENDING until signed authority arrives.
    let initialStatus: 'PENDING' | 'SUCCESS' = (params.method === 'gateway_shetab' || params.method === 'gateway_ecardo') ? 'PENDING' : 'SUCCESS';
    if (adapter.isDemo && initialStatus !== 'SUCCESS' && gatewayRes.status !== 'SUCCESS' && adapter.verifyPayment) {
      try {
        const verifyRes = await adapter.verifyPayment({
          gatewayRef,
          expectedAmount: new Money(decimalAmount, currency),
        });
        if (verifyRes.verified && verifyRes.status === 'CAPTURED') {
          initialStatus = 'SUCCESS';
        }
      } catch (e: unknown) {
        console.error('Demo gateway verification failed:', e);
      }
    }

    // 5. Create PaymentAttempt record (PAY-003)
    const attempt = await client.paymentAttempt.create({
      data: {
        paymentIntentId: intent.id,
        gatewayName: adapter.name,
        method: params.method,
        amount: decimalAmount,
        currency,
        status: initialStatus === 'SUCCESS' ? 'SUCCESS' : 'PENDING_CUSTOMER',
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
        status: initialStatus === 'SUCCESS' ? 'SUCCESS' : 'PENDING',
        rawResponse: JSON.stringify(gatewayRes.rawResponse || {}),
      },
    });

    // 7. Upsert Payment record for tracking (PAY-004)
    const payment = await client.payment.upsert({
      where: { idempotencyKey: params.idempotencyKey },
      update: {
        status: initialStatus,
        gatewayRef,
        amount: decimalAmount,
        method: params.method,
        paymentIntentId: intent.id,
      },
      create: {
        bookingId: params.bookingId,
        paymentIntentId: intent.id,
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
   * Authoritative Signed Webhook & Callback Verification (PAY-005, PAY-006, PAY-007, PAY-104, FIN-106)
   * Exactly-once processing with replay protection, cryptographic signatures, amount validation, and automated ledger wiring.
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

    // 2. Idempotency Check: WebhookEvent unique constraint (PAY-006, PAY-007, PAY-104)
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

    // 3. Cryptographic Signature Verification (PAY-005, PAY-101: Strictly Fail-Closed)
    const isDemo = process.env.DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production';
    if (!isDemo && !params.signature) {
      await client.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: { status: 'REJECTED', rejectionReason: 'WEBHOOK_FAIL_CLOSED: Missing cryptographic signature in production' },
      });
      throw new Error('WEBHOOK_FAIL_CLOSED: Missing required cryptographic signature in production mode');
    }

    const adapter = (gatewayName.startsWith('SHETAB') && !isDemo)
      ? new ShetabPspAdapter()
      : gatewayName.startsWith('ECARDO')
        ? new EcardoGatewayAdapter()
        : isDemo
          ? new DemoPaymentAdapter()
          : new ShetabPspAdapter();

    if (adapter.verifyWebhook && (params.rawPayload || params.rawBody) && params.signature) {
      const rawString = params.rawBody || JSON.stringify(params.rawPayload);
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

    // Terminal state booking rejection (money for terminal state bookings flows back)
    if (['EXPIRED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(booking.status)) {
      await client.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: { status: 'REJECTED', rejectionReason: `WEBHOOK_FAIL_CLOSED: Booking ${booking.id} is in terminal state ${booking.status}` },
      });
      throw new Error(`WEBHOOK_FAIL_CLOSED: Booking ${booking.id} is in terminal state ${booking.status} — capture rejected`);
    }

    // 4b. Amount and currency validation
    const incomingMoney = params.settledAmount;
    const settledCurrency = (params.settledCurrency || incomingMoney.currency || booking.currency || 'IRR').toUpperCase();
    const expectedMoney = new Money(booking.totalAmount.toString(), booking.currency);

    if (!expectedMoney.equals(incomingMoney)) {
      const reason = `Amount mismatch: expected ${expectedMoney.toString()} but received ${incomingMoney.toString()}`;
      await client.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: { status: 'REJECTED', rejectionReason: reason },
      });
      throw new Error(`Payment webhook amount tampering detected: ${reason}`);
    }

    if (booking.currency.toUpperCase() !== settledCurrency.toUpperCase()) {
      const reason = `Currency mismatch: expected ${booking.currency} but received ${settledCurrency}`;
      await client.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: { status: 'REJECTED', rejectionReason: reason },
      });
      throw new Error(`Payment webhook currency mismatch: ${reason}`);
    }

    // PAY-104: One capture per booking. A valid gateway event with a fresh eventId
    // for an already-captured booking collapses into an idempotent DUPLICATE.
    if (booking.status === 'CONFIRMED' && booking.paymentStatus === 'CAPTURED') {
      await client.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: { status: 'PROCESSED', processedAt: new Date() },
      });
      const existingPayment = await client.payment.findFirst({
        where: { bookingId: booking.id, status: 'SUCCESS' },
      });
      return {
        processed: false,
        status: 'DUPLICATE',
        paymentId: existingPayment?.id,
        reason: 'Booking already captured — payment idempotency per booking (PAY-010)',
      };
    }

    // 5. Atomic Capture Execution (PAY-002, PAY-007, PAY-104)
    const idempotencyKey = `webhook_${gatewayName}_${params.eventId}`;

    const linkedIntent = await client.paymentIntent.findFirst({
      where: { bookingId: booking.id },
      orderBy: { createdAt: 'desc' },
    });

    const payment = await client.payment.create({
      data: {
        bookingId: params.bookingId,
        paymentIntentId: linkedIntent?.id,
        idempotencyKey,
        method: 'gateway_shetab',
        gatewayRef: params.gatewayRef,
        amount: incomingMoney.toDecimal(),
        currency: settledCurrency,
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

    // FIN-106 / PAY-106: Wire verified payment to general ledger automatically (one posting per capture)
    await GeneralLedgerService.postGatewayPayment(
      {
        groupId: `wh_grp_${params.eventId}`,
        amount: incomingMoney,
        currency: settledCurrency,
        referenceId: booking.id,
        memo: `Gateway webhook capture for booking ${booking.reference || booking.id}`,
      },
      client
    );

    // FIN-107, FIN-108: Wire revenue and supplier liability derived from PriceSnapshot
    try {
      await GeneralLedgerService.wireBookingConfirmationToLedger(booking.id, client);
    } catch (err) {
      console.warn('Booking confirmation revenue realization wiring note:', err);
    }

    // Sensitive-action audit trail
    await client.auditLog.create({
      data: {
        action: 'PAYMENT_CAPTURED',
        resource: 'Payment',
        resourceId: payment.id,
        newData: JSON.stringify({
          bookingId: booking.id,
          amount: incomingMoney.toString(),
          currency: settledCurrency,
          gateway: gatewayName,
          gatewayRef: params.gatewayRef,
          eventId: params.eventId,
        }),
      },
    });

    businessMetrics.recordPaymentCaptured(gatewayName, incomingMoney.toNumber());

    return {
      processed: true,
      status: 'PROCESSED',
      paymentId: payment.id,
    };
  }

  /**
   * PAY-105: Reconcile timeout / unknown gateway results
   * Routes unknown or timed-out results to Operational Exception & Reconciliation rather than blind retry.
   */
  static async handleUnknownGatewayResult(params: {
    paymentIntentId: string;
    attemptId?: string;
    gatewayRef?: string;
    bookingId?: string;
    reason: string;
  }, tx?: Prisma.TransactionClient): Promise<{ status: 'PENDING_RECONCILIATION'; exceptionId: string }> {
    const client = tx || prisma;

    if (params.attemptId) {
      await client.paymentAttempt.update({
        where: { id: params.attemptId },
        data: {
          status: 'PENDING_CUSTOMER',
          errorMessage: `GATEWAY_UNKNOWN_OUTCOME: ${params.reason}`,
        },
      });
    }

    if (params.gatewayRef) {
      await client.gatewayTransaction.updateMany({
        where: { gatewayRef: params.gatewayRef },
        data: {
          status: 'PENDING',
          responseCode: 'TIMEOUT_UNKNOWN',
        },
      });
    }

    // Route to Operational Exception Center for reconciliation (PAY-105)
    const exceptionId = await OperationalExceptionService.raiseException({
      type: 'PAYMENT_TIMEOUT',
      severity: ExceptionSeverity.HIGH,
      entityType: 'PaymentIntent',
      entityId: params.paymentIntentId,
      title: `Gateway timeout / unknown status on intent ${params.paymentIntentId}`,
      description: `Unknown or timed out gateway result: ${params.reason}. Routed to reconciliation queue to prevent blind retries.`,
      slaMinutes: 60,
    });

    return {
      status: 'PENDING_RECONCILIATION',
      exceptionId,
    };
  }

  /**
   * PAY-108: Explicit handling of payment declines / failures to terminal state
   */
  static async handlePaymentFailure(params: {
    paymentIntentId: string;
    attemptId?: string;
    gatewayRef?: string;
    bookingId?: string;
    reason: string;
  }, tx?: Prisma.TransactionClient): Promise<{ status: 'FAILED'; reason: string }> {
    const client = tx || prisma;

    if (params.attemptId) {
      await client.paymentAttempt.update({
        where: { id: params.attemptId },
        data: {
          status: 'FAILED',
          errorMessage: params.reason,
        },
      });
    }

    await client.paymentIntent.update({
      where: { id: params.paymentIntentId },
      data: {
        status: 'FAILED',
      },
    });

    if (params.gatewayRef) {
      await client.gatewayTransaction.updateMany({
        where: { gatewayRef: params.gatewayRef },
        data: {
          status: 'FAILED',
          responseCode: 'DECLINED',
        },
      });
    }

    if (params.bookingId) {
      await client.booking.update({
        where: { id: params.bookingId },
        data: {
          paymentStatus: 'FAILED',
        },
      });

      await client.bookingStatusHistory.create({
        data: {
          bookingId: params.bookingId,
          fromStatus: 'PENDING_PAYMENT',
          toStatus: 'PENDING_PAYMENT',
          actor: 'PAYMENT_GATEWAY',
          reason: `Payment declined: ${params.reason}`,
        },
      });
    }

    businessMetrics.recordPaymentFailed('SHETAB_GATEWAY', params.reason);

    return {
      status: 'FAILED',
      reason: params.reason,
    };
  }

  /**
   * PAY-108: Payment window expiry handling to terminal VOIDED / EXPIRED state
   */
  static async handlePaymentExpiry(params: {
    paymentIntentId: string;
    bookingId?: string;
  }, tx?: Prisma.TransactionClient): Promise<{ status: 'EXPIRED' }> {
    const client = tx || prisma;

    await client.paymentIntent.update({
      where: { id: params.paymentIntentId },
      data: {
        status: 'VOIDED',
      },
    });

    if (params.bookingId) {
      await client.booking.update({
        where: { id: params.bookingId },
        data: {
          status: 'EXPIRED',
          paymentStatus: 'VOIDED',
        },
      });

      await client.bookingStatusHistory.create({
        data: {
          bookingId: params.bookingId,
          fromStatus: 'PENDING_PAYMENT',
          toStatus: 'EXPIRED',
          actor: 'SYSTEM_EXPIRY',
          reason: 'Payment authorization window expired',
        },
      });
    }

    return { status: 'EXPIRED' };
  }
}
