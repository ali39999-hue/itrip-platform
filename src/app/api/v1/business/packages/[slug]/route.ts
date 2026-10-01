import { NextRequest, NextResponse } from 'next/server';
import { BusinessDomainService } from '@/domains/business/core/BusinessDomainService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const data = await BusinessDomainService.getPackageBySlug(slug);

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Package not found', code: 'not_found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch package';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
