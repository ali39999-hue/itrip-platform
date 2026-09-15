import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/domains/identity/permission-service';
import { PassengerManifestService } from '@/domains/booking/PassengerManifestService';
import { TravelFileDomainService } from '@/domains/erp/TravelFileDomainService';

/**
 * Enterprise Agency Manifest Export API (ERP-008, MAN-002)
 * Produces UTF-8 BOM CSV compatible with Excel, Google Sheets, and agency manifest readers.
 *
 * Query params:
 * - date: YYYY-MM-DD (for daily departure manifest)
 * - type: FLIGHT | HOTEL | TOUR | ALL
 * - tripId: (optional, for specific Trip dossier manifest)
 */
export async function GET(request: NextRequest) {
  try {
    await requirePermission(['booking:view:all', 'ops:override:cancel']);

    const searchParams = request.nextUrl.searchParams;
    const tripId = searchParams.get('tripId');
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
    const serviceType = searchParams.get('type') || 'ALL';

    let filename = `manifest_${date}.csv`;
    let csvContent = '';

    if (tripId) {
      const data = await TravelFileDomainService.getTripManifest(tripId);
      filename = `manifest_trip_${data.tripReference}.csv`;
      const header = 'Booking Ref,Product Type,Status,Traveler Name,National ID,Passport,Phone\n';
      const rows = data.manifest.map((m) =>
        `"${m.bookingReference}","${m.productType}","${m.status}","${m.travelerName}","${m.nationalId || '-'}","${m.passportNumber || '-'}","${m.phone || '-'}"`
      ).join('\n');
      csvContent = '﻿' + header + rows;
    } else {
      const manifest = await PassengerManifestService.getManifestForDate({
        travelDate: date,
        serviceType: serviceType === 'ALL' ? undefined : serviceType,
      });
      filename = `manifest_${serviceType.toLowerCase()}_${date}.csv`;
      const header = 'Index,Booking Ref,Full Name,National ID,Passport,Birth Date,Gender,Nationality,Seat,Status,Contact Phone,Service Type\n';
      const rows = manifest.map((p) =>
        `"${p.index}","${p.bookingRef}","${p.fullName}","${p.nationalId}","${p.passportNo}","${p.birthDate}","${p.gender}","${p.nationality}","${p.seat}","${p.status}","${p.contactPhone}","${p.serviceType}"`
      ).join('\n');
      csvContent = '﻿' + header + rows;
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: unknown) {
    console.error('[ManifestExportAPI] Error:', error);
    const message = error instanceof Error ? error.message : 'Unauthorized or internal error';
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
