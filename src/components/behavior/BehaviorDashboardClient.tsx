'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { MousePointerClick, Eye, Users, Route, Loader2, TrendingUp } from 'lucide-react';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import {
  ErpPageHeader,
  ErpStatCard,
  ErpSectionCard,
  ErpEmptyState,
  ErpBadge,
} from '@/components/admin/erp-ui';
import { HeatGrid } from '@/components/behavior/HeatGrid';
import { getBehaviorOverviewAction, getRouteHeatmapAction } from '@/actions/behavior';
import type {
  BehaviorOverview,
  RouteHeatmap,
} from '@/domains/behavior/BehaviorAnalyticsService';

/**
 * ERP-wide behavior + heatmap dashboard (/admin/analytics/behavior).
 * - Overview: totals, top routes, daily trend.
 * - Per-route visual click heatmap with scroll-depth + selector breakdown.
 * - Responsive: stat grid collapses, tables become cards under md.
 */
export function BehaviorDashboardClient() {
  const locale = useLocale();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [overview, setOverview] = useState<BehaviorOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [heat, setHeat] = useState<RouteHeatmap | null>(null);
  const [heatLoading, setHeatLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getBehaviorOverviewAction(days)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          const data = res.data as unknown as BehaviorOverview;
          setOverview(data);
          if (!selectedRoute && data.topRoutes.length > 0 && data.topRoutes[0]) {
            setSelectedRoute(data.topRoutes[0].route);
          }
        } else {
          setOverview(null);
        }
      })
      .catch(() => {
        if (!cancelled) setOverview(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  useEffect(() => {
    if (!selectedRoute) {
      setHeat(null);
      return;
    }
    let cancelled = false;
    setHeatLoading(true);
    getRouteHeatmapAction(selectedRoute, days)
      .then((res) => {
        if (!cancelled && res.success) setHeat(res.data as unknown as RouteHeatmap);
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setHeatLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRoute, days]);

  const maxDay = Math.max(1, ...(overview?.eventsPerDay.map((d) => d.count) ?? [1]));

  return (
    <div className="space-y-6 pb-16">
      <ErpPageHeader
        eyebrow={lt(locale, {
          fa: 'تحلیل رفتار و هیت‌مپ',
          en: 'Behavior & Heatmap Analytics',
          ar: 'تحليل السلوك وخريطة الحرارة',
          zh: '行为与热力图分析',
          ru: 'Аналитика поведения и тепловая карта',
        })}
        title={lt(locale, { fa: 'کاربرها کجا می‌روند و چه می‌کنند؟', en: 'Where users go & what they do' })}
        description={lt(locale, {
          fa: 'نمای تجمیعی سفر کاربران، تراکم کلیک هر مسیر و عمق اسکرول — بدون PII، با احترام به DNT.',
          en: 'Aggregate journeys, per-route click density and scroll depth — PII-free, DNT-aware.',
        })}
        icon={<TrendingUp size={22} className="text-mint-bright" />}
      />

      {/* Range */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {([7, 30, 90] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            aria-pressed={days === d}
            className={`min-h-[44px] shrink-0 rounded-full px-4 text-xs font-black transition active:scale-[0.98] ${
              days === d ? 'bg-brand text-white' : 'bg-surface text-sub hover:text-ink'
            } border border-border/60`}
          >
            {d === 7
              ? lt(locale, { fa: '۷ روز', en: '7 days' })
              : d === 30
                ? lt(locale, { fa: '۳۰ روز', en: '30 days' })
                : lt(locale, { fa: '۹۰ روز', en: '90 days' })}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid place-items-center py-16 text-sub" role="status">
          <Loader2 size={28} className="animate-spin" />
        </div>
      ) : !overview || overview.totalEvents === 0 ? (
        <ErpEmptyState
          icon={<Route size={32} className="text-line" />}
          title={lt(locale, { fa: 'هنوز داده‌ای ثبت نشده', en: 'No behavior data yet' })}
          description={lt(locale, {
            fa: 'ترکر از همین نسخه روی همه صفحات فعال است؛ بعد از چند بازدید واقعی، هیت‌مپ اینجا جان می‌گیرد.',
            en: 'The tracker is live from this release — the heatmap fills after real visits.',
          })}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ErpStatCard icon={<Eye size={18} />} label={lt(locale, { fa: 'بازدید صفحات', en: 'Page views' })} value={num(overview.pageViews, locale)} tone="brand" hint={`${num(overview.totalEvents, locale)} ${lt(locale, { fa: 'رویداد کل', en: 'total events' })}`} />
            <ErpStatCard icon={<MousePointerClick size={18} />} label={lt(locale, { fa: 'کلیک‌ها', en: 'Clicks' })} value={num(overview.clicks, locale)} tone="gold" hint={overview.pageViews > 0 ? `${num(Math.round((overview.clicks / Math.max(1, overview.pageViews)) * 100), locale)}٪ ${lt(locale, { fa: 'کلیک به ازای بازدید', en: 'clicks/view' })}` : '—'} />
            <ErpStatCard icon={<Users size={18} />} label={lt(locale, { fa: 'کاربران فعال لاگین‌کرده', en: 'Logged-in actives' })} value={num(overview.activeUsers, locale)} tone="green" />
            <ErpStatCard icon={<Route size={18} />} label={lt(locale, { fa: 'مسیرهای پربازدید', en: 'Top routes' })} value={num(overview.topRoutes.length, locale)} tone="neutral" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top routes selector */}
            <ErpSectionCard
              title={lt(locale, { fa: 'پربازدیدترین مسیرها — انتخاب برای هیت‌مپ', en: 'Top routes — pick for heatmap' })}
              icon={<Route size={16} />}
            >
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {overview.topRoutes.slice(0, 8).map((r) => (
                  <button
                    key={r.route}
                    onClick={() => setSelectedRoute(r.route)}
                    aria-pressed={selectedRoute === r.route}
                    className={`min-h-[44px] shrink-0 snap-x rounded-full px-3.5 font-mono text-[11px] transition active:scale-[0.98] ${
                      selectedRoute === r.route ? 'bg-brand text-white' : 'bg-soft text-ink hover:bg-line/50'
                    }`}
                    dir="ltr"
                  >
                    {r.route} · {r.views + r.clicks}
                  </button>
                ))}
              </div>
              {/* Desktop table */}
              <table className="mt-2 hidden w-full text-xs md:table">
                <thead>
                  <tr className="border-b border-line font-black text-sub">
                    <th className="px-2 py-2 text-start">{lt(locale, { fa: 'مسیر', en: 'Route' })}</th>
                    <th className="px-2 py-2 text-start">{lt(locale, { fa: 'بازدید', en: 'Views' })}</th>
                    <th className="px-2 py-2 text-start">{lt(locale, { fa: 'کلیک', en: 'Clicks' })}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40">
                  {overview.topRoutes.map((r) => (
                    <tr key={r.route} className={selectedRoute === r.route ? 'bg-mint/20' : 'hover:bg-soft/50'}>
                      <td dir="ltr" className="max-w-[260px] truncate px-2 py-2 font-mono text-[11px] text-ink">{r.route}</td>
                      <td className="font-en px-2 py-2 font-bold tabular-nums">{num(r.views, locale)}</td>
                      <td className="font-en px-2 py-2 font-bold tabular-nums">{num(r.clicks, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Mobile cards */}
              <ul className="mt-2 space-y-2 md:hidden">
                {overview.topRoutes.map((r) => (
                  <li key={r.route}>
                    <button
                      onClick={() => setSelectedRoute(r.route)}
                      className={`flex w-full items-center justify-between gap-2 rounded-2xl border p-3 text-start active:scale-[0.98] ${selectedRoute === r.route ? 'border-brand bg-mint/20' : 'border-border/70'}`}
                    >
                      <code dir="ltr" className="min-w-0 flex-1 truncate font-mono text-[11px]">{r.route}</code>
                      <span className="font-en shrink-0 text-[11px] font-bold tabular-nums">{num(r.views, locale)}v · {num(r.clicks, locale)}c</span>
                    </button>
                  </li>
                ))}
              </ul>
            </ErpSectionCard>

            {/* Daily trend */}
            <ErpSectionCard
              title={lt(locale, { fa: 'روند روزانه رویدادها', en: 'Daily event trend' })}
              icon={<TrendingUp size={16} />}
            >
              <div dir="ltr" className="flex h-32 items-end gap-1 overflow-x-auto no-scrollbar" role="img" aria-label="daily trend">
                {overview.eventsPerDay.map((d) => (
                  <div key={d.day} className="flex min-w-[16px] flex-1 flex-col items-center gap-1" title={`${d.day} — ${d.count}`}>
                    <div className="w-full rounded-t-md bg-brand/80" style={{ height: `${Math.max(4, (d.count / maxDay) * 110)}px`, opacity: 0.3 + 0.7 * (d.count / maxDay) }} />
                    <span className="font-en text-[8px] tabular-nums text-sub">{d.day.slice(5)}</span>
                  </div>
                ))}
              </div>
            </ErpSectionCard>
          </div>

          {/* Per-route heatmap */}
          <ErpSectionCard
            title={lt(locale, { fa: `هیت‌مپ کلیک: ${selectedRoute || '—'}`, en: `Click heatmap: ${selectedRoute || '—'}` })}
            subtitle={lt(locale, {
              fa: 'مختصات نرمال‌شده ۰ تا ۱۰۰؛ هر سلول تراکم نسبی را نشان می‌دهد. کلیک‌ها فیزیکی‌اند و در RTL هم جابه‌جا نمی‌شوند.',
              en: 'Normalized 0–100 coords; cells show relative density. Physical coords, stable in RTL.',
            })}
            icon={<MousePointerClick size={16} />}
          >
            {heatLoading ? (
              <div className="grid place-items-center py-10 text-sub" role="status">
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : heat ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <div className="lg:col-span-3">
                  <HeatGrid cells={heat.cells} totalClicks={heat.totalClicks} />
                  <p className="mt-2 text-[11px] font-medium text-sub">
                    {lt(locale, { fa: 'بازدید:', en: 'Views:' })} <span className="font-en font-bold tabular-nums">{num(heat.totalViews, locale)}</span>
                    {' · '}
                    {lt(locale, { fa: 'کلیک:', en: 'Clicks:' })} <span className="font-en font-bold tabular-nums">{num(heat.totalClicks, locale)}</span>
                  </p>
                </div>
                <div className="space-y-4 lg:col-span-2">
                  <div>
                    <h4 className="mb-2 text-xs font-black text-ink">{lt(locale, { fa: 'عمق اسکرول', en: 'Scroll depth' })}</h4>
                    <ul className="space-y-1.5">
                      {heat.scrollDepth.map((s) => (
                        <li key={s.pct} className="flex items-center gap-2 text-xs">
                          <span className="font-en w-10 shrink-0 tabular-nums text-sub">{s.pct}٪</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-soft" aria-hidden="true">
                            <div className="h-full rounded-full bg-gold" style={{ width: `${heat.totalViews > 0 ? Math.min(100, (s.count / Math.max(1, heat.totalViews)) * 100) : 0}%` }} />
                          </div>
                          <span className="font-en w-10 shrink-0 text-end tabular-nums">{num(s.count, locale)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="mb-2 text-xs font-black text-ink">{lt(locale, { fa: 'پرتکرارترین عناصر', en: 'Top elements' })}</h4>
                    {heat.topSelectors.length === 0 ? (
                      <p className="text-[11px] text-sub">—</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {heat.topSelectors.map((s) => (
                          <li key={s.selector} className="flex items-center justify-between gap-2 rounded-xl bg-soft px-2.5 py-2 text-[11px]">
                            <code dir="ltr" className="min-w-0 flex-1 truncate font-mono text-ink">{s.selector}</code>
                            <ErpBadge tone="neutral"><span className="font-en tabular-nums">{num(s.count, locale)}</span></ErpBadge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-sub">
                {lt(locale, { fa: 'مسیری انتخاب نشده است.', en: 'No route selected.' })}
              </p>
            )}
          </ErpSectionCard>
        </>
      )}
    </div>
  );
}
