import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const voucher = await prisma.businessVoucher.findUnique({
      where: { code },
      include: {
        request: {
          include: {
            departure: { include: { package: true } },
            company: true,
          },
        },
      },
    });

    if (!voucher || voucher.revokedAt) {
      return NextResponse.json(
        { success: false, error: 'Voucher not found or revoked', valid: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        code: voucher.code,
        issuedAt: voucher.issuedAt.toISOString(),
        companyName: voucher.request.company.name,
        packageTitle: voucher.request.departure.package.title,
        departureDate: voucher.request.departure.departDate.toISOString(),
        paxCount: voucher.request.paxCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Verification failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
