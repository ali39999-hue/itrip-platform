'use client';

import { useMemo } from 'react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';
import { cn } from '@/lib/utils';
import type { RouteHeatCell } from '@/domains/behavior/BehaviorAnalyticsService';

const GX = 24;
const GY = 12;

/**
 * CSS-only click-density heatmap (no extra deps — zero-collision policy).
 * - 24×12 grid over a schematic page outline; intensity → opacity.
 * - RTL-safe (uses inset logical positioning via left% which is intentional:
 *   click coordinates are physical, so LTR wrapper preserves fidelity).
 * - Responsive via @container: cells stay legible 320px → ultra-wide.
 */
export function HeatGrid({
  cells,
  totalClicks,
}: {
  cells: RouteHeatCell[];
  totalClicks: number;
}) {
  const locale = useLocale();
  const byKey = useMemo(() => {
    const m = new Map<string, RouteHeatCell>();
    for (const c of cells) m.set(`${c.gx}:${c.gy}`, c);
    return m;
  }, [cells]);

  if (totalClicks === 0) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="text-sm font-medium text-sub">
          {lt(locale, {
            fa: 'برای این مسیر هنوز کلیکی ثبت نشده است. بعد از چند بازدید، تراکم کلیک اینجا رنگ می‌گیرد.',
            en: 'No clicks recorded for this route yet. Density will appear after a few visits.',
            ar: 'لا توجد نقرات مسجلة لهذا المسار بعد.',
            zh: '此路径暂无点击数据。',
            ru: 'Кликов по этому маршруту пока нет.',
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="@container">
      <div
        dir="ltr"
        role="img"
        aria-label={lt(locale, { fa: 'هیت‌مپ تراکم کلیک', en: 'Click density heatmap' })}
        className="relative overflow-hidden rounded-2xl border border-border/80 bg-surface-elevated"
        data-heatmap-overlay
      >
        {/* Schematic page outline: header / hero / content rows */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 p-3">
          <div className="mx-auto h-6 w-11/12 rounded-md bg-ink/10" />
          <div className="mx-auto mt-2 h-16 w-11/12 rounded-xl bg-ink/8" />
          <div className="mx-auto mt-2 grid w-11/12 grid-cols-3 gap-2">
            <div className="h-10 rounded-lg bg-ink/8" />
            <div className="h-10 rounded-lg bg-ink/8" />
            <div className="h-10 rounded-lg bg-ink/8" />
          </div>
        </div>
        <div
          className="relative grid"
          style={{ gridTemplateColumns: `repeat(${GX}, minmax(0,1fr))`, aspectRatio: '2 / 1' }}
        >
          {Array.from({ length: GX * GY }).map((_, i) => {
            const gx = i % GX;
            const gy = Math.floor(i / GX);
            const cell = byKey.get(`${gx}:${gy}`);
            const intensity = cell?.intensity ?? 0;
            return (
              <div
                key={i}
                title={cell ? `${cell.count} clicks` : undefined}
                className={cn('border border-white/5')}
                style={{
                  backgroundColor:
                    intensity <= 0
                      ? 'transparent'
                      : `rgba(239, 68, 68, ${0.12 + intensity * 0.78})`,
                  boxShadow: intensity > 0.55 ? 'inset 0 0 12px rgba(239,68,68,.45)' : undefined,
                }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-surface/80 px-3 py-2 text-[11px] font-medium text-sub">
          <span className="font-en tabular-nums">{totalClicks} clicks</span>
          <span className="flex items-center gap-1.5" aria-hidden="true">
            <i className="h-2.5 w-2.5 rounded-sm bg-red-500/20" />
            <i className="h-2.5 w-2.5 rounded-sm bg-red-500/50" />
            <i className="h-2.5 w-2.5 rounded-sm bg-red-500" />
          </span>
        </div>
      </div>
    </div>
  );
}
