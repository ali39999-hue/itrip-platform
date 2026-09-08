'use client';

import { useState } from 'react';
import { Search, ArrowLeftRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CityAutocomplete } from '../CityAutocomplete';
import { JalaliDatePicker } from '@/components/ui/DatePicker';
import { TravelerPicker } from '../TravelerPicker';

interface FlightSearchFormProps {
  dest: string;
  setDest: (val: string) => void;
  routeTo: string;
  setRouteTo: (val: string) => void;
  date1: string;
  setDate1: (val: string) => void;
  adults: number;
  setAdults: React.Dispatch<React.SetStateAction<number>>;
  childrenCount: number;
  setChildrenCount: React.Dispatch<React.SetStateAction<number>>;
  rooms: number;
  setRooms: React.Dispatch<React.SetStateAction<number>>;
  date2: string;
  setDate2: (val: string) => void;
  guestOpen: boolean;
  setGuestOpen: (val: boolean) => void;
  swap: () => void;
  onErrorClear?: () => void;
}

export function FlightSearchForm({
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
  childrenCount,
  setChildrenCount,
  rooms,
  setRooms,
  guestOpen,
  setGuestOpen,
  swap,
  onErrorClear,
}: FlightSearchFormProps) {
  const t = useTranslations('Search');
  const [tripType, setTripType] = useState<'round' | 'oneWay'>('round');

  return (
    <>
      {/* Trip Type Selector (One-Way / Round-Trip) */}
      <div className="col-span-1 sm:col-span-12 flex items-center justify-between pb-1">
        <div
          role="radiogroup"
          aria-label={t('roundTrip')}
          className="inline-flex items-center p-1 rounded-xl bg-soft border border-line text-xs font-black"
        >
          <button
            type="button"
            role="radio"
            aria-checked={tripType === 'round'}
            onClick={() => setTripType('round')}
            className={`min-h-[36px] px-4 py-1.5 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
              tripType === 'round'
                ? 'bg-surface text-brand-dark shadow-xs'
                : 'text-sub hover:text-ink'
            }`}
          >
            {t('roundTrip')}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={tripType === 'oneWay'}
            onClick={() => {
              setTripType('oneWay');
              setDate2('');
            }}
            className={`min-h-[36px] px-4 py-1.5 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
              tripType === 'oneWay'
                ? 'bg-surface text-brand-dark shadow-xs'
                : 'text-sub hover:text-ink'
            }`}
          >
            {t('oneWay')}
          </button>
        </div>
      </div>

      {/* Origin */}
      <div className="col-span-1 sm:col-span-6 lg:col-span-2 relative">
        <CityAutocomplete
          value={dest}
          onChange={(val) => {
            setDest(val);
            onErrorClear?.();
          }}
          label={t('from')}
          placeholder={t('fromPlaceholder')}
          id="search-from-input"
          className="pe-7 sm:pe-8"
        />

        {/* Floating Swap button on Tablet & Desktop (horizontal alignment) */}
        <button
          type="button"
          onClick={swap}
          aria-label={t('swap')}
          className="hidden sm:grid absolute top-1/2 -translate-y-1/2 -end-3.5 z-20 w-7 h-7 place-items-center rounded-full bg-surface border border-line shadow-elev-2 text-brand-dark hover:bg-mint hover:scale-110 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
        >
          <ArrowLeftRight size={13} aria-hidden="true" />
        </button>

        {/* Floating Swap button on Mobile only (< sm, vertical stack) */}
        <button
          type="button"
          onClick={swap}
          aria-label={t('swap')}
          className="sm:hidden grid absolute -bottom-3.5 end-5 z-20 w-8 h-8 place-items-center rounded-full bg-surface border border-line shadow-md text-brand-dark active:rotate-180 hover:bg-mint transition-transform duration-300 cursor-pointer"
        >
          <ArrowLeftRight size={14} className="rotate-90" aria-hidden="true" />
        </button>
      </div>

      {/* Destination */}
      <div className="col-span-1 sm:col-span-6 lg:col-span-2">
        <CityAutocomplete
          value={routeTo}
          onChange={(val) => {
            setRouteTo(val);
            onErrorClear?.();
          }}
          label={t('to')}
          placeholder={t('toPlaceholder')}
          id="search-to-input"
          className="ps-3.5 sm:ps-7"
        />
      </div>

      {/* Depart Date */}
      <div className="col-span-1 sm:col-span-6 lg:col-span-2">
        <JalaliDatePicker
          value={date1}
          onChange={(d) => setDate1(d || '')}
          label={t('dateDepart')}
          id="search-date-depart"
        />
      </div>

      {/* Return Date (Enabled only for round-trip) */}
      <div className="col-span-1 sm:col-span-6 lg:col-span-2">
        {tripType === 'round' ? (
          <JalaliDatePicker
            value={date2}
            onChange={(d) => setDate2(d || '')}
            label={t('dateReturn')}
            id="search-date-return"
          />
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() => setTripType('round')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setTripType('round');
              }
            }}
            aria-label={`${t('dateReturn')} (${t('roundTrip')})`}
            className="w-full min-h-[58px] px-3.5 py-2 rounded-2xl bg-soft/60 border border-dashed border-line text-sub flex items-center justify-center cursor-pointer hover:border-brand/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition group"
          >
            <span className="text-xs font-bold group-hover:text-brand-dark">
              + {t('dateReturn')} ({t('roundTrip')})
            </span>
          </div>
        )}
      </div>

      {/* Passengers */}
      <div className="col-span-1 sm:col-span-6 lg:col-span-2 relative">
        <TravelerPicker
          open={guestOpen}
          setOpen={setGuestOpen}
          adults={adults}
          setAdults={setAdults}
          childrenCount={childrenCount}
          setChildrenCount={setChildrenCount}
          rooms={rooms}
          setRooms={setRooms}
          showRooms={false}
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="col-span-1 sm:col-span-6 lg:col-span-2 min-h-[58px] px-6 rounded-2xl bg-action hover:bg-action-hover text-ink text-[15px] font-black shadow-elev-1 hover:shadow-elev-2 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        <Search size={18} />
        <span>{t('btnFlights')}</span>
      </button>
    </>
  );
}
