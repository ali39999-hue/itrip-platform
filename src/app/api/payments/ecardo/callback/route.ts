import { NextRequest } from 'next/server';
import { handlePaymentCallback } from '@/domains/payments/payment-callback-handler';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handlePaymentCallback(req);
}

export async function POST(req: NextRequest) {
  return handlePaymentCallback(req);
}
