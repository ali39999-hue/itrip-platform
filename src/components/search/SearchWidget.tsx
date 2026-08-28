'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useCountryStore } from '@/stores/country-store';
import { countryName } from '@/lib/countries';
import { dualDate } from '@/lib/jalali';
import { JalaliDatePicker } from '@/components/ui/DatePicker';
import {
  CalendarDays, Search, X, ArrowLeftRight, Sparkles, Compass, CheckCircle2
} from 'lucide-react';
import { CityAutocomplete } from './CityAutocomplete';
import { TravelerPicker } from './TravelerPicker';
import { SearchModeTabs, SEARCH_TABS, type SearchTabId } from './SearchModeTabs';

const ROUTES: Record<SearchTabId, string> = {
  plan: '/plan',
  flights: '/flights/search',
  hotels: '/hotels/search',
  tours: '/tours',
};

export function SearchWidget() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Search');
  const { country } = useCountryStore();

  const [tab, setTab] = useState<SearchTabId>('plan');
  const [query, setQuery] = useState('');
  const [dest, setDest] = useState('');
  const [routeTo, setRouteTo] = useState('');
  const [date1, setDate1] = useState('');
  const [date2, setDate2] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [guestOpen, setGuestOpen] = useState(false);
  const [error, setError] = useState('');
  const [tourType, setTourType] = useState('recreational');

  const tabDef = SEARCH_TABS.find((tb) => tb.id === tab)!;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (tab === 'plan') {
      if (!query.trim()) {
        router.push('/plan');
      } else {
        router.push(`/plan?q=${encodeURIComponent(query)}`);
      }
      return;
    }

    if (!dest.trim()) {
      setError(tabDef.routeMode ? t('errFrom') : t('errDest'));
      return;
    }
    if (tabDef.routeMode && !routeTo.trim()) {
      setError(t('errDest'));
      return;
    }
    setError('');

    let q = '';
    if (tabDef.routeMode) {
      q = `?from=${encodeURIComponent(dest)}&to=${encodeURIComponent(routeTo)}`;
      if (date1) q += `&depart=${encodeURIComponent(date1)}`;
      if (date2) q += `&return=${encodeURIComponent(date2)}`;
      q += `&adults=${adults}&children=${children}`;
    } else if (tab === 'hotels') {
      q = `?city=${encodeURIComponent(dest)}`;
      if (date1) q += `&checkin=${encodeURIComponent(date1)}`;
      if (date2) q += `&checkout=${encodeURIComponent(date2)}`;
      q += `&rooms=${rooms}&adults=${adults}`;
    } else {
      q = `?city=${encodeURIComponent(dest)}&type=${encodeURIComponent(tourType)}`;
    }

    router.push(`${ROUTES[tab]}${q}`);
  }

  function swap() {
    const temp = dest;
    setDest(routeTo);
    setRouteTo(temp);
  }

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
        {/* Segmented Tabs */}
        <SearchModeTabs
          activeTab={tab}
          onTabChange={(newTab) => {
            setTab(newTab);
            setError('');
          }}
        />

        <form
          onSubmit={submit}
          noValidate
          className={`grid grid-cols-1 ${
            tab === 'plan'
              ? 'md:grid-cols-[1fr_auto]'
              : tab === 'tours'
              ? 'md:grid-cols-7'
              : 'md:grid-cols-6'
          } gap-3 relative`}
        >
          {tab === 'plan' ? (
            <div className={`${fieldCls} md:col-span-1 shadow-inner bg-soft/50`}>
              <Sparkles size={20} className="text-brand shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('planPlaceholder')}
                className="w-full h-full border-0 outline-0 p-0 text-[15px] font-bold text-ink bg-transparent placeholder:text-sub"
              />
            </div>
          ) : (
            <>
              {/* Origin / Destination Autocomplete */}
              <div className={`${fieldCls} md:col-span-2`}>
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
                      {locale === 'en' ? 'Tour Type' : 'نوع تور'}
                    </label>
                    <select
                      value={tourType}
                      onChange={(e) => setTourType(e.target.value)}
                      className="w-full border-0 outline-0 p-0 text-[13px] font-bold text-ink bg-transparent appearance-none cursor-pointer"
                    >
                      <option value="recreational">{locale === 'en' ? 'Recreational' : 'تفریحی'}</option>
                      <option value="medical">{locale === 'en' ? 'Medical' : 'درمانی'}</option>
                      <option value="commercial">{locale === 'en' ? 'Commercial' : 'تجاری'}</option>
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

              {/* Departure Date */}
              <div className={`${fieldCls} ${tab === 'tours' ? 'md:col-span-2' : 'md:col-span-1'}`}>
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
              <div className={`${tab === 'tours' ? 'md:col-span-2' : 'md:col-span-1'}`}>
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
            className="min-h-[58px] px-6 rounded-xl bg-action hover:bg-action-hover text-[#14201f] text-[15px] font-black shadow-md transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:scale-[0.98]"
          >
            <Search size={18} />
            <span>{tab === 'plan' ? t('btnPlan') : t('btnSearch')}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
