'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { MousePointerClick, Eye, Route, MonitorSmartphone, Loader2, Clock } from 'lucide-react';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import { ErpSectionCard, ErpStatCard, ErpEmptyState, ErpBadge } from '@/components/admin/erp-ui';
import { getUserBehaviorAction } from '@/actions/behavior';
import type { UserBehaviorSummary } from '@/domains/behavior/BehaviorAnalyticsService';

/**
 * Per-user behavior / heatmap tab inside Customer 360.
 * Responsive: stats auto-grid, hourly bars scroll-x on mobile, sessions +
 * recent events transform table → cards under md (skill §9).
 */
export function UserBehaviorTab({ userId }: { userId: string }) {
  const locale = useLocale();
  const [data, setData] = useState<UserBehaviorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getUserBehaviorAction(userId, days)
      .then((res) => {
        if (!cancelled && res.success) setData(res.data as unknown as UserBehaviorSummary);
        if (!cancelled && !res.success) setData(null);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, days]);

  if (loading) {
    return (
      <div className="grid place-items-center py-16 text-sub" role="status" aria-live="polite">
        <Loader2 size={28} className="animate-spin" />
        <span className="mt-2 text-xs font-bold">
          {lt(locale, { fa: 'در حال بارگذاری نقشه رفتاری…', en: 'Loading behavior map…' })}
        </span>
      </div>
    );
  }

  if (!data || data.totalEvents === 0) {
    return (
      <ErpEmptyState
        icon={<Route size={32} className="text-line" />}
        title={lt(locale, { fa: 'هنوز ردپای رفتاری ثبت نشده', en: 'No behavior trail yet' })}
        description={lt(locale, {
          fa: 'به‌محض اینکه کاربر در سایت یا اپ بچرخد (بازدید صفحه، کلیک، اسکرول)، سفر و هیت‌مپ او اینجا نمایش داده می‌شود.',
          en: 'Page views, clicks and scrolls will appear here once the user browses.',
        })}
      />
    );
  }

  const maxHour = Math.max(1, ...data.hourlyHistogram.map((h) => h.count));

  return (
    <div className="space-y-6">
      {/* Range filter */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label="range">
        {([7, 30, 90] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            aria-pressed={days === d}
            className={`min-h-[44px] shrink-0 snap-x rounded-full px-4 text-xs font-black transition active:scale-[0.98] ${
              days === d ? 'bg-brand text-white' : 'bg-soft text-sub hover:text-ink'
            }`}
          >
            {d === 7
              ? lt(locale, { fa: '۷ روز اخیر', en: 'Last 7 days' })
              : d === 30
                ? lt(locale, { fa: '۳۰ روز اخیر', en: 'Last 30 days' })
                : lt(locale, { fa: '۹۰ روز اخیر', en: 'Last 90 days' })}
          </button>
        ))}
        {data.lastActiveAt && (
          <span className="ms-auto flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-sub">
            <Clock size={13} />
            {lt(locale, { fa: 'آخرین فعالیت:', en: 'Last active:' })}{' '}
            {new Date(data.lastActiveAt).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}
          </span>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ErpStatCard
          icon={<Eye size={18} />}
          label={lt(locale, { fa: 'بازدید صفحات', en: 'Page views' })}
          value={num(data.pageViews, locale)}
          hint={`${num(data.uniqueRoutes, locale)} ${lt(locale, { fa: 'مسیر یکتا', en: 'unique routes' })}`}
          tone="brand"
        />
        <ErpStatCard
          icon={<MousePointerClick size={18} />}
          label={lt(locale, { fa: 'کلیک‌ها', en: 'Clicks' })}
          value={num(data.clicks, locale)}
          hint={`${num(data.scrolls, locale)} ${lt(locale, { fa: 'اسکرول', en: 'scrolls' })}`}
          tone="gold"
        />
        <ErpStatCard
          icon={<Route size={18} />}
          label={lt(locale, { fa: 'نشست‌ها', en: 'Sessions' })}
          value={num(data.sessionsCount, locale)}
          hint={`${num(data.funnelEvents, locale)} ${lt(locale, { fa: 'رویداد قیف', en: 'funnel events' })}`}
          tone="green"
        />
        <ErpStatCard
          icon={<MonitorSmartphone size={18} />}
          label={lt(locale, { fa: 'دستگاه غالب', en: 'Top device' })}
          value={data.deviceSplit[0]?.device ?? '—'}
          hint={data.deviceSplit.map((d) => `${d.device}: ${num(d.count, locale)}`).join(' · ') || '—'}
          tone="neutral"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top routes */}
        <ErpSectionCard
          title={lt(locale, { fa: 'کجا می‌رود؟ — پر بازدیدترین مسیرها', en: 'Where they go — top routes' })}
          subtitle={lt(locale, { fa: 'مسیرهای نرمال‌شده بدون کوئری (حریم خصوصی)', en: 'Normalized routes, query-free' })}
          icon={<Route size={16} />}
        >
          <ul className="space-y-2.5">
            {data.topRoutes.map((r) => {
              const pct = data.pageViews + data.clicks > 0 ? (r.count / data.totalEvents) * 100 : 0;
              return (
                <li key={r.route}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <code dir="ltr" className="min-w-0 flex-1 truncate rounded-lg bg-soft px-2 py-1.5 font-mono text-[11px] text-ink">
                      {r.route}
                    </code>
                    <span className="font-en shrink-0 font-bold tabular-nums text-ink">{num(r.count, locale)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-soft" aria-hidden="true">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, Math.max(4, pct))}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </ErpSectionCard>

        {/* Hourly heat */}
        <ErpSectionCard
          title={lt(locale, { fa: 'چه ساعتی فعال است؟ — هیت‌مپ ساعتی', en: 'When active — hourly heat' })}
          subtitle={lt(locale, { fa: 'توزیع ۲۴ ساعته فعالیت', en: '24-hour activity distribution' })}
          icon={<Clock size={16} />}
        >
          <div dir="ltr" className="flex h-28 items-end gap-1 overflow-x-auto no-scrollbar" role="img" aria-label="hourly">
            {data.hourlyHistogram.map((h) => (
              <div key={h.hour} className="flex min-w-[14px] flex-1 flex-col items-center gap-1" title={`${h.hour}:00 — ${h.count}`}>
                <div
                  className="w-full rounded-t-md bg-brand/80"
                  style={{ height: `${Math.max(4, (h.count / maxHour) * 96)}px`, opacity: 0.25 + 0.75 * (h.count / maxHour) }}
                />
                {h.hour % 3 === 0 && <span className="font-en text-[9px] tabular-nums text-sub">{h.hour}</span>}
              </div>
            ))}
          </div>
        </ErpSectionCard>
      </div>

      {/* Sessions + recent */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ErpSectionCard
          title={lt(locale, { fa: 'نشست‌های اخیر — سفر کاربر', en: 'Recent sessions — journey' })}
          subtitle={lt(locale, { fa: 'به ترتیب زمانی معکوس', en: 'Reverse chronological' })}
          icon={<Route size={16} />}
        >
          {data.sessions.length === 0 ? (
            <p className="py-4 text-center text-xs text-sub">—</p>
          ) : (
            <ol className="space-y-3">
              {data.sessions.slice(0, 8).map((s) => (
                <li key={s.sessionId} className="rounded-2xl border border-border/70 p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <code dir="ltr" className="font-mono text-[11px] text-sub">#{s.sessionId}…</code>
                    <ErpBadge tone="neutral">
                      {num(s.eventCount, locale)} {lt(locale, { fa: 'رویداد', en: 'events' })}
                    </ErpBadge>
                  </div>
                  <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-ink" dir="ltr">
                    {s.routes.join('  ←  ')}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-sub">
                    {new Date(s.startedAt).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </ErpSectionCard>

        <ErpSectionCard
          title={lt(locale, { fa: 'آخرین گام‌ها — چه کاری می‌کند؟', en: 'Latest steps — what they do' })}
          subtitle={lt(locale, { fa: '۶۰ رویداد اخیر', en: 'Last 60 events' })}
          icon={<MousePointerClick size={16} />}
        >
          {/* Desktop table */}
          <table className="hidden w-full text-xs md:table">
            <thead>
              <tr className="border-b border-line font-black text-sub">
                <th className="px-2 py-2 text-start">{lt(locale, { fa: 'نوع', en: 'Type' })}</th>
                <th className="px-2 py-2 text-start">{lt(locale, { fa: 'مسیر', en: 'Route' })}</th>
                <th className="px-2 py-2 text-start">{lt(locale, { fa: 'زمان', en: 'Time' })}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {data.recent.slice(0, 20).map((e) => (
                <tr key={e.id} className="hover:bg-soft/50">
                  <td className="px-2 py-2">
                    <ErpBadge tone={e.type === 'CLICK' ? 'gold' : e.type === 'PAGE_VIEW' ? 'brand' : 'neutral'}>
                      {e.type}
                    </ErpBadge>
                  </td>
                  <td dir="ltr" className="max-w-[220px] truncate px-2 py-2 font-mono text-[11px] text-ink">{e.route}</td>
                  <td className="px-2 py-2 font-mono text-[10px] text-sub">
                    {new Date(e.createdAt).toLocaleTimeString(locale === 'fa' ? 'fa-IR' : 'en-US')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Mobile cards */}
          <ul className="space-y-2 md:hidden">
            {data.recent.slice(0, 20).map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 rounded-2xl border border-border/70 p-3">
                <div className="min-w-0">
                  <ErpBadge tone={e.type === 'CLICK' ? 'gold' : e.type === 'PAGE_VIEW' ? 'brand' : 'neutral'}>
                    {e.type}
                  </ErpBadge>
                  <p dir="ltr" className="mt-1 truncate font-mono text-[11px] text-ink">{e.route}</p>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-sub">
                  {new Date(e.createdAt).toLocaleTimeString(locale === 'fa' ? 'fa-IR' : 'en-US')}
                </span>
              </li>
            ))}
          </ul>
        </ErpSectionCard>
      </div>
    </div>
  );
}
