'use client';

import { useLocale } from 'next-intl';
import { useBookingStore } from '@/stores/booking-store';
import { useHydration } from '@/hooks/useHydration';
import { QuickActionsBar } from '@/components/admin/QuickActionsBar';
import { ActionWidgets } from '@/components/admin/ActionWidgets';
import { LiveActivityFeed } from '@/components/admin/LiveActivityFeed';
import { BriefcaseBusiness, Wallet as WalletIcon, ArrowDownRight, Percent } from 'lucide-react';
import { lt } from '@/lib/lt';

export default function AdminDashboard() {
  const locale = useLocale();
  const isHydrated = useHydration();
  const bookings = useBookingStore((s) => s.bookings);
  const wallet = useBookingStore((s) => s.wallet);
  const transactions = useBookingStore((s) => s.transactions);

  const numFmt = locale === 'fa' ? 'fa-IR' : 'en-US';
  const revenue = bookings.filter((b) => b.status === 'confirmed').reduce((a, b) => a + b.amount, 0);
  const refunds = transactions.filter((t) => t.type === 'refund').reduce((a, t) => a + t.amount, 0);

  const kpis = [
    { title: lt(locale, { fa: 'رزروهای قطعی', en: 'Confirmed Bookings', ar: 'الحجوزات المؤكدة', zh: '已确认预订', ru: 'Подтверждённые брони' }), value: bookings.filter((b) => b.status === 'confirmed').length.toLocaleString(numFmt), icon: BriefcaseBusiness, bg: 'bg-brand/10 text-brand', delta: lt(locale, { fa: '+۱۲٪', en: '+12%', ar: '+12%', zh: '+12%', ru: '+12%' }), up: true },
    { title: lt(locale, { fa: 'درآمد (تومان)', en: 'Revenue (Toman)', ar: 'الإيرادات (تومان)', zh: '收入（图曼）', ru: 'Доход (Toman)' }), value: revenue.toLocaleString(numFmt), icon: WalletIcon, bg: 'bg-flight/10 text-flight', delta: lt(locale, { fa: '+۸٪', en: '+8%', ar: '+8%', zh: '+8%', ru: '+8%' }), up: true },
    { title: lt(locale, { fa: 'استردادها', en: 'Refunds', ar: 'الاستردادات', zh: '退款', ru: 'Возвраты' }), value: refunds.toLocaleString(numFmt), icon: ArrowDownRight, bg: 'bg-rose-warm/10 text-rose-warm', delta: lt(locale, { fa: '۴ باز', en: '4 open', ar: '4 مفتوحة', zh: '4 笔待办', ru: '4 открытых' }), up: false },
    { title: lt(locale, { fa: 'صندوق (IRR)', en: 'Treasury (IRR)', ar: 'الخزينة (IRR)', zh: '金库（IRR）', ru: 'Казна (IRR)' }), value: wallet.IRR.toLocaleString(numFmt), icon: Percent, bg: 'bg-tour/10 text-tour', delta: lt(locale, { fa: 'تسویه شده', en: 'Settled', ar: 'مُسوّى', zh: '已结算', ru: 'Сверено' }), up: true },
  ];

  if (!isHydrated) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-ink mb-1">{lt(locale, { fa: 'مرکز عملیات (Action Center)', en: 'Action Center', ar: 'مركز العمليات', zh: '运营中心', ru: 'Центр операций' })}</h1>
        <p className="text-[13px] font-bold text-sub">{lt(locale, { fa: 'مدیریت وظایف روزانه و هشدارها', en: 'Manage daily tasks and alerts', ar: 'إدارة المهام اليومية والتنبيهات', zh: '管理每日任务与提醒', ru: 'Управление задачами и оповещениями' })}</p>
      </div>

      {/* نوار اقدامات سریع */}
      <QuickActionsBar />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ستون اصلی: کارهای معوقه و داشبورد فشرده */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          {/* کارهای معوقه (Needs Action) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: lt(locale, { fa: 'خطای پرداخت', en: 'Payment Error', ar: 'خطأ في الدفع', zh: '支付错误', ru: 'Ошибка оплаты' }), count: 3, color: 'bg-rose-warm/10 text-rose-warm border-rose-warm/20' },
              { label: lt(locale, { fa: 'در انتظار استرداد', en: 'Refund Pending', ar: 'استرداد معلق', zh: '待退款', ru: 'Возврат в ожидании' }), count: 2, color: 'bg-action/10 text-action border-action/20' },
              { label: lt(locale, { fa: 'صدور بلیط (دستی)', en: 'Manual Ticketing', ar: 'إصدار يدوي للتذاكر', zh: '手动出票', ru: 'Ручная выдача билетов' }), count: 4, color: 'bg-gold/10 text-gold border-gold/20' },
              { label: lt(locale, { fa: 'بررسی KYC', en: 'KYC Review', ar: 'مراجعة KYC', zh: 'KYC 审核', ru: 'Проверка KYC' }), count: 1, color: 'bg-brand/10 text-brand border-brand/20' },
              { label: lt(locale, { fa: 'خطای تامین‌کننده', en: 'Supplier Error', ar: 'خطأ في المورّد', zh: '供应商错误', ru: 'Ошибка поставщика' }), count: 2, color: 'bg-rose-warm/10 text-rose-warm border-rose-warm/20' },
            ].map((item) => (
              <button
                key={item.label}
                aria-label={`${item.label} - ${item.count}`}
                className={`flex flex-col justify-center p-3 rounded-xl border shadow-sm hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition text-start ${item.color}`}
              >
                <span className="text-2xl font-black mb-1">{item.count}</span>
                <span className="text-[10px] font-bold">{item.label}</span>
              </button>
            ))}
          </div>

          {/* KPI های فشرده */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {kpis.map((k) => {
              const Icon = k.icon;
              return (
                <div key={k.title} className="bg-surface rounded-xl border border-line p-4 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`p-2 rounded-lg ${k.bg}`}><Icon size={14} /></span>
                    <span className="text-[10px] font-bold text-sub truncate">{k.title}</span>
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <p className="font-black text-[15px] text-ink truncate" dir="auto">{k.value}</p>
                    <span className={`text-[10px] font-black shrink-0 ${k.up ? 'text-success' : 'text-rose-warm'}`}>{k.delta}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex-1 min-h-[400px]">
            <ActionWidgets />
          </div>
        </div>

        {/* سایدبار: رخدادهای زنده */}
        <div className="h-[500px] lg:h-auto min-h-[400px]">
          <LiveActivityFeed />
        </div>
      </div>
    </div>
  );
}
