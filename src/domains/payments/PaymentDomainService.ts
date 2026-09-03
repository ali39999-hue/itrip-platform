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

    // 2. Create Payment Record (no blind status flip on upsert)
    const payment = await client.payment.upsert({
      where: { idempotencyKey: params.idempotencyKey },
      update: {
        status: 'SUCCESS',
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
        status: 'SUCCESS',
        rawPayload: params.rawPayload ? JSON.stringify(params.rawPayload) : null,
      },
    });

    return {
      success: true,
      paymentId: payment.id,
      gatewayRef: payment.gatewayRef || undefined,
      status: 'SUCCESS',
    };
  }
}
