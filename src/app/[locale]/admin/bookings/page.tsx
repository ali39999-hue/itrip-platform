import { Booking } from '@prisma/client';
import { getLocale } from 'next-intl/server';
import { getAdminBookings } from '@/actions/admin';
import { lt } from '@/lib/lt';
import { BookingsClientPage, BookingRow } from './BookingsClientPage';

type BookingItem = { type: string; details: string };
type BookingWithItems = Booking & { items?: BookingItem[] };

function parseDetails(b: BookingWithItems): { title: string; subtitle: string; passenger: string } {
  let details: {
    title?: string;
    subtitle?: string;
    passengers?: Array<{ lastNameFa?: string; lastNameEn?: string; lastName?: string }>;
  } = {};
  try {
    details = JSON.parse(b.items?.[0]?.details || '{}');
  } catch { /* keep defaults */ }
  const passengers = details.passengers || [];
  const passenger =
    passengers[0]?.lastNameEn ||
    passengers[0]?.lastNameFa ||
    (passengers[0] as { lastName?: string } | undefined)?.lastName ||
    '—';
  return { title: details.title || '', subtitle: details.subtitle || '', passenger };
}

export default async function AdminBookingsPage() {
  const locale = await getLocale();
  const result = await getAdminBookings();
  const bookings = (result.success && result.bookings ? result.bookings : []) as BookingWithItems[];

  const fallbackTitle = lt(locale, { fa: 'سفارش سفر', en: 'Travel Order', ar: 'طلب سفر', zh: '旅行订单', ru: 'Заказ' });

  const rows: BookingRow[] = bookings.map((b) => {
    const d = parseDetails(b);
    return {
      id: b.id,
      reference: b.reference || b.id.substring(0, 8).toUpperCase(),
      title: d.title || b.items?.[0]?.type || fallbackTitle,
      subtitle: d.subtitle,
      passenger: d.passenger,
      amount: Number(b.totalAmount),
      currency: b.currency,
      status: b.status,
    };
  });

  return <BookingsClientPage rows={rows} locale={locale} />;
}
