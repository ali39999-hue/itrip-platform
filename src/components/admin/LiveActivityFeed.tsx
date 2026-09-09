'use client';

import { useLocale } from 'next-intl';
import { Activity, CreditCard, ShieldAlert, User, BriefcaseBusiness, Inbox } from 'lucide-react';
import { lt } from '@/lib/lt';
import { ErpEmptyState } from './erp-ui';
import { cn } from '@/lib/utils';

/** Server-mapped shape coming from BookingStatusHistory + AuditLog rows. */
export interface LiveEventDTO {
  id: string;
  kind: 'booking' | 'payment' | 'auth' | 'alert';
  title: string;
  actor: string;
  at: string;
}

const EVENT_META = {
  booking: { icon: BriefcaseBusiness, tile: 'bg-brand/10 text-brand-dark', bar: 'bg-brand' },
  payment: { icon: CreditCard, tile: 'bg-success/10 text-success', bar: 'bg-success' },
  auth: { icon: User, tile: 'bg-soft text-sub', bar: 'bg-line' },
  alert: { icon: ShieldAlert, tile: 'bg-gold-soft text-price', bar: 'bg-gold' },
};

function formatTime(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function LiveActivityFeed({ events }: { events: LiveEventDTO[] }) {
  const locale = useLocale();
  return (
    <section aria-label={lt(locale, { fa: 'رخدادهای زنده', en: 'Live feed', ar: 'البث المباشر', zh: '实时动态', ru: 'Живая лента' })} className="flex h-full flex-col overflow-hidden rounded-2xl glass-card shine-card shadow-elev-1">
      <header className="flex items-center justify-between gap-3 border-b border-line/70 px-5 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-mint text-brand-dark">
            <Activity size={17} aria-hidden="true" />
          </span>
          <h2 className="truncate text-[15px] font-black text-ink">
            {lt(locale, { fa: 'رخدادهای زنده', en: 'Live Feed', ar: 'البث المباشر للأحداث', zh: '实时动态', ru: 'Живая лента' })}
          </h2>
        </div>
        <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true" title="Live">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
        </span>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {events.length === 0 ? (
          <ErpEmptyState
            icon={<Inbox size={26} aria-hidden="true" />}
            title={lt(locale, { fa: 'هنوز رخدادی ثبت نشده است', en: 'No activity recorded yet', ar: 'لا يوجد نشاط حتى الآن', zh: '暂无活动记录', ru: 'Активность пока не зафиксирована' })}
            description={lt(locale, { fa: 'تغییر وضعیت رزروها و رویدادهای ممیزی به‌صورت زنده اینجا نمایش داده می‌شوند.', en: 'Booking transitions and audit events stream here live.', ar: 'تظهر أحداث الحجز والتدقيق هنا.', zh: '预订流转和审计事件将在此实时显示。', ru: 'Переходы бронирований и события аудита появятся здесь.' })}
          />
        ) : (
          <ol className="relative space-y-1 border-s-2 border-line/60 ms-3 ps-0">
            {events.map((ev) => {
              const meta = EVENT_META[ev.kind];
              const Icon = meta.icon;
              return (
                <li key={ev.id} className="relative rounded-xl p-2.5 ps-8 transition hover:bg-soft/60">
                  <span className={cn('absolute start-0 top-3 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full border-2 border-surface shadow-xs', meta.tile)} aria-hidden="true">
                    <Icon size={13} />
                  </span>
                  <p className="text-[12.5px] leading-snug font-black text-ink" dir="auto">{ev.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-bold text-sub">
                    <span dir="auto" className="max-w-36 truncate">{ev.actor}</span>
                    <span aria-hidden="true" className="h-1 w-1 rounded-full bg-line" />
                    <time dateTime={ev.at} className="tabular-nums">{formatTime(ev.at, locale)}</time>
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
