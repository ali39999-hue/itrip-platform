'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES, COUNTRY_ORDER, countryName, type CountryId } from '@/lib/countries';
import { MapPin, ChevronDown, Check } from 'lucide-react';

import { useTranslations } from 'next-intl';

export function CountrySwitcher() {
  const t = useTranslations('Common');
  const { country, setCountry } = useCountryStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const c = COUNTRIES[country];

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
        aria-label={t('Common.aria.destinationCountry')}
        className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-black text-brand-dark bg-brand/10 hover:bg-brand/20 transition border-0 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
      >
        <MapPin size={14} className="text-brand-dark" />
        <span>{c?.flag} {countryName(country, locale)}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="listbox" className="absolute top-[calc(100%+8px)] end-0 z-90 w-52 p-1.5 border border-line rounded-xl bg-surface shadow-elev-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {COUNTRY_ORDER.map((id: CountryId) => (
            <button
              key={id}
              onClick={() => { setCountry(id); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-[13px] font-bold transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                id === country ? 'bg-mint text-brand-dark' : 'text-ink hover:bg-soft'
              }`}
            >
              <span>{COUNTRIES[id].flag}</span>
              <span className="flex-1 text-start">{countryName(id, locale)}</span>
              <span dir="ltr" className="text-[10px] text-sub font-mono">{COUNTRIES[id].currency}</span>
              {id === country && <Check size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
