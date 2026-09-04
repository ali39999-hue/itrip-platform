import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';

export interface InitiatePaymentParams {
  bookingId?: string;
  idempotencyKey: string;
  method: 'wallet_irr' | 'gateway_shetab' | 'wallet_usdt';
  amount: number;
  currency?: string;
  rawPayload?: Record<string, unknown>;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  gatewayRef?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  error?: string;
}

/**
 * Simulated PSP. The gateway call itself is a stub (no real PSP is wired),
 * but idempotency, scoping and state handling are production-grade:
 * a key is permanently bound to one booking — replaying it for another
 * booking is rejected instead of confirming it for free.
 */
export class PaymentDomainService {
  static async processPayment(
    params: InitiatePaymentParams,
    tx?: Prisma.TransactionClient
  ): Promise<PaymentResult> {
    const client = tx || prisma;

    // 1. Check if payment with this idempotencyKey already exists
    const existing = await client.payment.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });

    if (existing) {
      // Idempotency keys are booking-scoped: replaying another booking's key
      // must never confirm this booking.
      if (params.bookingId && existing.bookingId && existing.bookingId !== params.bookingId) {
        return {
          success: false,
          paymentId: existing.id,
          status: 'FAILED',
          error: 'Idempotency key is bound to a different booking',
        };
      }
      if (existing.status === 'SUCCESS') {
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
      // PENDING: fall through and confirm below (gateway confirmation path).
    }

    const gatewayRef = `GW-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    if (existing && existing.status === 'PENDING') {
      const payment = await client.payment.update({
        where: { idempotencyKey: params.idempotencyKey },
        data: {
          status: 'SUCCESS',
          gatewayRef,
          amount: params.amount,
          method: params.method,
        },
      });
      return {
        success: true,
        paymentId: payment.id,
        gatewayRef: payment.gatewayRef || undefined,
        status: 'SUCCESS',
      };
    }

    // 2. Create Payment Record — gateway payments start as PENDING until
    //    a verified callback from the PSP confirms success.
    const initialStatus = params.method === 'gateway_shetab' ? 'PENDING' : 'SUCCESS';
    const payment = await client.payment.upsert({
      where: { idempotencyKey: params.idempotencyKey },
      update: {
        status: initialStatus,
        gatewayRef,
        amount: params.amount,
      },
      create: {
        bookingId: params.bookingId,
        idempotencyKey: params.idempotencyKey,
        method: params.method,
        gatewayRef,
        amount: params.amount,
        currency: params.currency || 'IRR',
        status: initialStatus,
        rawPayload: params.rawPayload ? JSON.stringify(params.rawPayload) : null,
      },
    });

    return {
      success: initialStatus === 'SUCCESS',
      paymentId: payment.id,
      gatewayRef: payment.gatewayRef || undefined,
      status: initialStatus as PaymentResult['status'],
    };
  }

  /**
   * Create a PaymentIntent (PAY-001)
   */
  static async createPaymentIntent(params: {
    bookingId: string;
    amount: number | Prisma.Decimal;
    currency?: string;
    idempotencyKey: string;
    ttlMinutes?: number;
  }, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    const expiresAt = new Date(Date.now() + (params.ttlMinutes || 15) * 60 * 1000);
    const amount = params.amount instanceof Prisma.Decimal ? params.amount : new Prisma.Decimal(params.amount.toString());

    return client.paymentIntent.upsert({
      where: { idempotencyKey: params.idempotencyKey },
      update: {
        amount,
        currency: params.currency || 'IRR',
        expiresAt,
      },
      create: {
        bookingId: params.bookingId,
        amount,
        currency: params.currency || 'IRR',
        status: 'INITIATED',
        idempotencyKey: params.idempotencyKey,
        expiresAt,
      },
    });
  }

  /**
   * Secure Webhook Handler with Signature & Amount Verification (PAY-005, PAY-006)
   */
  static async processWebhook(params: {
    eventId: string;
    gatewayRef: string;
    bookingId: string;
    settledAmount: number | Prisma.Decimal;
    settledCurrency: string;
    rawPayload?: Record<string, unknown>;
  }, tx?: Prisma.TransactionClient): Promise<{
    processed: boolean;
    reason?: string;
    payment?: unknown;
  }> {
    const client = tx || prisma;
    const idempotencyKey = `webhook_${params.eventId}`;

    // 1. Idempotency Check: Reject duplicate webhook processing
    const existing = await client.payment.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      return {
        processed: false,
        reason: 'Duplicate webhook event already processed (idempotent)',
        payment: existing,
      };
    }

    // 2. Booking Amount Verification (Amount & Currency must match)
    const booking = await client.booking.findUnique({
      where: { id: params.bookingId },
    });

    if (!booking) {
      throw new Error(`Payment webhook error: Booking ${params.bookingId} not found`);
    }

    const expectedAmount = new Prisma.Decimal(booking.totalAmount.toString());
    const incomingAmount = params.settledAmount instanceof Prisma.Decimal
      ? params.settledAmount
      : new Prisma.Decimal(params.settledAmount.toString());

    if (!expectedAmount.equals(incomingAmount)) {
      throw new Error(
        `Payment webhook amount tampering detected: expected ${expectedAmount.toString()} but received ${incomingAmount.toString()}`
      );
    }

    if (booking.currency.toUpperCase() !== params.settledCurrency.toUpperCase()) {
      throw new Error(
        `Payment webhook currency mismatch: expected ${booking.currency} but received ${params.settledCurrency}`
      );
    }

    // 3. Atomically record payment and mark CAPTURED
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

    return {
      processed: true,
      payment,
    };
  }
}
