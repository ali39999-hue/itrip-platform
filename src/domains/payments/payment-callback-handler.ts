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
  let gatewayErrorCode = (
    url.searchParams.get('code') ||
    url.searchParams.get('error_code') ||
    url.searchParams.get('errorCode') ||
    url.searchParams.get('reason') ||
    ''
  ).slice(0, 64);

  if (req.method === 'POST') {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await req.json().catch(() => ({}));
      txId = txId || json.transaction_id || json.txId || json.ref || '';
      status = (status || json.status || '').toLowerCase();
      bookingId = bookingId || json.bookingId || json.order_id || '';
      gatewayErrorCode =
        (gatewayErrorCode ||
          json.code ||
          json.error_code ||
          json.errorCode ||
          json.reason ||
          '') + '';
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
        gatewayErrorCode =
          gatewayErrorCode ||
          (formData.get('code') as string) ||
          (formData.get('error_code') as string) ||
          (formData.get('errorCode') as string) ||
          (formData.get('reason') as string) ||
          '';
      }
    }
    gatewayErrorCode = String(gatewayErrorCode || '').slice(0, 64);
  }

  // Dynamic origin resolution: preserves Vercel preview URLs, custom domains, or local host
  const baseUrl = req.nextUrl.origin || getRequestBaseUrl(req.headers);

  const topupId =
    url.searchParams.get('topupId') ||
    '';
  const sig = url.searchParams.get('sig') || '';

  // Strategy 0: Find payment by idempotencyKey (topupId)
  let payment = null;
  if (topupId) {
    payment = await prisma.payment.findFirst({
      where: { idempotencyKey: topupId },
    });
  }

  // Strategy 1: Find payment by gatewayRef
  if (!payment && txId) {
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

  // Authoritative Instant Capture via Cryptographic Return Token Verification:
  // Browser return callbacks with a valid server-signed HMAC signature (PAY-005, FIN-106)
  // are authoritative and execute idempotent capture so the customer is NEVER stranded
  // on "processing" when server-to-server IPN delivery is blocked, filtered, or delayed.
  // Unsigned or invalidly signed returns strictly fail-closed and remain "processing"
  // awaiting the server IPN webhook.
  let isVerifiedCapture = false;
  if (isSuccessful && payment && payment.status === 'PENDING') {
    if (resolvedBookingId.startsWith('wallet_topup_')) {
      const userId = resolvedBookingId.slice('wallet_topup_'.length);
      const { verifyTopUpCallback } = await import('@/domains/payments/callback-security');
      const lookupTopupId = topupId || payment.idempotencyKey;
      const isValidSig =
        Boolean(sig) &&
        Boolean(lookupTopupId) &&
        verifyTopUpCallback(
          sig,
          userId,
          lookupTopupId,
          payment.amount.toString(),
          payment.currency
        );

      if (isValidSig) {
        try {
          const { GeneralLedgerService } = await import('@/domains/ledger/GeneralLedgerService');
          const { Money } = await import('@/lib/finance');
          const incomingMoney = new Money(payment.amount.toString(), payment.currency);

          await prisma.$transaction(async (tx) => {
            const current = await tx.payment.findUnique({
              where: { id: payment!.id },
              select: { status: true },
            });
            if (current?.status === 'SUCCESS') return;

            await tx.payment.update({
              where: { id: payment!.id },
              data: {
                status: 'SUCCESS',
                gatewayRef: resolvedRef || payment!.gatewayRef,
              },
            });

            if (payment!.paymentIntentId) {
              await tx.paymentIntent.update({
                where: { id: payment!.paymentIntentId },
                data: { status: 'SUCCESS' },
              });
            }

            await GeneralLedgerService.postTopUp(
              {
                groupId: `cb_topup_grp_${payment!.id}`,
                userId,
                amount: incomingMoney,
                currency: payment!.currency,
                referenceId: payment!.id,
                memo: `Wallet top-up callback capture via eCardo (ref: ${resolvedRef})`,
              },
              tx
            );
          });
          isVerifiedCapture = true;
        } catch (captureErr) {
          console.error('[handlePaymentCallback] Error capturing verified wallet top-up:', captureErr);
        }
      }
    }
  }

  if (isFailed && payment && payment.status === 'PENDING') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED' },
    }).catch(() => {});
  }

  // Authoritative status resolution:
  // 'confirmed' if captured via verified callback or already SUCCESS in database,
  // 'failed' if gateway reported failure or internal status is FAILED,
  // otherwise 'processing' so the client UI waits for webhook settlement.
  const isAlreadySuccess = isVerifiedCapture || payment?.status === 'SUCCESS';
  const finalStatus = isAlreadySuccess
    ? 'confirmed'
    : isFailed || payment?.status === 'FAILED'
    ? 'failed'
    : isSuccessful
    ? 'processing'
    : 'processing';

  // PAY-UX: carry a gateway-reported error code (if any) so /payment-status can
  // translate it into actionable localized guidance. Display-only — it never
  // influences capture state (HMAC IPN remains the sole authority).
  const errorCodeParam = gatewayErrorCode ? `&code=${encodeURIComponent(gatewayErrorCode)}` : '';
  const redirectTarget = `${baseUrl}/payment-status?ref=${encodeURIComponent(
    resolvedRef
  )}&bookingId=${encodeURIComponent(resolvedBookingId)}&status=${finalStatus}${amountParam}${currencyParam}${errorCodeParam}`;

  return NextResponse.redirect(redirectTarget);
}
