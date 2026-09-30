'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Clock, ArrowRight, RotateCcw } from 'lucide-react';
import { lt } from '@/lib/lt';
import {
  loadRecentFlightSearches,
  clearRecentFlightSearches,
  type RecentFlightSearch,
} from '@/lib/recent-searches';

interface RecentSearchChipsProps {
  /** Called with the picked entry; the host decides navigation or field fill. */
  onPick: (entry: RecentFlightSearch) => void;
  className?: string;
}

/**
 * Recent flight searches as horizontally scrollable chips.
 * Reads localStorage after mount (SSR renders nothing — no hydration risk).
 */
export function RecentSearchChips({ onPick, className = '' }: RecentSearchChipsProps) {
  const locale = useLocale();
  const [recents, setRecents] = useState<RecentFlightSearch[]>([]);

  useEffect(() => {
    setRecents(loadRecentFlightSearches());
  }, []);

  if (recents.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-black text-sub">
          {lt(locale, {
            fa: 'جستجوهای اخیر شما',
            en: 'Your recent searches',
            ar: 'عمليات البحث الأخيرة',
            zh: '最近搜索',
            ru: 'Недавние поиски',
          })}
        </span>
        <button
          type="button"
          onClick={() => {
            clearRecentFlightSearches();
            setRecents([]);
          }}
          className="min-h-[36px] px-2 inline-flex items-center gap-1 text-[11px] font-bold text-sub hover:text-rose-600 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-lg cursor-pointer"
        >
          <RotateCcw size={12} aria-hidden="true" />
          <span>
            {lt(locale, { fa: 'پاک کردن', en: 'Clear', ar: 'مسح', zh: '清除', ru: 'Очистить' })}
          </span>
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {recents.map((r) => (
          <button
            key={`${r.from}-${r.to}-${r.depart}`}
            type="button"
            onClick={() => {
              setRecents([]);
              onPick(r);
            }}
            className="shrink-0 min-h-[36px] inline-flex items-center gap-1.5 px-3 rounded-xl bg-surface border border-line text-[12px] font-bold text-ink hover:border-brand hover:text-brand-dark transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
          >
            <Clock size={12} className="text-sub shrink-0" aria-hidden="true" />
            <span className="max-w-[96px] truncate">{r.from}</span>
            <ArrowRight size={12} className="text-sub rtl:rotate-180 shrink-0" aria-hidden="true" />
            <span className="max-w-[96px] truncate">{r.to}</span>
            {r.depart && (
              <span className="text-[10px] font-mono text-sub" dir="ltr">
                {r.depart}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
