'use client';

import { X } from 'lucide-react';
import { SearchModeTabs } from './SearchModeTabs';
import { useSearchFormState } from './hooks/useSearchFormState';
import { PlanSearchForm } from './forms/PlanSearchForm';
import { FlightSearchForm } from './forms/FlightSearchForm';
import { HotelSearchForm } from './forms/HotelSearchForm';
import { TourSearchForm } from './forms/TourSearchForm';

export function SearchWidget() {
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

        {/* Dynamic Search Subforms Container */}
        <form onSubmit={submit} className="relative grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3 items-stretch">
          {tab === 'plan' && (
            <PlanSearchForm query={query} setQuery={setQuery} />
          )}

          {tab === 'flights' && (
            <FlightSearchForm
              dest={dest}
              setDest={setDest}
              routeTo={routeTo}
              setRouteTo={setRouteTo}
              date1={date1}
              setDate1={setDate1}
              adults={adults}
              setAdults={setAdults}
              childrenCount={children}
              setChildrenCount={setChildren}
              rooms={rooms}
              setRooms={setRooms}
              guestOpen={guestOpen}
              setGuestOpen={setGuestOpen}
              swap={swap}
              locale={locale}
              onErrorClear={() => error && setError('')}
            />
          )}

          {tab === 'hotels' && (
            <HotelSearchForm
              dest={dest}
              setDest={setDest}
              date1={date1}
              setDate1={setDate1}
              adults={adults}
              setAdults={setAdults}
              childrenCount={children}
              setChildrenCount={setChildren}
              rooms={rooms}
              setRooms={setRooms}
              guestOpen={guestOpen}
              setGuestOpen={setGuestOpen}
              locale={locale}
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
