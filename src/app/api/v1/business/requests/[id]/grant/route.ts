import { NextRequest, NextResponse } from 'next/server';
import { BusinessDomainService } from '@/domains/business/core/BusinessDomainService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { grant_amount } = body;

    if (grant_amount === undefined || typeof grant_amount !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Grant amount is required', code: 'validation_error' },
        { status: 422 }
      );
    }

    const data = await BusinessDomainService.applyGrant(id, grant_amount);
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to apply grant';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
