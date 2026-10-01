import { NextRequest, NextResponse } from 'next/server';
import { BusinessDomainService } from '@/domains/business/core/BusinessDomainService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const idempotencyKey = req.headers.get('Idempotency-Key') || undefined;

    const data = await BusinessDomainService.submitRequest(id, {
      termsAccepted: Boolean(body?.terms_accepted),
      idempotencyKey,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    const status = err.code === 'invalid_transition' ? 409 : 500;
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to submit request', code: err.code },
      { status }
    );
  }
}
