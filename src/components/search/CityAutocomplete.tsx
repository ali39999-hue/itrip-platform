'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { MapPin, Check, Search, X, Plane, ChevronRight } from 'lucide-react';
import { CITIES } from '@/lib/data';
import { useCountryStore } from '@/stores/country-store';
import { countryNameL } from '@/components/home/sections/countryNames';
import { lt } from '@/lib/lt';

interface CityAutocompleteProps {
  value: string;
  onChange: (city: string) => void;
  label: string;
  placeholder: string;
  className?: string;
  id?: string;
}

const POPULAR_CITY_CODES = ['THR', 'IST', 'DXB', 'MHD', 'NJF', 'SYZ', 'TBZ', 'KIH'];

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
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const currentCountryCities = country
    ? CITIES.filter((c) => c.countryId === country)
    : CITIES;

  const candidateCities = currentCountryCities.length > 0 ? currentCountryCities : CITIES;

  // Desktop search uses input value; mobile uses mobileSearchQuery if open
  const activeSearch = open ? (mobileSearchQuery || value) : value;

  const filteredCities = activeSearch.trim()
    ? CITIES.filter(
        (c) =>
          c.nameFa.includes(activeSearch.trim()) ||
          c.nameEn.toLowerCase().includes(activeSearch.trim().toLowerCase()) ||
          c.airportCode.toLowerCase().includes(activeSearch.trim().toLowerCase())
      )
    : candidateCities;

  const popularCities = CITIES.filter((c) => POPULAR_CITY_CODES.includes(c.airportCode));

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      // Close desktop popover if clicked outside
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('pointerdown', onDoc);
      return () => document.removeEventListener('pointerdown', onDoc);
    }
  }, [open]);

  // Focus mobile input when mobile modal opens
  useEffect(() => {
    if (open) {
      setMobileSearchQuery('');
      const timer = setTimeout(() => {
        mobileInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  function handleSelect(cityName: string) {
    onChange(cityName);
    setOpen(false);
    setMobileSearchQuery('');
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
      const selected = locale === 'fa' ? filteredCities[highlightIdx].nameFa : filteredCities[highlightIdx].nameEn;
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
          onFocus={() => {
            setOpen(true);
            setMobileSearchQuery('');
          }}
          onClick={() => {
            setOpen(true);
            setMobileSearchQuery('');
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          className="w-full bg-transparent border-0 outline-0 p-0 text-[13px] font-bold text-ink placeholder:text-sub focus:ring-0 leading-tight"
        />
      </div>

      {/* ================= DESKTOP DROPDOWN (MD+) ================= */}
      {open && filteredCities.length > 0 && (
        <div
          id={`${id}-listbox`}
          role="listbox"
          className="hidden md:block absolute top-[calc(100%+8px)] start-0 z-[100] w-full min-w-[240px] max-h-64 overflow-y-auto p-1.5 rounded-2xl bg-surface border border-line shadow-elev-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="px-2 py-1 text-[11px] font-bold text-sub border-b border-line/50 mb-1">
            {lt(locale, {
              fa: `شهرهای ${countryNameL(country, locale)}`,
              en: `Cities in ${countryNameL(country, locale)}`,
              ar: `المدن في ${countryNameL(country, locale)}`,
              zh: `${countryNameL(country, locale)} 城市列表`,
              ru: `Города: ${countryNameL(country, locale)}`,
            })}
          </div>
          {filteredCities.map((city, idx) => {
            const cityName = locale === 'fa' ? city.nameFa : city.nameEn;
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
                  {city.airportCode && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-soft text-sub font-black">
                      {city.airportCode}
                    </span>
                  )}
                </div>
                {isSelected && <Check size={14} className="text-brand-dark" />}
              </button>
            );
          })}
        </div>
      )}

      {/* ================= MOBILE FULLSCREEN SHEET (< MD) — FLYTODAY STYLE ================= */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="md:hidden fixed inset-0 z-[150] bg-surface flex flex-col animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          {/* Mobile Sheet Top Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-paper/80 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-mint grid place-items-center text-brand-dark">
                <MapPin size={16} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-black text-ink leading-tight">{label}</h3>
                <span className="text-[11px] text-sub font-medium">
                  {lt(locale, {
                    fa: 'نام شهر یا کد فرودگاه را جستجو کنید',
                    en: 'Search city or airport code',
                    ar: 'ابحث عن المدينة أو رمز المطار',
                    zh: '搜索城市或机场三字码',
                    ru: 'Поиск города или кода аэропорта',
                  })}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-9 h-9 rounded-full bg-soft text-ink grid place-items-center active:scale-95 transition"
              aria-label={lt(locale, { fa: 'بستن', en: 'Close', ar: 'إغلاق', zh: '关闭', ru: 'Закрыть' })}
            >
              <X size={18} />
            </button>
          </div>

          {/* Search Input in Mobile Sheet */}
          <div className="p-3 border-b border-line bg-surface">
            <div className="relative flex items-center bg-soft rounded-2xl px-3.5 py-2.5 border border-line/80 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30">
              <Search size={16} className="text-sub shrink-0 me-2" />
              <input
                ref={mobileInputRef}
                type="text"
                value={mobileSearchQuery}
                onChange={(e) => setMobileSearchQuery(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-transparent border-0 outline-none p-0 text-sm font-bold text-ink placeholder:text-sub"
              />
              {mobileSearchQuery && (
                <button
                  type="button"
                  onClick={() => setMobileSearchQuery('')}
                  className="w-6 h-6 rounded-full bg-line/60 text-sub grid place-items-center"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Popular Cities Chips (FlyToday style quick access) */}
          {!mobileSearchQuery && (
            <div className="px-4 py-3 border-b border-line/60 bg-paper">
              <span className="text-[11px] font-black text-sub block mb-2">
                {lt(locale, {
                  fa: 'شهرهای پرتردد',
                  en: 'Popular Cities',
                  ar: 'المدن الأكثر طلباً',
                  zh: '热门城市',
                  ru: 'Популярные города',
                })}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {popularCities.map((pc) => {
                  const name = locale === 'fa' ? pc.nameFa : pc.nameEn;
                  return (
                    <button
                      key={pc.id}
                      type="button"
                      onClick={() => handleSelect(name)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-line hover:border-brand text-xs font-bold text-ink active:scale-95 transition shadow-2xs"
                    >
                      <span>{name}</span>
                      <span className="text-[10px] font-mono text-brand-dark font-black">
                        {pc.airportCode}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filtered Cities List in Mobile Sheet */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <div className="px-2 py-1 text-[11px] font-bold text-sub">
              {mobileSearchQuery
                ? lt(locale, {
                    fa: `نتایج جستجو (${filteredCities.length} مورد)`,
                    en: `Results (${filteredCities.length})`,
                    ar: `النتائج (${filteredCities.length})`,
                    zh: `搜索结果 (${filteredCities.length})`,
                    ru: `Результаты (${filteredCities.length})`,
                  })
                : lt(locale, {
                    fa: `همه شهرهای ${countryNameL(country, locale)}`,
                    en: `All cities in ${countryNameL(country, locale)}`,
                    ar: `جميع مدن ${countryNameL(country, locale)}`,
                    zh: `${countryNameL(country, locale)} 的所有城市`,
                    ru: `Все города: ${countryNameL(country, locale)}`,
                  })}
            </div>

            {filteredCities.length === 0 ? (
              <div className="py-12 text-center text-sub">
                <Plane size={32} className="mx-auto text-line mb-2" />
                <p className="text-xs font-bold">
                  {lt(locale, {
                    fa: 'شهری با این مشخصات یافت نشد',
                    en: 'No cities found matching your query',
                    ar: 'لم يتم العثور على مدينة مطابقة',
                    zh: '未找到匹配城市',
                    ru: 'Городов не найдено',
                  })}
                </p>
              </div>
            ) : (
              filteredCities.map((city) => {
                const cityName = locale === 'fa' ? city.nameFa : city.nameEn;
                const isSelected = value === cityName;
                return (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleSelect(cityName)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl transition text-start border ${
                      isSelected
                        ? 'bg-mint border-brand/40 text-brand-dark'
                        : 'bg-surface border-transparent hover:bg-soft text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl grid place-items-center ${isSelected ? 'bg-brand text-surface' : 'bg-soft text-brand-dark'}`}>
                        <MapPin size={16} />
                      </div>
                      <div>
                        <div className="text-[13.5px] font-black leading-tight flex items-center gap-1.5">
                          <span>{cityName}</span>
                          {city.nameEn !== cityName && (
                            <span className="text-[11px] font-normal text-sub">
                              {city.nameEn}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-sub font-medium">
                          {city.countryId ? countryNameL(city.countryId, locale) : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded-lg bg-soft font-mono font-black text-xs text-brand-dark">
                        {city.airportCode}
                      </span>
                      <ChevronRight size={14} className="text-sub/50 rtl:rotate-180" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
