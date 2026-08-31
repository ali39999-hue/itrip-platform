'use client';

import { useLocale } from 'next-intl';
import { LIVE_FEED } from '@/lib/admin-mock';
import { Activity, CreditCard, ShieldAlert, User, BriefcaseBusiness } from 'lucide-react';
import { lt } from '@/lib/lt';

const EVENT_META = {
  booking: { icon: BriefcaseBusiness, color: 'text-brand bg-brand/10' },
  payment: { icon: CreditCard, color: 'text-success bg-success/10' },
  login: { icon: User, color: 'text-sub bg-soft' },
  alert: { icon: ShieldAlert, color: 'text-price bg-gold-soft' },
};

export function LiveActivityFeed() {
  const locale = useLocale();
  return (
    <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b border-line flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Activity size={20} className="text-brand" />
          <h2 className="text-[16px] font-black text-ink m-0">{lt(locale, { fa: 'رخدادهای زنده (Live Feed)', en: 'Live Feed', ar: 'البث المباشر للأحداث', zh: '实时动态', ru: 'Живая лента' })}</h2>
        </div>
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand"></span>
        </span>
      </div>

      <div className="flex-1 p-5 overflow-y-auto">
        <div className="relative border-s-2 border-line/50 ps-4 space-y-6">
          {LIVE_FEED.map((ev) => {
            const meta = EVENT_META[ev.type];
            const Icon = meta.icon;

            return (
              <div key={ev.id} className="relative">
                <span className={`absolute -start-[27px] w-6 h-6 rounded-full flex items-center justify-center border-2 border-surface ${meta.color}`}>
                  <Icon size={12} />
                </span>
                <div>
                  <b className="block text-[13px] font-black text-ink mb-1">{ev.title}</b>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-sub">
                    <span>{ev.user}</span>
                    <span className="w-1 h-1 rounded-full bg-line/80" />
                    <span>{ev.time}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
