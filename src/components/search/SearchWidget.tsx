'use client';

import { useCountryStore } from '@/stores/country-store';
import { countryName } from '@/lib/countries';
import { JalaliDatePicker } from '@/components/ui/DatePicker';
import { Search, X, ArrowLeftRight, Sparkles, Compass } from 'lucide-react';
import { CityAutocomplete } from './CityAutocomplete';
import { TravelerPicker } from './TravelerPicker';
import { SearchModeTabs } from './SearchModeTabs';
import { useSearchFormState } from './hooks/useSearchFormState';

export function SearchWidget() {
  const { country } = useCountryStore();
  const {
    tab,
    setTab,
    query,
    setQuery,
    dest,
    setDest,
    routeTo,
    setRouteTo,
    date1,
    setDate1,
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

  return (
    <div className="w-full max-w-5xl mx-auto relative z-[60]">
      {error && (
        <div className="mb-3 flex items-center gap-2 px-4 py-3 rounded-2xl bg-surface/95 border border-destructive/30 text-destructive text-sm font-bold shadow-md animate-in fade-in slide-in-from-top-2">
          <X size={16} /> {error}
        </div>
      )}
      <div className="glass-card rounded-3xl p-4 sm:p-6 md:p-7 shadow-elev-3 overflow-visible">
        {/* Tab Selection */}
        <SearchModeTabs activeTab={tab} onTabChange={setTab} />

        {/* Dynamic Search Fields Container with 12-column grid */}
        <form onSubmit={submit} className="relative grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3 items-stretch">
          {tab === 'plan' ? (
            /* AI Plan Mode Input (10 cols prompt + 2 cols button) */
            <>
              <div className="md:col-span-10 relative flex items-center min-h-[58px] px-4 rounded-2xl bg-surface border border-brand/40 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand shadow-sm transition">
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
                className="md:col-span-2 min-h-[58px] px-6 rounded-2xl bg-action hover:bg-gold-light text-[#14201f] text-[15px] font-black shadow-elev-1 hover:shadow-elev-2 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Search size={18} />
                <span>{t('btnPlan')}</span>
              </button>
            </>
          ) : tab === 'flights' ? (
            /* Flights Mode (3 cols Origin + 3 cols Dest + 2 cols Date + 2 cols Travelers + 2 cols CTA = 12 cols) */
            <>
              {/* Origin */}
              <div className="md:col-span-3 relative">
                <CityAutocomplete
                  value={dest}
                  onChange={(val) => {
                    setDest(val);
                    if (error) setError('');
                  }}
                  label={t('from')}
                  placeholder={t('fromPlaceholder')}
                  id="search-from-input"
                />

                {/* Floating Swap button on desktop */}
                <button
                  type="button"
                  onClick={swap}
                  aria-label={t('swap')}
                  className="hidden md:grid absolute top-1/2 -translate-y-1/2 rtl:-left-3.5 ltr:-right-3.5 z-20 w-7 h-7 place-items-center rounded-full bg-surface border border-line shadow-md text-brand-dark hover:bg-mint hover:scale-110 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <ArrowLeftRight size={13} />
                </button>
              </div>

              {/* Destination */}
              <div className="md:col-span-3">
                <CityAutocomplete
                  value={routeTo}
                  onChange={(val) => {
                    setRouteTo(val);
                    if (error) setError('');
                  }}
                  label={t('to')}
                  placeholder={t('toPlaceholder')}
                  id="search-to-input"
                />
              </div>

              {/* Departure Date */}
              <div className="md:col-span-2">
                <JalaliDatePicker
                  value={date1}
                  onChange={(val) => setDate1(val || '')}
                  label={t('departDate')}
                  id="search-flight-depart-date"
                />
              </div>

              {/* Passengers */}
              <div className="md:col-span-2">
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

              {/* Search CTA */}
              <button
                type="submit"
                className="md:col-span-2 min-h-[58px] px-6 rounded-2xl bg-action hover:bg-gold-light text-[#14201f] text-[15px] font-black shadow-elev-1 hover:shadow-elev-2 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Search size={18} />
                <span>{t('btnSearch')}</span>
              </button>
            </>
          ) : tab === 'hotels' ? (
            /* Hotels Mode (4 cols Destination + 3 cols Date + 3 cols Guests + 2 cols CTA = 12 cols) */
            <>
              {/* Hotel City / Destination */}
              <div className="md:col-span-4">
                <CityAutocomplete
                  value={dest}
                  onChange={(val) => {
                    setDest(val);
                    if (error) setError('');
                  }}
                  label={t('destination')}
                  placeholder={t('destPlaceholder', { country: countryName(country, locale) })}
                  id="search-hotel-city-input"
                />
              </div>

              {/* Check-in Date */}
              <div className="md:col-span-3">
                <JalaliDatePicker
                  value={date1}
                  onChange={(val) => setDate1(val || '')}
                  label={locale === 'en' ? 'Check-in Date' : 'تاریخ ورود'}
                  id="search-hotel-checkin-date"
                />
              </div>

              {/* Guests & Rooms */}
              <div className="md:col-span-3">
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

              {/* Search CTA */}
              <button
                type="submit"
                className="md:col-span-2 min-h-[58px] px-6 rounded-2xl bg-action hover:bg-gold-light text-[#14201f] text-[15px] font-black shadow-elev-1 hover:shadow-elev-2 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Search size={18} />
                <span>{t('btnSearch')}</span>
              </button>
            </>
          ) : (
            /* Tours Mode (4 cols Destination + 2 cols TourType + 2 cols Date + 2 cols Travelers + 2 cols CTA = 12 cols) */
            <>
              {/* Tour Destination */}
              <div className="md:col-span-4">
                <CityAutocomplete
                  value={dest}
                  onChange={(val) => {
                    setDest(val);
                    if (error) setError('');
                  }}
                  label={t('destination')}
                  placeholder={t('destPlaceholder', { country: countryName(country, locale) })}
                  id="search-tour-city-input"
                />
              </div>

              {/* Tour Category */}
              <div className="md:col-span-2 relative min-h-[58px] px-3.5 py-2 rounded-2xl bg-surface border border-line/80 hover:border-brand focus-within:border-brand focus-within:ring-2 focus-within:ring-brand flex items-center gap-2.5 transition">
                <Compass size={18} className="text-brand-dark shrink-0" aria-hidden="true" />
                <div className="w-full min-w-0 flex flex-col justify-center">
                  <label htmlFor="search-tour-type" className="block text-[11px] font-bold text-sub select-none leading-none mb-1">
                    {t('tourCategory')}
                  </label>
                  <select
                    id="search-tour-type"
                    value={tourType}
                    onChange={(e) => setTourType(e.target.value)}
                    className="w-full bg-transparent border-0 outline-0 p-0 text-[13px] font-bold text-ink appearance-none cursor-pointer leading-tight focus:ring-0"
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

              {/* Tour Date */}
              <div className="md:col-span-2">
                <JalaliDatePicker
                  value={date1}
                  onChange={(val) => setDate1(val || '')}
                  label={t('departDate')}
                  id="search-tour-date"
                />
              </div>

              {/* Tour Travelers */}
              <div className="md:col-span-2">
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

              {/* Search CTA */}
              <button
                type="submit"
                className="md:col-span-2 min-h-[58px] px-6 rounded-2xl bg-action hover:bg-gold-light text-[#14201f] text-[15px] font-black shadow-elev-1 hover:shadow-elev-2 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Search size={18} />
                <span>{t('btnSearch')}</span>
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
