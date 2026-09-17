import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyVoucherToken } from '@/domains/booking/VoucherService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const ref = searchParams.get('ref');

  let verifiedPayload: { ref: string; bookingId: string; pnr?: string | null; exp: number } | null = null;
  let tokenError: string | null = null;

  if (token) {
    const res = verifyVoucherToken(token);
    if (res.valid && res.payload) {
      verifiedPayload = res.payload;
    } else {
      tokenError = res.error || 'invalid_token';
    }
  }

  if (tokenError === 'expired') {
    return NextResponse.json(
      { valid: false, state: 'EXPIRED', error: 'Verification token expired' },
      { status: 410 }
    );
  }

  if (tokenError) {
    return NextResponse.json(
      { valid: false, state: 'INVALID_SIGNATURE', error: 'Invalid or tampered token' },
      { status: 400 }
    );
  }

  const queryRef = verifiedPayload?.ref || ref;
  const queryId = verifiedPayload?.bookingId;

  if (!queryRef && !queryId) {
    return NextResponse.json(
      { valid: false, state: 'MISSING_PARAMS', error: 'Token or booking reference is required' },
      { status: 400 }
    );
  }

  const booking = await prisma.booking.findFirst({
    where: {
      OR: [
        ...(queryRef ? [{ reference: queryRef }] : []),
        ...(queryId ? [{ id: queryId }] : []),
      ],
    },
    include: {
      customer: { select: { name: true } },
      items: true,
    },
  });

  if (!booking) {
    return NextResponse.json(
      { valid: false, state: 'NOT_FOUND', error: 'Booking not found' },
      { status: 404 }
    );
  }

  if (booking.status === 'CANCELLED' || booking.status === 'REFUNDED') {
    return NextResponse.json({
      valid: false,
      state: 'REVOKED',
      reference: booking.reference,
      status: booking.status,
      message: 'Voucher was revoked due to booking cancellation or refund.',
    });
  }

  if (booking.status === 'FAILED') {
    return NextResponse.json({
      valid: false,
      state: 'INVALID',
      reference: booking.reference,
      status: booking.status,
      message: 'Booking failed; voucher is invalid.',
    });
  }

  const isConfirmed =
    (booking.status === 'CONFIRMED' || booking.status === 'ISSUED' || booking.status === 'COMPLETED') &&
    booking.paymentStatus === 'PAID';

  if (!isConfirmed) {
    return NextResponse.json({
      valid: false,
      state: 'PENDING',
      reference: booking.reference,
      status: booking.status,
      message: 'Booking is awaiting payment or supplier confirmation.',
    });
  }

  return NextResponse.json({
    valid: true,
    state: 'VALID',
    reference: booking.reference,
    serviceType: booking.items[0]?.type || 'TRAVEL',
    travelDate: booking.travelDate || null,
    customerName: booking.customer?.name || null,
    confirmedAt: booking.updatedAt || booking.createdAt,
  });
}
