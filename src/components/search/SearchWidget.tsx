'use client';

import { useCountryStore } from '@/stores/country-store';
import { countryName } from '@/lib/countries';
import { dualDate } from '@/lib/jalali';
import { JalaliDatePicker } from '@/components/ui/DatePicker';
import {
  CalendarDays, Search, X, ArrowLeftRight, Sparkles, Compass
} from 'lucide-react';
import { CityAutocomplete } from './CityAutocomplete';
import { TravelerPicker } from './TravelerPicker';
import { SearchModeTabs } from './SearchModeTabs';
import { useSearchFormState } from './hooks/useSearchFormState';

export function SearchWidget() {
  const { country } = useCountryStore();
  const {
    tab,
    setTab,
    tabDef,
    query,
    setQuery,
    dest,
    setDest,
    routeTo,
    setRouteTo,
    date1,
    setDate1,
    date2,
    setDate2,
    adults,
    setAdults,
    children,
    setChildren,
    rooms,
    setRooms,
    guestOpen,
    setGuestOpen,
    error,
    setError,
    tourType,
    setTourType,
    submit,
    swap,
    t,
    locale,
  } = useSearchFormState();

  const fieldCls =
    'min-h-[58px] flex items-center gap-3 px-3 rounded-xl bg-surface border border-line/80 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand transition';

  return (
    <div className="w-full max-w-4xl mx-auto relative z-[60]">
      {error && (
        <div className="mb-3 flex items-center gap-2 px-4 py-3 rounded-2xl bg-surface/95 border border-destructive/30 text-destructive text-sm font-bold shadow-md animate-in fade-in slide-in-from-top-2">
          <X size={16} /> {error}
        </div>
      )}
      <div className="glass-card rounded-3xl p-5 md:p-7 shadow-elev-3 overflow-visible">
        {/* Tab Selection */}
        <SearchModeTabs currentTab={tab} onTabChange={setTab} />

        {/* Dynamic Search Fields Container */}
        <form onSubmit={submit} className="relative grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          {tab === 'plan' ? (
            /* AI Plan Mode Input */
            <div className="md:col-span-5 relative">
              <div className="min-h-[58px] flex items-center gap-3 px-4 rounded-xl bg-surface border border-brand/30 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand transition">
                <Sparkles size={20} className="text-gold shrink-0 animate-pulse" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('promptPlaceholder')}
                  className="w-full border-0 outline-0 p-0 text-sm font-bold text-ink placeholder:text-sub bg-transparent"
                  id="search-ai-prompt-input"
                />
              </div>
            </div>
          ) : (
            /* Flights / Hotels / Tours Inputs */
            <>
              {/* Origin / Destination Autocomplete */}
              <div className={`${fieldCls} ${tabDef.routeMode ? 'md:col-span-2' : tab === 'tours' ? 'md:col-span-2' : 'md:col-span-3'}`}>
                <CityAutocomplete
                  value={dest}
                  onChange={(val) => {
                    setDest(val);
                    if (error) setError('');
                  }}
                  label={tabDef.routeMode ? t('from') : t('destination')}
                  placeholder={
                    tabDef.routeMode
                      ? t('fromPlaceholder')
                      : t('destPlaceholder', { country: countryName(country, locale) })
                  }
                  id="search-dest-input"
                />
              </div>

              {/* Tour category selector */}
              {tab === 'tours' && (
                <div className={`${fieldCls} md:col-span-1`}>
                  <Compass size={18} className="text-brand-dark shrink-0" />
                  <div className="w-full min-w-0">
                    <label className="block mb-0.5 text-[11px] font-bold text-sub">
                      {t('tourCategory')}
                    </label>
                    <select
                      value={tourType}
                      onChange={(e) => setTourType(e.target.value)}
                      className="w-full border-0 outline-0 p-0 text-[13px] font-bold text-ink bg-transparent appearance-none cursor-pointer"
                    >
                      <option value="recreational">{t('tourRecreational')}</option>
                      <option value="cultural">{t('tourCultural')}</option>
                      <option value="nature">{t('tourNature')}</option>
                      <option value="medical">{t('tourMedical')}</option>
                      <option value="adventure">{t('tourAdventure')}</option>
                      <option value="commercial">{t('tourCommercial')}</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Route Destination */}
              {tabDef.routeMode && (
                <div className={`${fieldCls} md:col-span-2`}>
                  <CityAutocomplete
                    value={routeTo}
                    onChange={(val) => {
                      setRouteTo(val);
                      if (error) setError('');
                    }}
                    label={t('to')}
                    placeholder={t('toPlaceholder')}
                    id="search-route-to-input"
                  />
                </div>
              )}

              {/* Floating Swap button */}
              {tabDef.routeMode && (
                <button
                  type="button"
                  onClick={swap}
                  aria-label={t('swap')}
                  className="hidden md:grid absolute top-[24px] rtl:right-[33.333%] ltr:left-[33.333%] rtl:translate-x-1/2 ltr:-translate-x-1/2 z-30 w-9 h-9 place-items-center rounded-full bg-surface border border-line/70 shadow-md text-brand-dark hover:bg-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rtl:-scale-x-100"
                >
                  <ArrowLeftRight size={15} />
                </button>
              )}

              {/* Departure / Check-in Date */}
              <div className={`${fieldCls} ${tabDef.routeMode ? 'md:col-span-1' : tab === 'tours' ? 'md:col-span-2' : 'md:col-span-1'}`}>
                <CalendarDays size={18} className="text-brand-dark shrink-0" />
                <div className="w-full min-w-0">
                  <label className="block mb-0.5 text-[11px] font-bold text-sub">
                    {tab === 'hotels' ? (locale === 'en' ? 'Check-in' : 'ورود') : t('departDate')}
                  </label>
                  <JalaliDatePicker value={date1} onChange={(val) => setDate1(val || '')} />
                  {date1 && (
                    <span className="block text-[10px] font-bold text-sub truncate">
                      {dualDate(date1).j}
                    </span>
                  )}
                </div>
              </div>

              {/* Guests / Rooms Picker */}
              <div className={`${tabDef.routeMode ? 'md:col-span-1' : tab === 'tours' ? 'md:col-span-1' : 'md:col-span-1'}`}>
                <TravelerPicker
                  adults={adults}
                  setAdults={setAdults}
                  childrenCount={children}
                  setChildrenCount={setChildren}
                  rooms={rooms}
                  setRooms={setRooms}
                  open={guestOpen}
                  setOpen={setGuestOpen}
                />
              </div>
            </>
          )}

          {/* Search Submit CTA */}
          <button
            type="submit"
            className="min-h-[58px] px-6 rounded-xl bg-action hover:bg-action-hover text-[#14201f] text-[15px] font-black shadow-md transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:scale-[0.98] md:col-span-1"
          >
            <Search size={18} />
            <span>{tab === 'plan' ? t('btnPlan') : t('btnSearch')}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
