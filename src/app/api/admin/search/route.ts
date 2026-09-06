import { NextRequest, NextResponse } from 'next/server';
import { getTenantScopedPrisma } from '@/lib/prisma';
import { requirePermission, getTenantAuthContext } from '@/domains/identity/permission-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(['booking:view:all', 'ops:override:cancel']);

    // IAM-007: mirror getAdminBookings — global search respects the tenant
    // boundary (org-scoped principals see only their organization; platform
    // SUPER_ADMIN bypasses). Same contract as every other admin surface.
    const tenantCtx = await getTenantAuthContext(user.id);
    const db = getTenantScopedPrisma(tenantCtx.organizationId, tenantCtx.isSuperAdmin);

    const query = req.nextUrl.searchParams.get('q')?.trim();
    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const [bookings, trips, customers, refunds, invoices] = await Promise.all([
      // 1. Search Bookings by reference or external PNR
      db.booking.findMany({
        where: {
          OR: [
            { reference: { contains: query, mode: 'insensitive' } },
            { externalPnr: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, reference: true, externalPnr: true, status: true, totalAmount: true, currency: true },
      }),

      // 2. Search Trips by reference or title
      db.trip.findMany({
        where: {
          OR: [
            { reference: { contains: query, mode: 'insensitive' } },
            { title: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, reference: true, title: true, status: true },
      }),

      // 3. Search Customers by name, email, or phone
      db.user.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, name: true, email: true, phone: true, role: true },
      }),

      // 4. Search Refunds by refundNumber
      db.refund.findMany({
        where: {
          refundNumber: { contains: query, mode: 'insensitive' },
        },
        take: 5,
        select: { id: true, refundNumber: true, status: true, netRefundAmount: true, currency: true },
      }),

      // 5. Search Invoices by invoiceNumber
      db.invoice.findMany({
        where: {
          invoiceNumber: { contains: query, mode: 'insensitive' },
        },
        take: 5,
        select: { id: true, invoiceNumber: true, status: true, totalAmount: true, currency: true },
      }),
    ]);

    return NextResponse.json({
      results: {
        bookings: bookings.map((b) => ({ ...b, type: 'BOOKING', url: `/admin/bookings` })),
        trips: trips.map((t) => ({ ...t, type: 'TRIP', url: `/admin/travel-files/${t.id}` })),
        customers: customers.map((c) => ({ ...c, type: 'CUSTOMER', url: `/admin/travel-files` })),
        refunds: refunds.map((r) => ({ ...r, type: 'REFUND', url: `/admin/finance` })),
        invoices: invoices.map((i) => ({ ...i, type: 'INVOICE', url: `/admin/finance` })),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
