import { NextRequest, NextResponse } from 'next/server';
import { PaymentDomainService } from '@/domains/payments/PaymentDomainService';
import { RateLimiter } from '@/lib/security/rate-limiter';
import { createLogger } from '@/lib/observability/logger';

export const dynamic = 'force-dynamic';

/**
 * Authoritative Payment Webhook Handler (PAY-005, PAY-006, PAY-007)
 * Strictly fails closed on missing signatures, tampered amounts, or replay attacks.
 */
export async function POST(req: NextRequest) {
  // Hoisted for the error path: the catch block logs correlation even when the
  // failure happens before/inside parsing.
  let logEventId = '';
  let logBookingId = '';
  let logGateway = 'SHETAB_GATEWAY';

  try {
    const rawBody = await req.text();
    if (!rawBody) {
      return NextResponse.json({ error: 'Empty payload' }, { status: 400 });
    }

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

    // Extract security headers
    const signature = req.headers.get('x-signature') || req.headers.get('x-shaparak-signature') || (payload.signature as string | undefined);
    const timestampHeader = req.headers.get('x-timestamp') || req.headers.get('x-shaparak-timestamp');
    const timestamp = timestampHeader ? parseInt(timestampHeader, 10) : Number(payload.timestamp) || Date.now();
    const gatewayName = req.headers.get('x-gateway') || (payload.gatewayName as string | undefined) || 'SHETAB_GATEWAY';

    const eventId = String(payload.eventId || payload.id || `evt_${Date.now()}`);
    logEventId = eventId;
    logGateway = gatewayName;
    const eventType = String(payload.eventType || payload.type || 'payment.captured');
    const bookingId = String(payload.bookingId || '');
    const gatewayRef = String(payload.gatewayRef || payload.referenceId || '');
    const settledAmount = payload.settledAmount ?? payload.amount ?? 0;
    const settledCurrency = String(payload.settledCurrency || payload.currency || 'IRR');
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
      settledAmount: String(settledAmount),
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
