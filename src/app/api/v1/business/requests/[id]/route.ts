import { NextRequest, NextResponse } from 'next/server';
import { BusinessDomainService } from '@/domains/business/core/BusinessDomainService';
import { requireRequestAccess } from '../../_lib/guard';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ownership = await BusinessDomainService.getRequestOwnership(id);
    if (!ownership) {
      return NextResponse.json(
        { success: false, error: 'Request not found', code: 'not_found' },
        { status: 404 }
      );
    }
    const denied = await requireRequestAccess(ownership);
    if (denied) return denied;

    const data = await BusinessDomainService.getRequestDetail(id);
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ownership = await BusinessDomainService.getRequestOwnership(id);
    if (!ownership) {
      return NextResponse.json(
        { success: false, error: 'Request not found', code: 'not_found' },
        { status: 404 }
      );
    }
    const denied = await requireRequestAccess(ownership);
    if (denied) return denied;

    const body = await req.json();

    const data = await BusinessDomainService.updateDraftRequest(id, body);
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    const status = err.code === 'invalid_transition' ? 409 : 500;
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update request', code: err.code },
      { status }
    );
  }
}
