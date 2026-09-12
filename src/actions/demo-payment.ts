'use server';

import { headers } from 'next/headers';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getRequestBaseUrl } from '@/lib/runtime-url';

/**
 * eCardo demo simulation (DEMO_MODE only, non-production).
 *
 * Lets testers walk the full gateway UX without real money: the simulated
 * checkout screen signs an IPN exactly like eCardo would and posts it to the
 * REAL webhook route — so HMAC verification, idempotency, capture and ledger
 * credit all run the production code path. Fails closed outside demo mode.
 */

function demoGuard(): string | null {
  // Scoped to the dedicated eCardo demo flag (or global DEMO_MODE) and always
  // hard-blocked in production — the real gateway path is never affected.
  const demoActive =
    process.env.ECARDO_DEMO_GATEWAY === 'true' || process.env.DEMO_MODE === 'true';
  if (process.env.NODE_ENV === 'production' || !demoActive) {
    return 'Demo mode is disabled on this environment';
  }
  if (!process.env.ECARDO_SECRET_KEY) {
    return 'ECARDO_SECRET_KEY is required for the demo IPN signature';
  }
  return null;
}

export async function getDemoPaymentPreview(ref: string): Promise<
  | { success: true; payment: { amount: number; currency: string; status: string; bookingId: string | null } }
  | { success: false; error: string }
> {
  const guard = demoGuard();
  if (guard) return { success: false, error: guard };
  if (!ref || typeof ref !== 'string' || ref.length > 24) return { success: false, error: 'Invalid payment reference' };

  const payment = await prisma.payment.findFirst({
    where: { gatewayRef: ref },
    select: { amount: true, currency: true, status: true, bookingId: true },
  });
  if (!payment) return { success: false, error: 'Payment not found for this reference' };

  return {
    success: true,
    payment: {
      amount: payment.amount.toNumber(),
      currency: payment.currency,
      status: payment.status,
      bookingId: payment.bookingId,
    },
  };
}

export async function simulateEcardoPayment(
  ref: string,
  outcome: 'success' | 'failed'
): Promise<{ success: boolean; error?: string; redirectUrl?: string; webhookStatus?: string }> {
  const guard = demoGuard();
  if (guard) return { success: false, error: guard };
  if (!ref || typeof ref !== 'string' || ref.length > 24) return { success: false, error: 'Invalid payment reference' };
  if (outcome !== 'success' && outcome !== 'failed') return { success: false, error: 'Invalid outcome' };

  const payment = await prisma.payment.findFirst({
    where: { gatewayRef: ref },
    select: { amount: true, currency: true, status: true, bookingId: true },
  });
  if (!payment) return { success: false, error: 'Payment not found for this reference' };
  if (payment.status !== 'PENDING') return { success: false, error: 'This payment has already been resolved' };

  // Sign exactly like the documented eCardo IPN: HMAC-SHA256(transaction_id + total_amount, secret)
  const totalAmount = payment.amount.toNumber();
  const signature = crypto.createHmac('sha256', process.env.ECARDO_SECRET_KEY!).update(`${ref}${totalAmount}`).digest('hex');
  const payload = {
    status: outcome,
    signature,
    data: { transaction_id: ref, total_amount: totalAmount, currency: payment.currency },
  };

  const headerMap = await headers();
  const base = getRequestBaseUrl(headerMap);
  const resp = await fetch(`${base}/api/payments/webhook?gateway=ecardo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  });
  const result = (await resp.json().catch(() => ({}))) as { status?: string };
  if (!resp.ok) {
    return { success: false, error: `Webhook returned HTTP ${resp.status}` };
  }

  // The capture has really happened in our ledger when the webhook says
  // PROCESSED — so 'confirmed' on the status page is a fact, not a fabrication.
  const redirectUrl =
    `/payment-status?ref=${encodeURIComponent(ref)}` +
    (payment.bookingId && !payment.bookingId.startsWith('wallet_topup_')
      ? `&bookingId=${encodeURIComponent(payment.bookingId)}`
      : '') +
    `&status=${outcome === 'success' ? 'confirmed' : 'failed'}`;

  return { success: true, webhookStatus: result.status, redirectUrl };
}
