import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/domains/identity/permission-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requirePermission(['booking:view:all', 'ops:override:cancel']);

    const query = req.nextUrl.searchParams.get('q')?.trim();
    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const [bookings, trips, customers, refunds, invoices] = await Promise.all([
      // 1. Search Bookings by reference or external PNR
      prisma.booking.findMany({
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
      prisma.trip.findMany({
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
      prisma.user.findMany({
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
      prisma.refund.findMany({
        where: {
          refundNumber: { contains: query, mode: 'insensitive' },
        },
        take: 5,
        select: { id: true, refundNumber: true, status: true, netRefundAmount: true, currency: true },
      }),

      // 5. Search Invoices by invoiceNumber
      prisma.invoice.findMany({
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
