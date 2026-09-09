'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES, COUNTRY_ORDER, countryName, type CountryId } from '@/lib/countries';
import { MapPin, ChevronDown, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function CountrySwitcher({ showFullName = false }: { showFullName?: boolean }) {
  const t = useTranslations('Common');
  const { country, setCountry } = useCountryStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const c = COUNTRIES[country] || COUNTRIES.iran;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('pointerdown', onDoc);
      return () => document.removeEventListener('pointerdown', onDoc);
    }
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t('aria.destinationCountry')}
        className="min-h-[38px] inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-[12px] sm:text-[13px] font-black text-brand-dark bg-brand/10 hover:bg-brand/20 transition border border-transparent focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none cursor-pointer"
      >
        <MapPin size={14} className="text-brand-dark shrink-0" aria-hidden="true" />
        <span className="text-sm leading-none" aria-hidden="true">{c?.flag}</span>
        <span className={`font-bold text-ink text-[12px] sm:text-[12.5px] ${showFullName ? 'inline' : 'hidden md:inline'}`}>
          {countryName(country, locale)}
        </span>
        <ChevronDown size={12} className={`text-sub shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={t('aria.destinationCountry')}
          className="absolute top-[calc(100%+8px)] start-0 z-[100] w-56 p-1.5 border border-line rounded-xl bg-surface shadow-elev-3 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          {COUNTRY_ORDER.map((id: CountryId) => (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={id === country}
              onClick={() => { setCountry(id); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-[12.5px] sm:text-[13px] font-bold transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none cursor-pointer ${
                id === country ? 'bg-mint text-brand-dark' : 'text-ink hover:bg-soft'
              }`}
            >
              <span className="text-sm">{COUNTRIES[id].flag}</span>
              <span className="flex-1 text-start">{countryName(id, locale)}</span>
              <span dir="ltr" className="text-[10.5px] text-sub font-mono font-bold">{COUNTRIES[id].currency}</span>
              {id === country && <Check size={14} className="text-brand-dark shrink-0" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
