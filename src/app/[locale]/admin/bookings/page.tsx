import { Search } from 'lucide-react';
import { getAdminBookings } from '@/actions/admin';
import { RefundButton } from '@/components/admin/RefundButton';

const STATUS_FA: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  PENDING_PAYMENT: 'در انتظار پرداخت',
  CONFIRMED: 'قطعی',
  CANCELLED: 'کنسل شده',
  REFUNDED: 'مسترد شده',
};

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const q = sp?.q || '';
  const result = await getAdminBookings();
  const bookings = result.success && result.bookings ? result.bookings : [];

  const filtered = bookings.filter((b) => {
    if (!q) return true;
    let details: any = {};
    try {
      details = JSON.parse(b.details || '{}');
    } catch(e) {}
    const title = details.title || b.type;
    return (
      title.includes(q) ||
      b.id.toLowerCase().includes(q.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">مدیریت رزروها</h1>
          <p className="text-sm text-sub mt-1">{bookings.length.toLocaleString('fa-IR')} سفارش ثبت شده</p>
        </div>
        <div className="relative">
          <form method="GET">
            <Search size={16} aria-hidden="true" className="absolute end-3 top-1/2 -translate-y-1/2 text-sub" />
            <input
              name="q"
              defaultValue={q}
              placeholder="جستجوی کد رهگیری یا عنوان..."
              className="h-10 w-full md:w-72 rounded-md border border-input bg-surface pe-9 ps-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
          </form>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-line overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-sub py-16 text-sm">رزروی یافت نشد</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-soft text-sub text-xs">
              <tr>
                <th className="p-4 text-start font-medium">کد</th>
                <th className="p-4 text-start font-medium">سرویس</th>
                <th className="p-4 text-start font-medium">مسافر</th>
                <th className="p-4 text-end font-medium">مبلغ</th>
                <th className="p-4 text-start font-medium">وضعیت</th>
                <th className="p-4 font-medium">اقدام</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                let details: any = {};
                try {
                  details = JSON.parse(b.details || '{}');
                } catch(e) {}
                const title = details.title || b.type;
                const subtitle = details.subtitle || '';
                const passengers = details.passengers || [];
                const passengerName = passengers[0]?.lastNameFa || '—';
                const amountStr = Number(b.totalAmount).toLocaleString();
                const reference = b.id.substring(0, 8).toUpperCase();

                return (
                  <tr key={b.id} className="border-t border-line hover:bg-soft/60">
                    <td className="p-4" dir="ltr">{reference}</td>
                    <td className="p-4">
                      <p className="font-medium text-ink">{title}</p>
                      <p className="text-xs text-sub">{subtitle}</p>
                    </td>
                    <td className="p-4 text-sub">
                      {passengerName}
                    </td>
                    <td className="p-4 text-end font-bold text-brand-dark" dir="ltr">{amountStr} {b.currency}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                        b.status === 'CONFIRMED' ? 'bg-success/10 text-success'
                        : b.status === 'REFUNDED' ? 'bg-soft text-sub'
                        : 'bg-warning/10 text-warning'
                      }`}>
                        {STATUS_FA[b.status] || b.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {b.status === 'CONFIRMED' && (
                        <RefundButton bookingId={b.id} reference={reference} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
