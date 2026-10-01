import { NextRequest, NextResponse } from 'next/server';
import { BusinessDomainService } from '@/domains/business/core/BusinessDomainService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const destination = searchParams.get('destination') || undefined;
    const goal = searchParams.get('goal') || undefined;

    const data = await BusinessDomainService.listPackages({ destination, goal });
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch packages';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
