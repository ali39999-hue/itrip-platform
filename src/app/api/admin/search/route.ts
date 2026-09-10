import { NextRequest, NextResponse } from 'next/server';
import { getTenantScopedPrisma } from '@/lib/prisma';
import { requirePermission, getTenantAuthContext } from '@/domains/identity/permission-service';
import { hasPiiViewPermission, maskPhone, maskEmail } from '@/lib/security/pii-masking';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(['booking:view:all', 'ops:override:cancel']);

    // IAM-007 / ERP-106: Global search respects the tenant boundary strictly.
    // Org-scoped principals see ONLY their organization's bookings, trips, invoices, refunds, and users.
    // Platform SUPER_ADMIN can search across all tenants.
    const tenantCtx = await getTenantAuthContext(user.id);
    const db = getTenantScopedPrisma(tenantCtx.organizationId, tenantCtx.isSuperAdmin);

    const query = req.nextUrl.searchParams.get('q')?.trim();
    if (!query || query.length < 2) {
      return NextResponse.json({
        results: {
          bookings: [],
          trips: [],
          customers: [],
          refunds: [],
          invoices: [],
        },
      });
    }

    const isSuperAdmin = tenantCtx.isSuperAdmin;
    const orgId = tenantCtx.organizationId;
    const canViewPii = hasPiiViewPermission(tenantCtx);

    // Build tenant-isolated user search clause
    const userTenantClause = isSuperAdmin
      ? {}
      : {
          OR: [
            { organizationMemberships: { some: { organizationId: orgId } } },
            { bookings: { some: { organizationId: orgId } } },
            { trips: { some: { organizationId: orgId } } },
          ],
        };

    // Build tenant-isolated refund clause
    const refundTenantClause = isSuperAdmin
      ? {}
      : {
          booking: {
            organizationId: orgId,
          },
        };

    const [bookings, trips, customers, refunds, invoices] = await Promise.all([
      // 1. Search Bookings by reference or external PNR
      db.booking.findMany({
        where: {
          AND: [
            !isSuperAdmin && orgId ? { organizationId: orgId } : {},
            {
              OR: [
                { reference: { contains: query } },
                { externalPnr: { contains: query } },
              ],
            },
          ],
        },
        take: 10,
        select: {
          id: true,
          reference: true,
          externalPnr: true,
          status: true,
          totalAmount: true,
          currency: true,
          organizationId: true,
        },
      }),

      // 2. Search Trips (Travel Files) by reference or title
      db.trip.findMany({
        where: {
          AND: [
            !isSuperAdmin && orgId ? { organizationId: orgId } : {},
            {
              OR: [
                { reference: { contains: query } },
                { title: { contains: query } },
              ],
            },
          ],
        },
        take: 10,
        select: {
          id: true,
          reference: true,
          title: true,
          status: true,
          organizationId: true,
        },
      }),

      // 3. Search Customers by name, email, or phone (strictly tenant-isolated)
      db.user.findMany({
        where: {
          AND: [
            userTenantClause,
            {
              OR: [
                { name: { contains: query } },
                { email: { contains: query } },
                { phone: { contains: query } },
              ],
            },
          ],
        },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
        },
      }),

      // 4. Search Refunds by refundNumber (strictly tenant-isolated through booking)
      db.refund.findMany({
        where: {
          AND: [
            refundTenantClause,
            {
              refundNumber: { contains: query },
            },
          ],
        },
        take: 10,
        select: {
          id: true,
          refundNumber: true,
          status: true,
          netRefundAmount: true,
          currency: true,
          bookingId: true,
        },
      }),

      // 5. Search Invoices by invoiceNumber
      db.invoice.findMany({
        where: {
          AND: [
            !isSuperAdmin && orgId ? { organizationId: orgId } : {},
            {
              invoiceNumber: { contains: query },
            },
          ],
        },
        take: 10,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalAmount: true,
          currency: true,
          organizationId: true,
        },
      }),
    ]);

    // Apply sensitive data masking to customer details unless caller has traveler:pii:view (ERP-109)
    const maskedCustomers = customers.map((c) => ({
      ...c,
      phone: maskPhone(c.phone, canViewPii),
      email: maskEmail(c.email, canViewPii),
      type: 'CUSTOMER',
      url: `/admin/travel-files`,
    }));

    return NextResponse.json({
      results: {
        bookings: bookings.map((b) => ({
          ...b,
          totalAmount: Number(b.totalAmount),
          type: 'BOOKING',
          url: `/admin/bookings`,
        })),
        trips: trips.map((t) => ({
          ...t,
          type: 'TRIP',
          url: `/admin/travel-files/${t.id}`,
        })),
        customers: maskedCustomers,
        refunds: refunds.map((r) => ({
          ...r,
          netRefundAmount: Number(r.netRefundAmount),
          type: 'REFUND',
          url: `/admin/finance`,
        })),
        invoices: invoices.map((i) => ({
          ...i,
          totalAmount: Number(i.totalAmount),
          type: 'INVOICE',
          url: `/admin/finance`,
        })),
      },
      tenantContext: {
        isSuperAdmin,
        organizationId: orgId || null,
        piiMasked: !canViewPii,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
