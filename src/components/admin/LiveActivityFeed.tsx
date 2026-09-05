'use client';

import { useLocale } from 'next-intl';
import { Activity, CreditCard, ShieldAlert, User, BriefcaseBusiness, Inbox } from 'lucide-react';
import { lt } from '@/lib/lt';

/** Server-mapped shape coming from BookingStatusHistory + AuditLog rows. */
export interface LiveEventDTO {
  id: string;
  kind: 'booking' | 'payment' | 'auth' | 'alert';
  title: string;
  actor: string;
  at: string;
}

const EVENT_META = {
  booking: { icon: BriefcaseBusiness, color: 'text-brand bg-brand/10' },
  payment: { icon: CreditCard, color: 'text-success bg-success/10' },
  auth: { icon: User, color: 'text-sub bg-soft' },
  alert: { icon: ShieldAlert, color: 'text-price bg-gold-soft' },
};

function formatTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }).format(new Date(iso));
}

export function LiveActivityFeed({ events }: { events: LiveEventDTO[] }) {
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
        {events.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Inbox size={28} className="mx-auto text-sub" />
            <p className="text-[13px] font-black text-ink">
              {lt(locale, { fa: 'هنوز رخدادی ثبت نشده است', en: 'No activity recorded yet', ar: 'لا يوجد نشاط حتى الآن', zh: '暂无活动记录', ru: 'Активность пока не зафиксирована' })}
            </p>
            <p className="text-[11px] font-bold text-sub">
              {lt(locale, { fa: 'تغییر وضعیت رزروها و رویدادهای ممیزی به‌صورت زنده اینجا نمایش داده می‌شوند', en: 'Booking transitions and audit events stream here live', ar: 'تظهر أحداث الحجز والتدقيق هنا', zh: '预订流转和审计事件将在此实时显示', ru: 'Переходы бронирований и события аудита появятся здесь' })}
            </p>
          </div>
        ) : (
          <div className="relative border-s-2 border-line/50 ps-4 space-y-6">
            {events.map((ev) => {
              const meta = EVENT_META[ev.kind];
              const Icon = meta.icon;

              return (
                <div key={ev.id} className="relative">
                  <span className={`absolute -start-[27px] w-6 h-6 rounded-full flex items-center justify-center border-2 border-surface ${meta.color}`}>
                    <Icon size={12} />
                  </span>
                  <div>
                    <b className="block text-[13px] font-black text-ink mb-1" dir="auto">{ev.title}</b>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-sub">
                      <span dir="auto">{ev.actor}</span>
                      <span className="w-1 h-1 rounded-full bg-line/80" />
                      <span>{formatTime(ev.at, locale)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
