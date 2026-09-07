'use client';

import { X } from 'lucide-react';
import { SearchModeTabs, type SearchTabId } from './SearchModeTabs';
import { useSearchFormState } from './hooks/useSearchFormState';
import { PlanSearchForm } from './forms/PlanSearchForm';
import { FlightSearchForm } from './forms/FlightSearchForm';
import { HotelSearchForm } from './forms/HotelSearchForm';
import { TourSearchForm } from './forms/TourSearchForm';

export interface SearchWidgetProps {
  initialTab?: SearchTabId;
}

export function SearchWidget({ initialTab = 'flights' }: SearchWidgetProps) {
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
  } = useSearchFormState(initialTab);

  return (
    <div className="w-full max-w-5xl mx-auto relative z-[60]">
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-3 flex items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-surface/95 border border-destructive/30 text-destructive text-sm font-bold shadow-md animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-2">
            <X size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            className="p-1 text-destructive/80 hover:text-destructive active:scale-95 transition"
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="rounded-3xl p-4 md:p-6 shadow-elev-3 transition-all border border-line/80 bg-surface/95 backdrop-blur-xl">
        <SearchModeTabs activeTab={tab} onTabChange={setTab} />

        <form onSubmit={submit} className="relative z-10 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {tab === 'plan' && (
            <PlanSearchForm
              query={query}
              setQuery={setQuery}
            />
          )}

          {tab === 'flights' && (
            <FlightSearchForm
              dest={dest}
              setDest={setDest}
              routeTo={routeTo}
              setRouteTo={setRouteTo}
              date1={date1}
              setDate1={setDate1}
              date2={date2}
              setDate2={setDate2}
              adults={adults}
              setAdults={setAdults}
              childrenCount={children}
              setChildrenCount={setChildren}
              rooms={rooms}
              setRooms={setRooms}
              guestOpen={guestOpen}
              setGuestOpen={setGuestOpen}
              swap={swap}
              onErrorClear={() => error && setError('')}
            />
          )}

          {tab === 'hotels' && (
            <HotelSearchForm
              dest={dest}
              setDest={setDest}
              date1={date1}
              setDate1={setDate1}
              date2={date2}
              setDate2={setDate2}
              adults={adults}
              setAdults={setAdults}
              childrenCount={children}
              setChildrenCount={setChildren}
              rooms={rooms}
              setRooms={setRooms}
              guestOpen={guestOpen}
              setGuestOpen={setGuestOpen}
              onErrorClear={() => error && setError('')}
            />
          )}

          {tab === 'tours' && (
            <TourSearchForm
              dest={dest}
              setDest={setDest}
              tourType={tourType}
              setTourType={setTourType}
              onErrorClear={() => error && setError('')}
            />
          )}
        </form>
      </div>
    </div>
  );
}
