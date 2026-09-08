'use client';

import { Sparkles, Plane, BedDouble, Compass } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

export const SEARCH_TABS = [
  { id: 'flights', labelKey: 'tabFlights', routeMode: true, Icon: Plane },
  { id: 'hotels', labelKey: 'tabHotels', routeMode: false, Icon: BedDouble },
  { id: 'tours', labelKey: 'tabTours', routeMode: false, Icon: Compass },
  { id: 'plan', labelKey: 'tabPlan', routeMode: false, Icon: Sparkles },
] as const;

export type SearchTabId = (typeof SEARCH_TABS)[number]['id'];

interface SearchModeTabsProps {
  activeTab: SearchTabId;
  onTabChange: (tab: SearchTabId) => void;
}

export function SearchModeTabs({ activeTab, onTabChange }: SearchModeTabsProps) {
  const t = useTranslations('Search');
  const locale = useLocale();

  return (
    <div className="flex justify-center w-full mb-5">
      <div
        role="tablist"
        aria-label={lt(locale, { fa: 'نوع جستجوی سفر', en: 'Travel search mode', ar: 'نوع البحث عن الرحلات', zh: '出行搜索模式', ru: 'Режим поиска путешествий' })}
        className="w-full sm:w-auto grid grid-cols-4 sm:flex sm:items-center gap-1 sm:gap-1.5 p-1.5 rounded-2xl bg-soft/80 border border-line/60 shadow-2xs"
      >
        {SEARCH_TABS.map(({ id, labelKey, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              id={`search-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(id)}
              className={`min-h-[44px] px-2 sm:px-5 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-xl transition-all font-black text-[11.5px] sm:text-[13.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer ${
                active
                  ? 'bg-brand-dark text-surface shadow-md shadow-brand/25'
                  : 'text-ink/80 hover:text-brand-dark hover:bg-surface/60'
              }`}
            >
              <Icon size={16} className={active ? 'text-surface' : 'text-sub'} aria-hidden="true" />
              <span className="text-center leading-tight line-clamp-2">{t(labelKey)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
