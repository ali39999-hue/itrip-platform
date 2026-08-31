'use client';

import { useLocale } from 'next-intl';
import { Plus, Users, ShieldAlert, CreditCard, Ban } from 'lucide-react';
import { lt, LText } from '@/lib/lt';

const ACTIONS: { id: string; label: LText; icon: typeof Plus; bg: string }[] = [
  { id: 'new_booking', label: { fa: 'ثبت رزرو آفلاین', en: 'Offline Booking', ar: 'حجز دون اتصال', zh: '线下预订登记', ru: 'Офлайн-бронирование' }, icon: Plus, bg: 'bg-brand text-surface hover:bg-brand-2' },
  { id: 'new_user', label: { fa: 'افزودن کاربر همکار', en: 'Add Staff User', ar: 'إضافة مستخدم موظف', zh: '添加员工账号', ru: 'Добавить сотрудника' }, icon: Users, bg: 'bg-surface border border-line text-ink hover:border-brand hover:text-brand-dark' },
  { id: 'manual_payment', label: { fa: 'ثبت پرداخت دستی', en: 'Manual Payment', ar: 'تسجيل دفعة يدوية', zh: '手动登记支付', ru: 'Ручной платёж' }, icon: CreditCard, bg: 'bg-surface border border-line text-ink hover:border-brand hover:text-brand-dark' },
  { id: 'block_capacity', label: { fa: 'بلاک ظرفیت', en: 'Block Capacity', ar: 'حجز السعة', zh: '锁定库存', ru: 'Блокировка квоты' }, icon: Ban, bg: 'bg-surface border border-line text-ink hover:border-brand hover:text-brand-dark' },
  { id: 'system_alert', label: { fa: 'اعلان سراسری', en: 'Global Announcement', ar: 'إعلان عام', zh: '全站公告', ru: 'Общее оповещение' }, icon: ShieldAlert, bg: 'bg-rose-warm/10 text-rose-warm border border-transparent hover:border-rose-warm/30' },
];

export function QuickActionsBar() {
  const locale = useLocale();
  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
      {ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.id}
            className={`shrink-0 min-h-11 px-5 rounded-xl text-[13px] font-black inline-flex items-center gap-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${a.bg}`}
          >
            <Icon size={16} /> {lt(locale, a.label)}
          </button>
        );
      })}
    </div>
  );
}
