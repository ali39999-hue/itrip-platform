import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BusinessDomainService } from '@/domains/business/core/BusinessDomainService';
import { verifyBusinessPaymentCallback } from '@/domains/payments/callback-security';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { payment_id, status } = body;

    if (!payment_id) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is required', code: 'validation_error' },
        { status: 422 }
      );
    }

    // Roadmap §21 / Gate E: the result callback is authoritative and must be
    // signed. An unsigned callback can never confirm a payment — fail closed.
    const signature = req.headers.get('x-business-signature');
    if (!verifyBusinessPaymentCallback(signature, payment_id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid callback signature', code: 'invalid_signature' },
        { status: 403 }
      );
    }

    const payment = await prisma.businessPayment.findUnique({
      where: { id: payment_id },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found', code: 'not_found' },
        { status: 404 }
      );
    }

    // Idempotency: an already-settled or already-failed payment is never
    // re-processed by a replayed callback.
    if (payment.status !== 'pending') {
      return NextResponse.json(
        {
          success: true,
          data: { paymentId: payment.id, status: payment.status, reconciled: true },
        },
        { status: 200 }
      );
    }

    if (status === 'success') {
      const data = await BusinessDomainService.processPayment({
        requestId: payment.requestId,
        kind: payment.kind as 'deposit' | 'settlement',
        method: payment.method,
        idempotencyKey: payment.idempotencyKey || undefined,
      });

      return NextResponse.json({ success: true, data });
    }

    // Failed payment
    await prisma.businessPayment.update({
      where: { id: payment_id },
      data: { status: 'failed' },
    });

    return NextResponse.json({
      success: false,
      error: 'Payment failed at gateway',
      code: 'payment_failed',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Callback processing failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
