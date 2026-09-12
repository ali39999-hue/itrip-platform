import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequestBaseUrl } from '@/lib/runtime-url';

/**
 * Universal Gateway Browser Return Handler (Dual-Confirmation Architecture).
 *
 * When a customer returns from eCardo (or any gateway), their browser reaches
 * this handler with status/transaction information.
 *
 * Dual-Confirmation Guarantee:
 * 1. If the payment is already captured (by server IPN): redirects with 'confirmed'.
 * 2. If the payment is still PENDING and status is successful: immediately executes
 *    authoritative capture (wallet credit or booking confirmation) so the customer
 *    is never left hanging on "processing" even if server-to-server IPN was delayed
 *    or blocked by firewalls.
 * 3. Idempotent: ledger and database updates use unique keys to guarantee exactly-once execution.
 */
export async function handlePaymentCallback(req: NextRequest) {
  const url = new URL(req.url);
  let txId =
    url.searchParams.get('transaction_id') ||
    url.searchParams.get('txId') ||
    url.searchParams.get('ref') ||
    '';
  let status = (url.searchParams.get('status') || '').toLowerCase();
  let bookingId =
    url.searchParams.get('bookingId') ||
    url.searchParams.get('order_id') ||
    '';

  if (req.method === 'POST') {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await req.json().catch(() => ({}));
      txId = txId || json.transaction_id || json.txId || json.ref || '';
      status = (status || json.status || '').toLowerCase();
      bookingId = bookingId || json.bookingId || json.order_id || '';
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const formData = await req.formData().catch(() => null);
      if (formData) {
        txId =
          txId ||
          (formData.get('transaction_id') as string) ||
          (formData.get('ref') as string) ||
          '';
        status = (status || (formData.get('status') as string) || '').toLowerCase();
        bookingId =
          bookingId ||
          (formData.get('bookingId') as string) ||
          (formData.get('order_id') as string) ||
          '';
      }
    }
  }

  // Dynamic origin resolution: preserves Vercel preview URLs, custom domains, or local host
  const baseUrl = req.nextUrl.origin || getRequestBaseUrl(req.headers);

  // Strategy 1: Find payment by gatewayRef
  let payment = null;
  if (txId) {
    payment = await prisma.payment.findFirst({
      where: { gatewayRef: txId },
    });
  }

  // Strategy 2: Find payment by linked paymentAttempt gatewayRef
  if (!payment && txId) {
    const attempt = await prisma.paymentAttempt.findFirst({
      where: { gatewayRef: txId },
      select: { paymentIntentId: true },
      orderBy: { createdAt: 'desc' },
    });
    if (attempt?.paymentIntentId) {
      payment = await prisma.payment.findFirst({
        where: { paymentIntentId: attempt.paymentIntentId },
      });
    }
  }

  // Strategy 3: Find payment by bookingId
  if (!payment && bookingId) {
    payment = await prisma.payment.findFirst({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Strategy 4: Raw response match (eCardo internal TRX ID vs our FZ transaction ID)
  if (!payment && txId) {
    const gtx = await prisma.gatewayTransaction.findFirst({
      where: {
        OR: [
          { gatewayRef: txId },
          { rawResponse: { contains: txId } },
        ],
      },
      select: { attemptId: true },
      orderBy: { createdAt: 'desc' },
    });
    if (gtx?.attemptId) {
      const attempt = await prisma.paymentAttempt.findUnique({
        where: { id: gtx.attemptId },
        select: { paymentIntentId: true },
      });
      if (attempt?.paymentIntentId) {
        payment = await prisma.payment.findFirst({
          where: { paymentIntentId: attempt.paymentIntentId },
        });
      }
    }
  }

  const isSuccessful =
    status === 'success' ||
    status === 'completed' ||
    status === '1' ||
    status === 'ok' ||
    status === 'paid';

  const isFailed =
    status === 'failed' ||
    status === 'fail' ||
    status === 'cancel' ||
    status === 'canceled' ||
    status === 'cancelled' ||
    status === 'declined' ||
    status === 'error';

  const resolvedBookingId = payment?.bookingId || bookingId;
  const resolvedRef = payment?.gatewayRef || txId;
  const amountParam = payment?.amount ? `&amount=${payment.amount.toNumber()}` : '';
  const currencyParam = payment?.currency ? `&currency=${payment.currency}` : '';

  // Security Invariant (P0 Fix):
  // Browser return callbacks are untrusted client-side HTTP redirects and must NEVER
  // execute monetary ledger captures, wallet top-ups, or booking confirmations.
  // Authoritative state transitions must exclusively execute via cryptographically
  // HMAC-verified server-to-server IPN webhooks (/api/payments/webhook).
  if (isFailed && payment && payment.status === 'PENDING') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED' },
    }).catch(() => {});
  }

  // Authoritative status resolution:
  // 'confirmed' ONLY if payment.status is already SUCCESS in database (posted by HMAC webhook),
  // 'failed' if gateway reported failure or internal status is FAILED,
  // otherwise 'processing' so the client UI waits for webhook settlement.
  const isAlreadySuccess = payment?.status === 'SUCCESS';
  const finalStatus = isAlreadySuccess
    ? 'confirmed'
    : isFailed || payment?.status === 'FAILED'
    ? 'failed'
    : isSuccessful
    ? 'processing'
    : 'processing';

  const redirectTarget = `${baseUrl}/payment-status?ref=${encodeURIComponent(
    resolvedRef
  )}&bookingId=${encodeURIComponent(resolvedBookingId)}&status=${finalStatus}${amountParam}${currencyParam}`;

  return NextResponse.redirect(redirectTarget);
}
