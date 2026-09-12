import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequestBaseUrl } from '@/lib/runtime-url';
import { GeneralLedgerService } from '@/domains/ledger/GeneralLedgerService';
import { Money } from '@/lib/finance';

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

  // Dual-Confirmation Capture Execution:
  // If gateway reported success and our internal payment record is still PENDING,
  // capture it atomically right now to guarantee the customer never sees "stuck" state.
  if (isSuccessful && payment && payment.status === 'PENDING') {
    try {
      if (resolvedBookingId.startsWith('wallet_topup_')) {
        // A) Wallet Top-Up Capture
        const userId = resolvedBookingId.slice('wallet_topup_'.length);
        const incomingMoney = new Money(payment.amount.toString(), payment.currency);

        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: 'SUCCESS' },
          });

          if (payment.paymentIntentId) {
            await tx.paymentIntent.update({
              where: { id: payment.paymentIntentId },
              data: { status: 'SUCCESS' },
            });
          }

          await GeneralLedgerService.postTopUp(
            {
              groupId: `cb_topup_grp_${payment.id}`,
              userId,
              amount: incomingMoney,
              currency: payment.currency,
              referenceId: payment.id,
              memo: `Wallet top-up callback capture via eCardo (ref: ${resolvedRef})`,
            },
            tx
          );
        });
      } else if (resolvedBookingId) {
        // B) Booking Capture
        const booking = await prisma.booking.findUnique({
          where: { id: resolvedBookingId },
        });

        if (booking && !['EXPIRED', 'CANCELLED', 'REFUNDED'].includes(booking.status)) {
          const incomingMoney = new Money(payment.amount.toString(), payment.currency);

          await prisma.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: payment.id },
              data: { status: 'SUCCESS' },
            });

            if (payment.paymentIntentId) {
              await tx.paymentIntent.update({
                where: { id: payment.paymentIntentId },
                data: { status: 'SUCCESS' },
              });
            }

            await tx.booking.update({
              where: { id: booking.id },
              data: {
                paymentStatus: 'CAPTURED',
                status: 'CONFIRMED',
              },
            });

            await tx.bookingStatusHistory.create({
              data: {
                bookingId: booking.id,
                fromStatus: booking.status,
                toStatus: 'CONFIRMED',
                actor: 'GATEWAY_CALLBACK',
                reason: `Payment confirmed via eCardo browser callback (ref: ${resolvedRef})`,
                correlationId: `corr_cb_${payment.id}`,
              },
            });

            await GeneralLedgerService.postGatewayPayment(
              {
                groupId: `cb_grp_${payment.id}`,
                amount: incomingMoney,
                currency: payment.currency,
                referenceId: booking.id,
                memo: `Gateway callback capture for booking ${booking.reference || booking.id}`,
              },
              tx
            );

            try {
              await GeneralLedgerService.wireBookingConfirmationToLedger(booking.id, tx);
            } catch (e) {
              console.warn('Callback revenue realization note:', e);
            }
          });
        }
      }
    } catch (captureErr) {
      console.error('Error executing dual-confirmation capture in callback:', captureErr);
    }
  } else if (isFailed && payment && payment.status === 'PENDING') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED' },
    }).catch(() => {});
  }

  // Canonical status query: 'confirmed' or 'failed'
  const isAlreadySuccess = payment?.status === 'SUCCESS';
  const finalStatus = (isSuccessful || isAlreadySuccess) ? 'confirmed' : isFailed ? 'failed' : 'processing';

  const redirectTarget = `${baseUrl}/payment-status?ref=${encodeURIComponent(
    resolvedRef
  )}&bookingId=${encodeURIComponent(resolvedBookingId)}&status=${finalStatus}${amountParam}${currencyParam}`;

  return NextResponse.redirect(redirectTarget);
}
