import { NextRequest, NextResponse } from 'next/server';
import { BusinessDomainService } from '@/domains/business/core/BusinessDomainService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { decision, document_results, note } = body;

    if (!decision || !['approve', 'request_changes'].includes(decision)) {
      return NextResponse.json(
        { success: false, error: 'Invalid decision', code: 'validation_error' },
        { status: 422 }
      );
    }

    const data = await BusinessDomainService.reviewRequest({
      requestId: id,
      decision,
      docResults: document_results,
      note,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    const status = err.code === 'invalid_transition' ? 409 : 500;
    return NextResponse.json(
      { success: false, error: err.message || 'Review processing failed', code: err.code },
      { status }
    );
  }
}
