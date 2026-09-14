import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Read-only payment settlement probe for the /payment-status page.
 *
 * After a gateway browser return, the page polls here while the HMAC-signed
 * IPN webhook is the capture authority — this endpoint NEVER mutates state,
 * it only reports what the database already knows.
 */
export async function GET(req: NextRequest) {
  const ref = (req.nextUrl.searchParams.get('ref') || '').trim();
  const bookingId = (req.nextUrl.searchParams.get('bookingId') || '').trim();

  if (!ref && !bookingId) {
    return NextResponse.json({ success: false, error: 'ref or bookingId required' }, { status: 400 });
  }

  try {
    let payment = null;
    if (ref) {
      payment = await prisma.payment.findFirst({
        where: { gatewayRef: ref },
        orderBy: { createdAt: 'desc' },
        select: { status: true, amount: true, currency: true },
      });
    }
    if (!payment) {
      payment = await prisma.payment.findFirst({
        where: {
          OR: [
            ...(bookingId ? [{ bookingId }] : []),
            ...(ref ? [{ bookingId: ref }] : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
        select: { status: true, amount: true, currency: true },
      });
    }

    if (!payment) {
      return NextResponse.json({ success: true, status: 'UNKNOWN' });
    }

    return NextResponse.json({
      success: true,
      status: payment.status,
      amount: payment.amount !== null && payment.amount !== undefined ? Number(payment.amount) : null,
      currency: payment.currency ?? null,
    });
  } catch {
    // Read-only probe must never leak DB errors to the client — report unknown.
    return NextResponse.json({ success: true, status: 'UNKNOWN' });
  }
}
