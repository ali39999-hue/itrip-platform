'use client';

import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PlanSearchFormProps {
  query: string;
  setQuery: (val: string) => void;
}

export function PlanSearchForm({ query, setQuery }: PlanSearchFormProps) {
  const t = useTranslations('Search');

  return (
    <>
      <div className="md:col-span-9 relative flex items-center min-h-[58px] px-4 rounded-2xl bg-surface border border-line/80 hover:border-brand focus-within:border-brand focus-within:ring-2 focus-within:ring-brand shadow-sm transition">
        <Sparkles size={20} className="text-gold shrink-0 animate-pulse me-3" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('promptPlaceholder')}
          className="w-full border-0 outline-0 p-0 text-[13.5px] font-bold text-ink placeholder:text-sub bg-transparent leading-tight"
          id="search-ai-prompt-input"
        />
      </div>

      <button
        type="submit"
        className="md:col-span-3 min-h-[58px] px-6 rounded-2xl bg-action hover:bg-action-hover text-ink text-[15px] font-black shadow-elev-1 hover:shadow-elev-2 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        <Sparkles size={18} />
        <span>{t('btnPlan')}</span>
      </button>
    </>
  );
}
