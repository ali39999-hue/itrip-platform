'use client';

import { Sparkles, Plane, BedDouble, Compass } from 'lucide-react';
import { useTranslations } from 'next-intl';

export const SEARCH_TABS = [
  { id: 'plan', labelKey: 'tabPlan', routeMode: false, Icon: Sparkles },
  { id: 'flights', labelKey: 'tabFlights', routeMode: true, Icon: Plane },
  { id: 'hotels', labelKey: 'tabHotels', routeMode: false, Icon: BedDouble },
  { id: 'tours', labelKey: 'tabTours', routeMode: false, Icon: Compass },
] as const;

export type SearchTabId = (typeof SEARCH_TABS)[number]['id'];

interface SearchModeTabsProps {
  activeTab: SearchTabId;
  onTabChange: (tab: SearchTabId) => void;
}

export function SearchModeTabs({ activeTab, onTabChange }: SearchModeTabsProps) {
  const t = useTranslations('Search');

  return (
    <div className="flex justify-start md:justify-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-soft/80 border border-line/60">
        {SEARCH_TABS.map(({ id, labelKey, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(id)}
              className={`shrink-0 min-h-[42px] px-4 md:px-5 inline-flex items-center gap-2 rounded-xl transition-all font-black text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                active
                  ? 'bg-brand text-surface shadow-md shadow-brand/25 scale-[1.02]'
                  : 'text-sub hover:text-brand-dark hover:bg-surface/60'
              }`}
            >
              <Icon size={16} className={active ? 'text-surface' : 'text-sub'} />
              {t(labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
