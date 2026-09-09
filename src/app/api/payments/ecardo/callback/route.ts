import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentDomainService } from '@/domains/payments/PaymentDomainService';
import { Money } from '@/lib/finance';
import { getAppBaseUrl } from '@/lib/runtime-url';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handleCallback(req);
}

export async function POST(req: NextRequest) {
  return handleCallback(req);
}

async function handleCallback(req: NextRequest) {
  const url = new URL(req.url);
  let txId = url.searchParams.get('transaction_id') || url.searchParams.get('txId') || url.searchParams.get('ref') || '';
  let status = (url.searchParams.get('status') || '').toLowerCase();
  let bookingId = url.searchParams.get('bookingId') || url.searchParams.get('order_id') || '';

  // Also parse form data or json if POST
  if (req.method === 'POST') {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await req.json().catch(() => ({}));
      txId = txId || json.transaction_id || json.txId || json.ref || '';
      status = (status || json.status || '').toLowerCase();
      bookingId = bookingId || json.bookingId || json.order_id || '';
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData().catch(() => null);
      if (formData) {
        txId = txId || (formData.get('transaction_id') as string) || (formData.get('ref') as string) || '';
        status = (status || (formData.get('status') as string) || '').toLowerCase();
        bookingId = bookingId || (formData.get('bookingId') as string) || (formData.get('order_id') as string) || '';
      }
    }
  }

  const baseUrl = getAppBaseUrl();

  // Find payment record matching gatewayRef
  let payment = null;
  if (txId) {
    payment = await prisma.payment.findFirst({
      where: { gatewayRef: txId },
    });
  }

  if (!payment && bookingId) {
    payment = await prisma.payment.findFirst({
      where: { bookingId },
    });
  }

  const isSuccessful = status === 'success' || status === 'completed' || status === '1' || status === 'ok' || status === 'paid';

  if (payment) {
    const resolvedBookingId = payment.bookingId || bookingId;
    if (isSuccessful && payment.status !== 'SUCCESS' && payment.status !== 'CAPTURED') {
      try {
        await PaymentDomainService.processWebhook({
          gatewayName: 'ECARDO_GATEWAY',
          eventId: `ecardo_cb_${txId}_${Date.now()}`,
          eventType: 'payment.captured',
          bookingId: resolvedBookingId,
          gatewayRef: txId || payment.gatewayRef || '',
          settledAmount: new Money(payment.amount, payment.currency),
          settledCurrency: payment.currency,
          rawPayload: { txId, status, method: req.method },
        });
      } catch (err) {
        console.error('Ecardo callback webhook processing warning:', err);
      }
    }

    return NextResponse.redirect(
      `${baseUrl}/payment-status?ref=${encodeURIComponent(txId)}&bookingId=${encodeURIComponent(resolvedBookingId)}&status=${isSuccessful ? 'success' : 'failed'}`
    );
  }

  // Fallback redirect if no existing payment was found
  return NextResponse.redirect(
    `${baseUrl}/payment-status?ref=${encodeURIComponent(txId)}&status=${isSuccessful ? 'success' : 'failed'}`
  );
}
