import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentDomainService } from '@/domains/payments/PaymentDomainService';
import { RateLimiter } from '@/lib/security/rate-limiter';
import { createLogger } from '@/lib/observability/logger';
import { Money } from '@/lib/finance';

export const dynamic = 'force-dynamic';

/**
 * Authoritative Payment Webhook Handler (PAY-005, PAY-006, PAY-007)
 * Strictly fails closed on missing signatures, tampered amounts, or replay attacks.
 * Supports both POST and GET IPN methods per official documentation guidelines.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!rawBody) {
    return NextResponse.json({ error: 'Empty payload' }, { status: 400 });
  }
  return processWebhookRequest(req, rawBody);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const searchParams = url.searchParams;

  // Reconstruct GET IPN data structure per official doc example:
  // e.g. ?status=success&signature=...&data[transaction_id]=...&data[total_amount]=...
  const txId =
    searchParams.get('data[transaction_id]') ||
    searchParams.get('transaction_id') ||
    searchParams.get('txId') ||
    '';
  const totalAmt =
    searchParams.get('data[total_amount]') ||
    searchParams.get('total_amount') ||
    searchParams.get('amount') ||
    '';
  const currency =
    searchParams.get('data[currency]') ||
    searchParams.get('currency') ||
    'USD';
  const status = searchParams.get('status') || 'success';
  const signature = searchParams.get('signature') || '';

  const reconstructedPayload: Record<string, unknown> = {
    status,
    signature,
    gateway: searchParams.get('gateway') || 'ecardo',
    data: {
      transaction_id: txId,
      total_amount: totalAmt,
      currency,
    },
    transaction_id: txId,
    amount: totalAmt,
    currency,
  };

  const rawBody = JSON.stringify(reconstructedPayload);
  return processWebhookRequest(req, rawBody, signature);
}

async function processWebhookRequest(req: NextRequest, rawBody: string, overrideSignature?: string) {
  // Hoisted for the error path: the catch block logs correlation even when the
  // failure happens before/inside parsing.
  let logEventId = '';
  let logBookingId = '';
  let logGateway = 'SHETAB_GATEWAY';

  try {
    // Rate limit check (Section 35)
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'webhook_caller';
    const allowed = await RateLimiter.checkWebhookRateLimit(clientIp);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // --- eCardo IPN normalization (official doc: {status, signature, data:{transaction_id, total_amount, ...}}) ---
    // eCardo sends no top-level bookingId/amount; resolve them from the nested
    // `data` object and our own payment record keyed by transaction_id.
    const isEcardoIpn =
      new URL(req.url).searchParams.get('gateway') === 'ecardo' ||
      (payload.signature !== undefined && payload.data && typeof payload.data === 'object');

    let gatewayName = req.headers.get('x-gateway') || (payload.gatewayName as string | undefined) || 'SHETAB_GATEWAY';
    let bookingId = String(payload.bookingId || '');
    let gatewayRef = String(payload.gatewayRef || payload.referenceId || '');
    let settledAmountRaw: unknown = payload.settledAmount ?? payload.amount ?? 0;
    let settledCurrency = String(payload.settledCurrency || payload.currency || 'IRR');

    if (isEcardoIpn) {
      gatewayName = 'ECARDO_GATEWAY';
      const data = (payload.data && typeof payload.data === 'object' ? payload.data : payload) as Record<string, unknown>;
      const txId = String(data.transaction_id || payload.transaction_id || '');
      gatewayRef = gatewayRef || txId;

      if (!bookingId && txId) {
        const payment = await prisma.payment.findFirst({
          where: { gatewayRef: txId },
          select: { bookingId: true, amount: true, currency: true },
        });
        if (payment?.bookingId) {
          bookingId = payment.bookingId;
        }
      }

      settledAmountRaw = data.total_amount ?? settledAmountRaw;
      settledCurrency = String(data.currency || settledCurrency);
    }

    // Extract security headers
    const signature =
      overrideSignature ||
      req.headers.get('x-signature') ||
      req.headers.get('x-shaparak-signature') ||
      (payload.signature as string | undefined);
    const timestampHeader = req.headers.get('x-timestamp') || req.headers.get('x-shaparak-timestamp');
    const timestamp = timestampHeader ? parseInt(timestampHeader, 10) : Number(payload.timestamp) || Date.now();

    const eventId = String(payload.eventId || payload.id || (isEcardoIpn ? `ecardo_${gatewayRef}` : `evt_${Date.now()}`));
    logEventId = eventId;
    logGateway = gatewayName;
    const eventType = String(payload.eventType || payload.type || 'payment.captured');

    const settledAmount = settledAmountRaw;
    const merchantId = (payload.merchantId as string | undefined) || req.headers.get('x-merchant-id') || undefined;

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId in webhook payload' }, { status: 400 });
    }
    logBookingId = bookingId;

    const result = await PaymentDomainService.processWebhook({
      gatewayName,
      eventId,
      eventType,
      bookingId,
      gatewayRef,
      settledAmount: new Money(String(settledAmount), settledCurrency),
      settledCurrency,
      signature,
      timestamp,
      merchantId,
      rawPayload: payload,
      rawBody,
    });

    return NextResponse.json({
      status: result.status,
      processed: result.processed,
      paymentId: result.paymentId,
    }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // OBS-003: structured, machine-searchable webhook errors (OBS-004 redaction
    // ensures any payload fragments logged as fields can never leak secrets).
    createLogger('payment-webhook', logEventId || undefined).error(
      'Webhook processing failed',
      { error: message, bookingId: logBookingId, gatewayName: logGateway }
    );

    if (message.includes('WEBHOOK_FAIL_CLOSED') || message.includes('signature') || message.includes('replay')) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.includes('tampering') || message.includes('mismatch')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal payment webhook error' }, { status: 500 });
  }
}
