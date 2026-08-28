'use client';

import { useBookingStore } from '@/stores/booking-store';
import { useHydration } from '@/hooks/useHydration';
import { QuickActionsBar } from '@/components/admin/QuickActionsBar';
import { ActionWidgets } from '@/components/admin/ActionWidgets';
import { LiveActivityFeed } from '@/components/admin/LiveActivityFeed';
import { BriefcaseBusiness, Wallet as WalletIcon, ArrowUpRight, ArrowDownRight, Percent } from 'lucide-react';

export default function AdminDashboard() {
  const isHydrated = useHydration();
  const bookings = useBookingStore((s) => s.bookings);
  const wallet = useBookingStore((s) => s.wallet);
  const transactions = useBookingStore((s) => s.transactions);

  const revenue = bookings.filter((b) => b.status === 'confirmed').reduce((a, b) => a + b.amount, 0);
  const refunds = transactions.filter((t) => t.type === 'refund').reduce((a, t) => a + t.amount, 0);

  const kpis = [
    { title: 'رزروهای قطعی', value: bookings.filter((b) => b.status === 'confirmed').length.toLocaleString('fa-IR'), icon: BriefcaseBusiness, bg: 'bg-brand/10 text-brand', delta: '+۱۲٪', up: true },
    { title: 'درآمد (تومان)', value: revenue.toLocaleString('fa-IR'), icon: WalletIcon, bg: 'bg-flight/10 text-flight', delta: '+۸٪', up: true },
    { title: 'استردادها', value: refunds.toLocaleString('fa-IR'), icon: ArrowDownRight, bg: 'bg-rose-warm/10 text-rose-warm', delta: '۴ باز', up: false },
    { title: 'صندوق (IRR)', value: wallet.IRR.toLocaleString('fa-IR'), icon: Percent, bg: 'bg-tour/10 text-tour', delta: 'تسویه شده', up: true },
  ];

  if (!isHydrated) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-ink mb-1">مرکز عملیات (Action Center)</h1>
        <p className="text-[13px] font-bold text-sub">مدیریت وظایف روزانه و هشدارها</p>
      </div>

      {/* نوار اقدامات سریع */}
      <QuickActionsBar />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ستون اصلی: کارهای معوقه و داشبورد فشرده */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          {/* کارهای معوقه (Needs Action) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'خطای پرداخت', count: 3, color: 'bg-rose-warm/10 text-rose-warm border-rose-warm/20' },
              { label: 'در انتظار استرداد', count: 2, color: 'bg-action/10 text-action border-action/20' },
              { label: 'صدور بلیط (دستی)', count: 4, color: 'bg-gold/10 text-gold border-gold/20' },
              { label: 'بررسی KYC', count: 1, color: 'bg-brand/10 text-brand border-brand/20' },
              { label: 'خطای تامین‌کننده', count: 2, color: 'bg-rose-warm/10 text-rose-warm border-rose-warm/20' },
            ].map((item) => (
              <button 
                key={item.label} 
                aria-label={`${item.label} - ${item.count} مورد`}
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
