import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BusinessDomainService } from '@/domains/business/core/BusinessDomainService';
import { requireRequestAccess } from '../../../_lib/guard';

export async function POST(
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

    const formData = await req.formData();
    const type = (formData.get('type') as string) || 'document';
    const travelerId = (formData.get('traveler_id') as string) || null;
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File is required', code: 'validation_error' },
        { status: 422 }
      );
    }

    // Spec validation: max 5MB, format JPG/PNG/PDF
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { success: false, error: 'File exceeds 5MB limit', code: 'file_too_large' },
        { status: 422 }
      );
    }

    const doc = await prisma.businessDocument.create({
      data: {
        requestId: id,
        travelerId: travelerId || undefined,
        type,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        fileUrl: `/uploads/business/${id}/${Date.now()}_${file.name}`,
        state: 'pending',
      },
    });

    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
