'use client';

import { RefundButton } from '@/components/admin/RefundButton';
import { ERPDataGrid, ColumnDef } from '@/components/admin/ERPDataGrid';
import { ErpBadge, ErpHint, ErpPageHeader } from '@/components/admin/erp-ui';
import { PlaneTakeoff, Crown, ShieldCheck, Plane, BedDouble, Compass, CarTaxiFront } from 'lucide-react';
import { lt } from '@/lib/lt';

export type BookingRow = {
  id: string;
  reference: string;
  serviceType: string;
  itemTypes?: string[];
  title: string;
  subtitle: string;
  passenger: string;
  amount: number;
  currency: string;
  status: string;
};

const STATUS_LT: Record<string, { fa: string; en: string; ar: string; zh: string; ru: string }> = {
  DRAFT: { fa: 'پیش‌نویس', en: 'Draft', ar: 'مسودة', zh: '草稿', ru: 'Черновик' },
  PENDING_PAYMENT: { fa: 'در انتظار پرداخت', en: 'Pending Payment', ar: 'في انتظار الدفع', zh: '待支付', ru: 'Ожидает оплаты' },
  CONFIRMED: { fa: 'تایید شده', en: 'Confirmed', ar: 'مؤكد', zh: '已确认', ru: 'Подтверждено' },
  CANCELLED: { fa: 'لغو شده', en: 'Cancelled', ar: 'ملغى', zh: '已取消', ru: 'Отменено' },
  REFUNDED: { fa: 'مسترد شده', en: 'Refunded', ar: 'مسترد', zh: '已退款', ru: 'Возвращено' },
};

function renderServiceBadge(type: string, locale: string) {
  const t = type.toUpperCase();
  if (t === 'CIP' || t === 'CIPS') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
        <Crown size={11} className="text-amber-700" />
        <span>{lt(locale, { fa: 'تشریفات CIP', en: 'CIP', ar: 'CIP', zh: 'CIP', ru: 'CIP' })}</span>
      </span>
    );
  }
  if (t === 'INSURANCE') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
        <ShieldCheck size={11} className="text-emerald-700" />
        <span>{lt(locale, { fa: 'بیمه مسافرتی', en: 'Insurance', ar: 'تأمين', zh: '保险', ru: 'Страховка' })}</span>
      </span>
    );
  }
  if (t === 'FLIGHT' || t === 'FLIGHTS') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
        <Plane size={11} className="text-blue-700" />
        <span>{lt(locale, { fa: 'پرواز', en: 'Flight', ar: 'طيران', zh: '机票', ru: 'Рейс' })}</span>
      </span>
    );
  }
  if (t === 'HOTEL' || t === 'HOTELS') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-100 text-orange-900 border border-orange-300">
        <BedDouble size={11} className="text-orange-700" />
        <span>{lt(locale, { fa: 'هتل', en: 'Hotel', ar: 'فندق', zh: '酒店', ru: 'Отель' })}</span>
      </span>
    );
  }
  if (t === 'TOUR' || t === 'TOURS') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
        <Compass size={11} className="text-purple-700" />
        <span>{lt(locale, { fa: 'تور', en: 'Tour', ar: 'جولة', zh: '旅游', ru: 'Тур' })}</span>
      </span>
    );
  }
  if (t === 'TRANSFER' || t === 'TRANSFERS') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-100 text-teal-900 border border-teal-300">
        <CarTaxiFront size={11} className="text-teal-700" />
        <span>{lt(locale, { fa: 'ترانسفر', en: 'Transfer', ar: 'توصيل', zh: '接送', ru: 'Трансфер' })}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sub/10 text-sub">
      {type}
    </span>
  );
}

function statusTone(status: string): 'green' | 'gold' | 'rose' | 'neutral' {
  if (status === 'CONFIRMED') return 'green';
  if (status === 'REFUNDED' || status === 'CANCELLED') return 'neutral';
  if (status === 'PENDING_PAYMENT' || status === 'DRAFT') return 'gold';
  return 'neutral';
}

export function BookingsClientPage({
  rows,
  locale,
}: {
  rows: BookingRow[];
  locale: string;
}) {
  const numFmt = locale === 'fa' ? 'fa-IR' : 'en-US';
  const confirmed = rows.filter((r) => r.status === 'CONFIRMED').length;

  const columns: ColumnDef<BookingRow>[] = [
    {
      key: 'reference',
      header: lt(locale, { fa: 'کد', en: 'Code', ar: 'الرمز', zh: '代码', ru: 'Код' }),
      sortable: true,
      csvAccessor: (r) => r.reference,
      render: (r) => (
        <span className="inline-block rounded-lg bg-deep px-2.5 py-1 font-mono text-[11px] font-black tracking-wider text-surface" dir="ltr">
          {r.reference}
        </span>
      ),
    },
    {
      key: 'serviceType',
      header: lt(locale, { fa: 'دسته‌بندی', en: 'Category', ar: 'الفئة', zh: '类别', ru: 'Категория' }),
      sortable: true,
      filterable: true,
      filterOptions: [
        { label: 'پرواز (FLIGHT)', value: 'FLIGHT' },
        { label: 'هتل (HOTEL)', value: 'HOTEL' },
        { label: 'تور (TOUR)', value: 'TOUR' },
        { label: 'ترانسفر (TRANSFER)', value: 'TRANSFER' },
        { label: 'تشریفات CIP (CIP)', value: 'CIP' },
        { label: 'بیمه مسافرتی (INSURANCE)', value: 'INSURANCE' },
      ],
      csvAccessor: (r) => r.serviceType,
      render: (r) => (
        <div className="flex flex-wrap items-center gap-1">
          {r.itemTypes && r.itemTypes.length > 1 ? (
            r.itemTypes.map((t, idx) => (
              <span key={idx}>{renderServiceBadge(t, locale)}</span>
            ))
          ) : (
            renderServiceBadge(r.serviceType, locale)
          )}
        </div>
      ),
    },
    {
      key: 'title',
      header: lt(locale, { fa: 'سرویس', en: 'Service', ar: 'الخدمة', zh: '服务', ru: 'Услуга' }),
      sortable: true,
      accessor: (r) => r.title,
      csvAccessor: (r) => r.title,
      render: (r) => (
        <span className="block min-w-44 max-w-64">
          <span className="block truncate text-[13px] font-black text-ink">{r.title}</span>
          {r.subtitle ? <span className="block truncate text-[11px] font-medium text-sub">{r.subtitle}</span> : null}
        </span>
      ),
    },
    {
      key: 'passenger',
      header: lt(locale, { fa: 'مسافر', en: 'Passenger', ar: 'المسافر', zh: '乘客', ru: 'Пассажир' }),
      sortable: true,
      csvAccessor: (r) => r.passenger,
      render: (r) => <span className="font-bold text-sub">{r.passenger}</span>,
    },
    {
      key: 'amount',
      header: lt(locale, { fa: 'مبلغ', en: 'Amount', ar: 'المبلغ', zh: '金额', ru: 'Сумما' }),
      sortable: true,
      accessor: (r) => r.amount,
      csvAccessor: (r) => r.amount,
      render: (r) => (
        <span className="num font-black text-brand-dark tabular-nums" dir="ltr">
          {r.amount.toLocaleString(numFmt)} <span className="text-[10px] font-bold text-sub">{r.currency}</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: lt(locale, { fa: 'وضعیت', en: 'Status', ar: 'الحالة', zh: '状态', ru: 'Статус' }),
      sortable: true,
      filterable: true,
      filterOptions: Object.keys(STATUS_LT).map((s) => ({
        label: `${lt(locale, STATUS_LT[s])} (${s})`,
        value: s,
      })),
      csvAccessor: (r) => r.status,
      render: (r) => (
        <ErpBadge tone={statusTone(r.status)}>
          {STATUS_LT[r.status] ? lt(locale, STATUS_LT[r.status]) : r.status}
        </ErpBadge>
      ),
    },
    {
      key: 'actions',
      header: lt(locale, { fa: 'اقدام', en: 'Action', ar: 'الإجراء', zh: '操作', ru: 'Действие' }),
      sortable: false,
      render: (r) =>
        r.status === 'CONFIRMED' ? (
          <RefundButton bookingId={r.id} reference={r.reference} />
        ) : (
          <span className="text-[11px] font-bold text-sub/50">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <ErpPageHeader
        eyebrow={lt(locale, { fa: 'عملیات · فروش', en: 'Operations · Sales', ar: 'العمليات · المبيعات', zh: '运营 · 销售', ru: 'Операции · Продажи' })}
        title={lt(locale, { fa: 'مدیریت رزروها', en: 'Booking Management', ar: 'إدارة الحجوزات', zh: '预订管理', ru: 'Управление бронированиями' })}
        description={lt(locale, {
          fa: `${rows.length.toLocaleString(numFmt)} سفارش ثبت شده · ${confirmed.toLocaleString(numFmt)} قطعی`,
          en: `${rows.length.toLocaleString(numFmt)} orders recorded · ${confirmed.toLocaleString(numFmt)} confirmed`,
          ar: `تم تسجيل ${rows.length.toLocaleString(numFmt)} طلب`,
          zh: `已记录 ${rows.length.toLocaleString(numFmt)} 个订单`,
          ru: `Заказов: ${rows.length.toLocaleString(numFmt)}`,
        })}
        icon={<PlaneTakeoff size={20} aria-hidden="true" />}
      />

      <ERPDataGrid<BookingRow>
        data={rows}
        columns={columns}
        idAccessor={(r) => r.id}
        title={lt(locale, { fa: 'لیست رزروها', en: 'Bookings list', ar: 'قائمة الحجوزات', zh: '预订列表', ru: 'Список бронирований' })}
        description={
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span>{lt(locale, { fa: 'جستجو، فیلتر وضعیت، مرتب‌سازی و خروجی CSV', en: 'Search, filter by status, sort and export CSV', ar: 'بحث وتصفية وترتيب', zh: '搜索、筛选、排序与导出', ru: 'Поиск, фильтр, сортировка и экспорт' })}</span>
            <ErpHint label={lt(locale, { fa: 'دکمه استرداد کی فعال است؟', en: 'When is the refund button active?', ar: 'متى تكون زر الاسترداد نشطًا؟', zh: '退款按钮何时可用？', ru: 'Когда активен возврат?' })}>
              {lt(locale, {
                fa: 'فقط برای رزروهای «تأیید شده». استرداد با تأیید شما سند مالی دوبل صادر می‌کند و قابل بازگشت نیست.',
                en: 'Only for CONFIRMED bookings. Refunding issues a double-entry voucher with your approval and cannot be undone.',
                ar: 'للحجوزات المؤكدة فقط. الاسترداد يصدر سندًا ماليًا مزدوجًا ولا يمكن التراجع عنه.',
                zh: '仅适用于已确认订单。退款将生成复式凭证，且不可撤销。',
                ru: 'Только для CONFIRMED. Возврат выпускает двойной voucher и необратим.',
              })}
            </ErpHint>
          </span>
        }
        searchPlaceholder={lt(locale, { fa: 'جستجوی کد، سرویس یا مسافر… ( / )', en: 'Search code, service or passenger… ( / )', ar: 'ابحث برقم أو خدمة…', zh: '搜索订单号、服务或乘客…', ru: 'Поиск по коду, услуге…' })}
        defaultPageSize={25}
        emptyStateMessage={lt(locale, { fa: 'رزروی یافت نشد', en: 'No bookings found', ar: 'لا توجد حجوزات', zh: '未找到预订', ru: 'Бронирования не найдены' })}
        savedViewStorageKey="erp_bookings_views"
      />
    </div>
  );
}
