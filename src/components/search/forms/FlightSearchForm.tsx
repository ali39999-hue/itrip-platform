'use client';

import { useState } from 'react';
import { Search, ArrowLeftRight, Plus } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { lt } from '@/lib/lt';
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
  const locale = useLocale();
  const [tripType, setTripType] = useState<'round' | 'oneWay'>('oneWay');
  const [swapped, setSwapped] = useState(false);

  function handleSwap() {
    setSwapped((prev) => !prev);
    swap();
  }

  return (
    <>
      {/* Trip Type Selector (One-Way / Round-Trip) — Alibaba & FlyToday Standard */}
      <div className="col-span-1 sm:col-span-12 flex items-center justify-between pb-1">
        <div
          role="radiogroup"
          aria-label={t('roundTrip')}
          className="inline-flex items-center p-1 rounded-xl bg-soft border border-line text-xs font-black"
        >
          <button
            type="button"
            role="radio"
            aria-checked={tripType === 'oneWay'}
            onClick={() => {
              setTripType('oneWay');
              setDate2('');
            }}
            className={`min-h-[36px] px-4 py-1.5 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none cursor-pointer ${
              tripType === 'oneWay'
                ? 'bg-surface text-brand-dark shadow-xs'
                : 'text-sub hover:text-ink'
            }`}
          >
            {t('oneWay')}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={tripType === 'round'}
            onClick={() => {
              setTripType('round');
              if (!date2 && date1) {
                const d = new Date(date1);
                d.setDate(d.getDate() + 3);
                setDate2(d.toISOString().slice(0, 10));
              }
            }}
            className={`min-h-[36px] px-4 py-1.5 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none cursor-pointer ${
              tripType === 'round'
                ? 'bg-surface text-brand-dark shadow-xs'
                : 'text-sub hover:text-ink'
            }`}
          >
            {t('roundTrip')}
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
          onClick={handleSwap}
          aria-label={t('swap')}
          className={`hidden sm:grid absolute top-1/2 -translate-y-1/2 -end-4 z-30 w-8 h-8 place-items-center rounded-full bg-surface border border-line shadow-elev-2 text-brand-dark hover:bg-mint hover:scale-110 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer ${
            swapped ? 'rotate-180' : ''
          }`}
        >
          <ArrowLeftRight size={13} aria-hidden="true" />
        </button>

        {/* Floating Swap button on Mobile only (< sm, vertical stack) */}
        <button
          type="button"
          onClick={handleSwap}
          aria-label={t('swap')}
          className={`sm:hidden grid absolute -bottom-5.5 end-5 z-30 w-11 h-11 place-items-center rounded-full bg-surface border border-line shadow-md text-brand-dark active:scale-95 hover:bg-mint transition-transform duration-300 cursor-pointer ${
            swapped ? 'rotate-180' : ''
          }`}
        >
          <ArrowLeftRight size={16} className="rotate-90" aria-hidden="true" />
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
          className="ps-3.5 sm:ps-5"
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
            onClick={() => {
              setTripType('round');
              if (!date2 && date1) {
                const d = new Date(date1);
                d.setDate(d.getDate() + 3);
                setDate2(d.toISOString().slice(0, 10));
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setTripType('round');
                if (!date2 && date1) {
                  const d = new Date(date1);
                  d.setDate(d.getDate() + 3);
                  setDate2(d.toISOString().slice(0, 10));
                }
              }
            }}
            aria-label={lt(locale, { fa: 'افزودن تاریخ برگشت', en: 'Add return date', ar: 'إضافة تاريخ العودة', zh: '添加返程日期', ru: 'Добавить дату возврата' })}
            className="w-full min-h-[58px] px-3.5 py-2 rounded-2xl bg-soft/60 border border-dashed border-line text-sub flex items-center justify-center cursor-pointer hover:border-brand/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition group select-none"
          >
            <span className="text-xs font-bold text-sub group-hover:text-brand-dark flex items-center gap-1.5">
              <Plus size={13} className="text-brand-dark" />
              <span>{lt(locale, { fa: 'افزودن تاریخ برگشت', en: 'Add return date', ar: 'إضافة تاريخ العودة', zh: '添加返程日期', ru: 'Добавить дату возврата' })}</span>
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
        className="col-span-1 sm:col-span-6 lg:col-span-2 min-h-[58px] px-6 rounded-2xl bg-action hover:bg-action-hover text-ink text-[15px] font-black shadow-elev-1 hover:shadow-elev-2 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <Search size={18} />
        <span>{t('btnFlights')}</span>
      </button>
    </>
  );
}
