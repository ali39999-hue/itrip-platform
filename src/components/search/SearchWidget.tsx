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

export function SearchWidget({ initialTab = 'plan' }: SearchWidgetProps) {
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
        <div className="mb-3 flex items-center gap-2 px-4 py-3 rounded-2xl bg-surface/95 border border-destructive/30 text-destructive text-sm font-bold shadow-md animate-in fade-in slide-in-from-top-2">
          <X size={16} /> {error}
        </div>
      )}

      <div className="rounded-3xl p-4 md:p-6 shadow-elev-3 transition-all border border-line/80 bg-surface/95 backdrop-blur-xl">
        <SearchModeTabs activeTab={tab} onTabChange={setTab} />

        <form onSubmit={submit} className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
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
