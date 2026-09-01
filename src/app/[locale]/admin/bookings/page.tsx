import { Booking } from '@prisma/client';
import { Search } from 'lucide-react';
import { getLocale } from 'next-intl/server';
import { getAdminBookings } from '@/actions/admin';
import { RefundButton } from '@/components/admin/RefundButton';
import { lt } from '@/lib/lt';

const STATUS_LT: Record<string, { fa: string; en: string; ar: string; zh: string; ru: string }> = {
  DRAFT: { fa: 'پیش‌نویس', en: 'Draft', ar: 'مسودة', zh: '草稿', ru: 'Черновик' },
  PENDING_PAYMENT: { fa: 'در انتظار پرداخت', en: 'Pending Payment', ar: 'في انتظار الدفع', zh: '待支付', ru: 'Ожидает оплаты' },
  CONFIRMED: { fa: 'تایید شده', en: 'Confirmed', ar: 'مؤكد', zh: '已确认', ru: 'Подтверждено' },
  CANCELLED: { fa: 'لغو شده', en: 'Cancelled', ar: 'ملغى', zh: '已取消', ru: 'Отменено' },
  REFUNDED: { fa: 'مسترد شده', en: 'Refunded', ar: 'مسترد', zh: '已退款', ru: 'Возвращено' },
};

type BookingItem = { type: string; details: string };
type BookingWithItems = Booking & { items?: BookingItem[] };

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const locale = await getLocale();
  const sp = searchParams ? await searchParams : undefined;
  const q = sp?.q || '';
  const result = await getAdminBookings();
  const bookings = (result.success && result.bookings ? result.bookings : []) as BookingWithItems[];
  const numFmt = locale === 'fa' ? 'fa-IR' : 'en-US';

  const filtered = bookings.filter((b: BookingWithItems) => {
    if (!q) return true;
    let details: { title?: string; subtitle?: string; passengers?: { lastNameFa?: string }[] } = {};
    const bookingDetails = b.items?.[0]?.details || '{}';
    try {
      details = JSON.parse(bookingDetails);
    } catch {}
    const title = details.title || b.items?.[0]?.type || b.status;
    return (
      title.includes(q) ||
      b.id.toLowerCase().includes(q.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">{lt(locale, { fa: 'مدیریت رزروها', en: 'Booking Management', ar: 'إدارة الحجوزات', zh: '预订管理', ru: 'Управление бронированиями' })}</h1>
          <p className="text-sm text-sub mt-1">{lt(locale, { fa: `${bookings.length.toLocaleString(numFmt)} سفارش ثبت شده`, en: `${bookings.length.toLocaleString(numFmt)} orders recorded`, ar: `تم تسجيل ${bookings.length.toLocaleString(numFmt)} طلب`, zh: `已记录 ${bookings.length.toLocaleString(numFmt)} 个订单`, ru: `Зарегистрировано заказов: ${bookings.length.toLocaleString(numFmt)}` })}</p>
        </div>
        <div className="relative">
          <form method="GET">
            <Search size={16} aria-hidden="true" className="absolute end-3 top-1/2 -translate-y-1/2 text-sub" />
            <input
              name="q"
              defaultValue={q}
              placeholder={lt(locale, { fa: 'جستجوی کد پیگیری یا عنوان...', en: 'Search reference code or title...', ar: 'ابحث برقم التتبع أو العنوان...', zh: '搜索订单号或标题...', ru: 'Поиск по коду или названию...' })}
              className="h-10 w-full md:w-72 rounded-md border border-input bg-surface pe-9 ps-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
          </form>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-line overflow-x-auto">
        {filtered.length === 0 ? (
          <p className="text-center text-sub py-16 text-sm">{lt(locale, { fa: 'رزروی یافت نشد', en: 'No bookings found', ar: 'لا توجد حجوزات', zh: '未找到预订', ru: 'Бронирования не найдены' })}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-soft text-sub text-xs">
              <tr>
                <th className="p-4 text-start font-medium">{lt(locale, { fa: 'کد', en: 'Code', ar: 'الرمز', zh: '代码', ru: 'Код' })}</th>
                <th className="p-4 text-start font-medium">{lt(locale, { fa: 'سرویس', en: 'Service', ar: 'الخدمة', zh: '服务', ru: 'Услуга' })}</th>
                <th className="p-4 text-start font-medium">{lt(locale, { fa: 'مسافر', en: 'Passenger', ar: 'المسافر', zh: '乘客', ru: 'Пассажир' })}</th>
                <th className="p-4 text-end font-medium">{lt(locale, { fa: 'مبلغ', en: 'Amount', ar: 'المبلغ', zh: '金额', ru: 'Сумма' })}</th>
                <th className="p-4 text-start font-medium">{lt(locale, { fa: 'وضعیت', en: 'Status', ar: 'الحالة', zh: '状态', ru: 'Статус' })}</th>
                <th className="p-4 font-medium">{lt(locale, { fa: 'اقدام', en: 'Action', ar: 'الإجراء', zh: '操作', ru: 'Действие' })}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b: BookingWithItems) => {
                let details: { title?: string; subtitle?: string; passengers?: { lastNameFa?: string }[] } = {};
                const bookingDetails = b.items?.[0]?.details || '{}';
                try {
                  details = JSON.parse(bookingDetails);
                } catch {}
                const title = details.title || b.items?.[0]?.type || 'Unknown';
                const subtitle = details.subtitle || '';
                const passengers = details.passengers || [];
                const passengerName = passengers[0]?.lastNameFa || '—';
                const amountStr = Number(b.totalAmount).toLocaleString(numFmt);
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
                        {STATUS_LT[b.status] ? lt(locale, STATUS_LT[b.status]) : b.status}
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
