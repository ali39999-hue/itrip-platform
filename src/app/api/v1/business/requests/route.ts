import { NextRequest, NextResponse } from 'next/server';
import { BusinessDomainService } from '@/domains/business/core/BusinessDomainService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      packageId,
      departureId,
      paxCount,
      addonIds,
      companyName,
      nationalId,
      repName,
      repPhone,
      field,
    } = body;

    if (!packageId || !departureId || !paxCount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields', code: 'validation_error' },
        { status: 422 }
      );
    }

    const data = await BusinessDomainService.createDraftRequest({
      packageId,
      departureId,
      paxCount: Number(paxCount),
      addonIds,
      companyName,
      nationalId,
      repName,
      repPhone,
      field,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    if (err.code === 'capacity_full') {
      return NextResponse.json(
        { success: false, error: err.message, code: 'capacity_full' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to create request' },
      { status: 500 }
    );
  }
}
