'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { MapPin, Check } from 'lucide-react';
import { CITIES } from '@/lib/data';
import { useCountryStore } from '@/stores/country-store';
import { countryName } from '@/lib/countries';

interface CityAutocompleteProps {
  value: string;
  onChange: (city: string) => void;
  label: string;
  placeholder: string;
  className?: string;
  id?: string;
}

export function CityAutocomplete({
  value,
  onChange,
  label,
  placeholder,
  className = '',
  id = 'city-autocomplete',
}: CityAutocompleteProps) {
  const locale = useLocale();
  const { country } = useCountryStore();
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentCountryCities = CITIES.filter(
    (c) => c.countryId === country || !c.countryId
  );

  const filteredCities = value.trim()
    ? currentCountryCities.filter(
        (c) =>
          c.nameFa.includes(value.trim()) ||
          c.nameEn.toLowerCase().includes(value.trim().toLowerCase())
      )
    : currentCountryCities;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('pointerdown', onDoc);
      return () => document.removeEventListener('pointerdown', onDoc);
    }
  }, [open]);

  function handleSelect(cityName: string) {
    onChange(cityName);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((prev) => (prev + 1) % (filteredCities.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((prev) => (prev - 1 + (filteredCities.length || 1)) % (filteredCities.length || 1));
    } else if (e.key === 'Enter' && filteredCities[highlightIdx]) {
      e.preventDefault();
      const selected = locale === 'en' ? filteredCities[highlightIdx].nameEn : filteredCities[highlightIdx].nameFa;
      handleSelect(selected);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full min-h-[58px] px-3.5 py-2 rounded-2xl bg-surface border border-line/80 hover:border-brand focus-within:border-brand focus-within:ring-2 focus-within:ring-brand flex items-center gap-2.5 transition ${className}`}
    >
      <MapPin size={18} className="text-brand-dark shrink-0" aria-hidden="true" />
      <div className="w-full min-w-0 flex flex-col justify-center">
        <label htmlFor={id} className="block text-[11px] font-bold text-sub select-none leading-none mb-1">
          {label}
        </label>
        <input
          ref={inputRef}
          id={id}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlightIdx(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          className="w-full bg-transparent border-0 outline-0 p-0 text-[13px] font-bold text-ink placeholder:text-sub focus:ring-0 leading-tight"
        />
      </div>

      {open && filteredCities.length > 0 && (
        <div
          role="listbox"
          className="absolute top-[calc(100%+8px)] start-0 z-[100] w-full min-w-[240px] max-h-60 overflow-y-auto p-1.5 rounded-2xl bg-surface border border-line shadow-elev-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="px-2 py-1 text-[11px] font-bold text-sub border-b border-line/50 mb-1">
            {locale === 'en' ? `Cities in ${countryName(country, locale)}` : `شهرهای ${countryName(country, locale)}`}
          </div>
          {filteredCities.map((city, idx) => {
            const cityName = locale === 'en' ? city.nameEn : city.nameFa;
            const isSelected = value === cityName;
            const isHighlighted = idx === highlightIdx;
            return (
              <button
                key={city.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(cityName)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-bold transition text-start ${
                  isHighlighted || isSelected
                    ? 'bg-mint text-brand-dark'
                    : 'text-ink hover:bg-soft'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin size={14} className={isSelected ? 'text-brand-dark' : 'text-sub'} />
                  <span>{cityName}</span>
                  {city.nameEn !== cityName && (
                    <span className="text-[11px] text-sub">({city.nameEn})</span>
                  )}
                </div>
                {isSelected && <Check size={14} className="text-brand-dark" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
