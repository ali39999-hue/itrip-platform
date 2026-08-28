'use client';

import { Plus, Users, ShieldAlert, CreditCard, Ban } from 'lucide-react';

const ACTIONS = [
  { id: 'new_booking', label: 'ثبت رزرو آفلاین', icon: Plus, bg: 'bg-brand text-surface hover:bg-brand-2' },
  { id: 'new_user', label: 'افزودن کاربر همکار', icon: Users, bg: 'bg-surface border border-line text-ink hover:border-brand hover:text-brand-dark' },
  { id: 'manual_payment', label: 'ثبت پرداخت دستی', icon: CreditCard, bg: 'bg-surface border border-line text-ink hover:border-brand hover:text-brand-dark' },
  { id: 'block_capacity', label: 'بلاک ظرفیت', icon: Ban, bg: 'bg-surface border border-line text-ink hover:border-brand hover:text-brand-dark' },
  { id: 'system_alert', label: 'اعلان سراسری', icon: ShieldAlert, bg: 'bg-rose-warm/10 text-rose-warm border border-transparent hover:border-rose-warm/30' },
];

export function QuickActionsBar() {
  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
      {ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.id}
            className={`shrink-0 min-h-11 px-5 rounded-xl text-[13px] font-black inline-flex items-center gap-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${a.bg}`}
          >
            <Icon size={16} /> {a.label}
          </button>
        );
      })}
    </div>
  );
}
