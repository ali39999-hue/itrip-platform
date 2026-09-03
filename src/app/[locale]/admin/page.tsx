import { prisma } from '@/lib/prisma';
import { QuickActionsBar } from '@/components/admin/QuickActionsBar';
import { ActionWidgets } from '@/components/admin/ActionWidgets';
import { LiveActivityFeed } from '@/components/admin/LiveActivityFeed';
import { BriefcaseBusiness, Wallet as WalletIcon, ArrowDownRight, Percent } from 'lucide-react';
import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { lt } from '@/lib/lt';
import { safeAuth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function AdminDashboard() {
  const locale = await getLocale();
  const session = await safeAuth();

  if (!session || !['SUPER_ADMIN', 'FINANCE', 'OPS'].includes(session.user.role)) {
    redirect('/' + locale + '/auth');
  }

  // Live Database Queries
  const [confirmedBookingsCount, allBookings, ledgerEntries, pendingOutboxCount] = await Promise.all([
    prisma.booking.count({ where: { status: 'CONFIRMED' } }),
    prisma.booking.findMany({ select: { totalAmount: true, status: true } }),
    prisma.ledgerEntry.findMany({ select: { direction: true, amount: true, referenceType: true, currency: true } }),
    prisma.outboxEvent.count({ where: { status: 'PENDING' } }),
  ]);

  const totalRevenue = allBookings
    .filter((b) => b.status === 'CONFIRMED')
    .reduce((acc, curr) => acc + Number(curr.totalAmount), 0);

  const totalRefunds = ledgerEntries
    .filter((e) => e.referenceType === 'REFUND' && e.direction === 'CREDIT')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const numFmt = locale === 'fa' ? 'fa-IR' : 'en-US';

  const kpis = [
    {
      title: lt(locale, { fa: 'رزروهای قطعی DB', en: 'Confirmed Bookings', ar: 'الحجوزات المؤكدة', zh: '已确认预订', ru: 'Подтверждённые брони' }),
      value: confirmedBookingsCount.toLocaleString(numFmt),
      icon: BriefcaseBusiness,
      bg: 'bg-brand/10 text-brand',
      delta: lt(locale, { fa: 'مشاهده لیست', en: 'View List', ar: 'عرض القائمة', zh: '查看列表', ru: 'Открыть список' }),
      up: true,
      href: '/admin/bookings',
    },
    {
      title: lt(locale, { fa: 'درآمد کل (تومان)', en: 'Total Revenue (Toman)', ar: 'إجمالي الإيرادات', zh: '总收入（图曼）', ru: 'Общий доход' }),
      value: totalRevenue.toLocaleString(numFmt),
      icon: WalletIcon,
      bg: 'bg-flight/10 text-flight',
      delta: lt(locale, { fa: 'دفتر کل', en: 'Ledger', ar: 'دفتر الأستاذ', zh: '总账', ru: 'Главная книга' }),
      up: true,
      href: '/admin/finance',
    },
    {
      title: lt(locale, { fa: 'استردادهای ثبت‌شده', en: 'Processed Refunds', ar: 'الاستردادات المسجلة', zh: '已处理退款', ru: 'Возвраты' }),
      value: totalRefunds.toLocaleString(numFmt),
      icon: ArrowDownRight,
      bg: 'bg-rose-warm/10 text-rose-warm',
      delta: lt(locale, { fa: 'ثبت DB', en: 'DB Log', ar: 'سجل', zh: '数据库记录', ru: 'База данных' }),
      up: false,
      href: '/admin/bookings',
    },
    {
      title: lt(locale, { fa: 'رویدادهای معلق (Outbox)', en: 'Pending Outbox Events', ar: 'أحداث معلقة', zh: '待处理事件', ru: 'События Outbox' }),
      value: pendingOutboxCount.toLocaleString(numFmt),
      icon: Percent,
      bg: 'bg-tour/10 text-tour',
      delta: lt(locale, { fa: 'صف کارها', en: 'Queue', ar: 'طابور', zh: '队列', ru: 'Очередь' }),
      up: pendingOutboxCount === 0,
      href: '/admin/ops',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-ink mb-1">
          {lt(locale, { fa: 'مرکز عملیات (Action Center)', en: 'Action Center', ar: 'مركز العمليات', zh: '运营中心', ru: 'Центр операций' })}
        </h1>
        <p className="text-[13px] font-bold text-sub">
          {lt(locale, { fa: 'مدیریت وظایف روزانه و آمار زنده دیتابیس', en: 'Manage daily tasks and live database metrics', ar: 'إدارة المهام اليومية وإحصاءات قاعدة البيانات المباشرة', zh: '管理每日任务与实时数据库指标', ru: 'Управление задачами и онлайн метрики базы данных' })}
        </p>
      </div>

      {/* Quick Actions Bar */}
      <QuickActionsBar />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          {/* Action counts */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: lt(locale, { fa: 'خطای پرداخت', en: 'Payment Error', ar: 'خطأ في الدفع', zh: '支付错误', ru: 'Ошибка оплаты' }), count: 0, color: 'bg-rose-warm/10 text-rose-warm border-rose-warm/20' },
              { label: lt(locale, { fa: 'در انتظار استرداد', en: 'Refund Pending', ar: 'استرداد معلق', zh: '待退款', ru: 'Возврат в ожидании' }), count: 0, color: 'bg-action/10 text-action border-action/20' },
              { label: lt(locale, { fa: 'صدور بلیط (دستی)', en: 'Manual Ticketing', ar: 'إصدار يدوي للتذاكر', zh: '手动出票', ru: 'Ручная выдача билетов' }), count: pendingOutboxCount, color: 'bg-gold/10 text-gold border-gold/20' },
              { label: lt(locale, { fa: 'بررسی KYC', en: 'KYC Review', ar: 'مراجعة KYC', zh: 'KYC 审核', ru: 'Проверка KYC' }), count: 0, color: 'bg-brand/10 text-brand border-brand/20' },
              { label: lt(locale, { fa: 'خطای تامین‌کننده', en: 'Supplier Error', ar: 'خطأ في المورّد', zh: '供应商错误', ru: 'Ошибка поставщика' }), count: 0, color: 'bg-rose-warm/10 text-rose-warm border-rose-warm/20' },
            ].map((item) => (
              <div
                key={item.label}
                aria-label={`${item.label} - ${item.count}`}
                className={`flex flex-col justify-center p-3 rounded-xl border shadow-sm transition text-start ${item.color}`}
              >
                <span className="text-2xl font-black mb-1">{item.count}</span>
                <span className="text-[10px] font-bold">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Real KPI Cards with Drill-down Links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {kpis.map((k) => {
              const Icon = k.icon;
              return (
                <Link
                  key={k.title}
                  href={k.href}
                  className="bg-surface rounded-xl border border-line p-4 shadow-sm flex flex-col justify-between hover:border-brand/40 hover:shadow-elev-1 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`p-2 rounded-lg ${k.bg} group-hover:scale-105 transition-transform`}>
                      <Icon size={14} />
                    </span>
                    <span className="text-[10px] font-bold text-sub truncate group-hover:text-brand-dark transition-colors">{k.title}</span>
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <p className="font-black text-[15px] text-ink truncate" dir="auto">
                      {k.value}
                    </p>
                    <span className={`text-[10px] font-black shrink-0 ${k.up ? 'text-success' : 'text-rose-warm'}`}>
                      {k.delta}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="flex-1 min-h-[400px]">
            <ActionWidgets />
          </div>
        </div>

        {/* Sidebar */}
        <div className="h-[500px] lg:h-auto min-h-[400px]">
          <LiveActivityFeed />
        </div>
      </div>
    </div>
  );
}
