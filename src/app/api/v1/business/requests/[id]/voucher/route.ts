import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const request = await prisma.businessRequest.findUnique({
      where: { id },
      include: {
        departure: { include: { package: true } },
        company: true,
        vouchers: true,
        travelers: true,
      },
    });

    if (!request) {
      return NextResponse.json(
        { success: false, error: 'Request not found', code: 'not_found' },
        { status: 404 }
      );
    }

    if (request.status !== 'issued') {
      return NextResponse.json(
        {
          success: false,
          error: 'Voucher is only available after full settlement and issuance',
          code: 'voucher_not_ready',
        },
        { status: 403 }
      );
    }

    const groupVoucher = request.vouchers[0] || {
      id: `vch_${request.id}`,
      code: `VCH-${request.code}`,
      qrPayload: JSON.stringify({ code: `VCH-${request.code}`, request: request.code }),
    };

    return NextResponse.json({
      success: true,
      data: {
        code: groupVoucher.code,
        packageTitle: request.departure.package.title,
        companyName: request.company?.name || 'شرکت تجاری',
        repName: request.company?.repName || 'نماینده شرکت',
        travelDate: request.departure.departDate.toISOString(),
        paxCount: request.paxCount,
        outboundFlight: 'تهران ← مقصد — پرواز رفت با بار مجاز',
        returnFlight: 'مقصد ← تهران — پرواز برگشت با بار مجاز',
        hotel: 'هتل ۴ ستاره مرکز شهر — با صبحانه بوفه',
        guide: 'سرپرست و مترجم همراه — پشتیبانی ۲۴ ساعته',
        qrPayload: groupVoucher.qrPayload,
        services: [
          'ویزای تجاری تاییدشده',
          'ترانسفر فرودگاهی و روزانه',
          'بیمه مسافرتی تجاری',
          'مترجم همراه',
          'گواهی حضور در رویداد',
        ],
        voucher: groupVoucher,
        travelers: request.travelers,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch voucher';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
