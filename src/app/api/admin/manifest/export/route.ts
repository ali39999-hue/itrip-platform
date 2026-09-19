import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requirePermission,
  getTenantAuthContext,
  assertTenantAccess,
} from '@/domains/identity/permission-service';
import { PassengerManifestService } from '@/domains/booking/PassengerManifestService';
import { TravelFileDomainService } from '@/domains/erp/TravelFileDomainService';

/**
 * Enterprise Agency Manifest Export API (ERP-008, MAN-002, SEC-026)
 * Produces UTF-8 BOM CSV compatible with Excel, Google Sheets, and agency manifest readers.
 * Enforces strict operator authentication, tenant-scoped access, and mandatory audit logging.
 *
 * Query params:
 * - date: YYYY-MM-DD (for daily departure manifest)
 * - type: FLIGHT | HOTEL | TOUR | ALL
 * - tripId: (optional, for specific Trip dossier manifest)
 */
export async function GET(request: NextRequest) {
  try {
    const operator = await requirePermission(['booking:view:all', 'ops:override:cancel']);
    const tenantCtx = await getTenantAuthContext(operator.id);

    const searchParams = request.nextUrl.searchParams;
    const tripId = searchParams.get('tripId');
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
    const serviceType = searchParams.get('type') || 'ALL';

    let filename = `manifest_${date}.csv`;
    let csvContent = '';

    if (tripId) {
      // MANIFEST-01 / IDOR: the trip must belong to the operator's tenant (or the
      // operator is a platform admin). Without this check any authenticated
      // operator could enumerate another tenant's dossier by tripId.
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        select: { organizationId: true, userId: true },
      });
      if (!trip) {
        return NextResponse.json({ error: 'Manifest target not found' }, { status: 404 });
      }
      assertTenantAccess(tenantCtx, { organizationId: trip.organizationId, customerId: trip.userId });

      const data = await TravelFileDomainService.getTripManifest(tripId);
      filename = `manifest_trip_${data.tripReference}.csv`;
      const header = 'Booking Ref,Product Type,Status,Traveler Name,National ID,Passport,Phone\n';
      const rows = data.manifest
        .map(
          (m) =>
            `"${escapeCsv(m.bookingReference)}","${escapeCsv(m.productType)}","${escapeCsv(m.status)}","${escapeCsv(m.travelerName)}","${escapeCsv(m.nationalId || '-')}","${escapeCsv(m.passportNumber || '-')}","${escapeCsv(m.phone || '-')}"`
        )
        .join('\n');
      csvContent = '\ufeff' + header + rows;
    } else {
      const manifest = await PassengerManifestService.getManifestForDate({
        travelDate: date,
        serviceType: serviceType === 'ALL' ? undefined : serviceType,
        organizationId: tenantCtx.organizationId,
        isPlatformAdmin: tenantCtx.isSuperAdmin,
      });
      filename = `manifest_${serviceType.toLowerCase()}_${date}.csv`;
      const header =
        'Index,Booking Ref,Full Name,National ID,Passport,Birth Date,Gender,Nationality,Seat,Status,Contact Phone,Service Type\n';
      const rows = manifest
        .map(
          (p) =>
            `"${p.index}","${escapeCsv(p.bookingRef)}","${escapeCsv(p.fullName)}","${escapeCsv(p.nationalId)}","${escapeCsv(p.passportNo)}","${escapeCsv(p.birthDate)}","${escapeCsv(p.gender)}","${escapeCsv(p.nationality)}","${escapeCsv(p.seat)}","${escapeCsv(p.status)}","${escapeCsv(p.contactPhone)}","${escapeCsv(p.serviceType)}"`
        )
        .join('\n');
      csvContent = '\ufeff' + header + rows;
    }

    // Record mandatory audit event for PII passenger manifest export (§26)
    await prisma.auditLog
      .create({
        data: {
          userId: operator.id,
          resource: 'PassengerManifest',
          resourceId: tripId || `date_${date}`,
          action: 'MANIFEST_EXPORTED',
        },
      })
      .catch(() => null);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: unknown) {
    // SEC-026: never echo raw error messages to the client — they can disclose
    // internal identifiers/schema. Log server-side, return a generic status.
    console.error('[ManifestExportAPI] Error:', error);
    const isAuthError = error instanceof Error && /Forbidden|Unauthorized/.test(error.message);
    return NextResponse.json(
      { error: isAuthError ? 'Forbidden' : 'Manifest export failed' },
      { status: isAuthError ? 403 : 500 }
    );
  }
}

/** RFC-4180 CSV cell escaping: double interior quotes so a value cannot break the row. */
function escapeCsv(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return s.replace(/"/g, '""');
}