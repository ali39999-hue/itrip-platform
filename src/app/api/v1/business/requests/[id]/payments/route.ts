import { NextRequest, NextResponse } from 'next/server';
import { BusinessDomainService } from '@/domains/business/core/BusinessDomainService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { kind, method } = body;
    const idempotencyKey = req.headers.get('Idempotency-Key') || undefined;

    if (!kind || !method) {
      return NextResponse.json(
        { success: false, error: 'Kind and method are required', code: 'validation_error' },
        { status: 422 }
      );
    }

    const data = await BusinessDomainService.processPayment({
      requestId: id,
      kind: kind as 'deposit' | 'settlement',
      method,
      idempotencyKey,
    });

    return NextResponse.json({
      success: true,
      data,
      redirect_url: `/business/requests/${id}`,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    const status = err.code === 'invalid_transition' ? 409 : 500;
    return NextResponse.json(
      { success: false, error: err.message || 'Payment processing failed', code: err.code },
      { status }
    );
  }
}
