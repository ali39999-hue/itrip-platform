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
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault();
              if (tripType === 'oneWay') {
                setTripType('round');
                if (!date2 && date1) {
                  const d = new Date(date1);
                  d.setDate(d.getDate() + 3);
                  setDate2(d.toISOString().slice(0, 10));
                }
              } else {
                setTripType('oneWay');
                setDate2('');
              }
            }
          }}
          className="inline-flex items-center p-1 rounded-xl bg-soft border border-line text-xs font-black"
        >
          <button
            type="button"
            role="radio"
            aria-checked={tripType === 'oneWay'}
            tabIndex={tripType === 'oneWay' ? 0 : -1}
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
            tabIndex={tripType === 'round' ? 0 : -1}
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

      {/* ========================================================================= */}
      {/* 1. MOBILE HIGH-DENSITY COMPACT SEARCH (< SM) — FLYTODAY / ALIBABA STANDARD */}
      {/* ========================================================================= */}
      <div className="col-span-1 sm:hidden flex flex-col gap-2.5">
        {/* Origin & Destination Grouped Container with Seamless Floating Swap */}
        <div className="relative rounded-2xl border border-line/80 bg-surface shadow-2xs overflow-hidden">
          {/* Origin Row */}
          <CityAutocomplete
            value={dest}
            onChange={(val) => {
              setDest(val);
              onErrorClear?.();
            }}
            label={t('from')}
            placeholder={t('fromPlaceholder')}
            id="search-from-input-mobile"
            className="!min-h-[50px] !rounded-none !border-0 !border-b !border-line/60 !py-1.5 !px-3.5 pe-12"
          />

          {/* Seamless Floating Swap Button centered on the divider */}
          <button
            type="button"
            onClick={handleSwap}
            aria-label={t('swap')}
            className={`absolute top-1/2 -translate-y-1/2 end-3 z-30 w-8 h-8 rounded-full bg-surface border border-line shadow-sm text-brand-dark hover:bg-mint active:scale-95 transition-transform duration-300 grid place-items-center cursor-pointer ${
              swapped ? 'rotate-180' : ''
            }`}
          >
            <ArrowLeftRight size={13} className="rotate-90 sm:rotate-0" aria-hidden="true" />
          </button>

          {/* Destination Row */}
          <CityAutocomplete
            value={routeTo}
            onChange={(val) => {
              setRouteTo(val);
              onErrorClear?.();
            }}
            label={t('to')}
            placeholder={t('toPlaceholder')}
            id="search-to-input-mobile"
            className="!min-h-[50px] !rounded-none !border-0 !py-1.5 !px-3.5 pe-12"
          />
        </div>

        {/* Travel Dates: 2-Column High-Density Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Depart Date */}
          <JalaliDatePicker
            value={date1}
            onChange={(d) => setDate1(d || '')}
            label={t('dateDepart')}
            id="search-date-depart-mobile"
            className="!min-h-[50px] !rounded-xl !py-1.5 !px-3"
          />

          {/* Return Date */}
          {tripType === 'round' ? (
            <JalaliDatePicker
              value={date2}
              onChange={(d) => setDate2(d || '')}
              label={t('dateReturn')}
              id="search-date-return-mobile"
              className="!min-h-[50px] !rounded-xl !py-1.5 !px-3"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setTripType('round');
                if (!date2 && date1) {
                  const d = new Date(date1);
                  d.setDate(d.getDate() + 3);
                  setDate2(d.toISOString().slice(0, 10));
                }
              }}
              aria-label={lt(locale, { fa: 'افزودن تاریخ برگشت', en: 'Add return date', ar: 'إضافة تاريخ العودة', zh: '添加返程日期', ru: 'Добавить дату возвраتا' })}
              className="w-full min-h-[50px] px-2.5 py-1.5 rounded-xl bg-soft/50 border border-dashed border-line text-sub flex flex-col items-center justify-center cursor-pointer hover:border-brand/60 active:scale-95 transition group select-none text-center"
            >
              <span className="text-[10px] font-bold text-sub group-hover:text-brand-dark flex items-center gap-1">
                <Plus size={12} className="text-brand-dark" />
                <span>{lt(locale, { fa: 'افزودن برگشت', en: 'Add return', ar: 'إضافة عودة', zh: '添加返程', ru: 'Обратно' })}</span>
              </span>
              <span className="text-[11px] font-black text-brand-dark mt-0.5">
                {t('roundTrip')}
              </span>
            </button>
          )}
        </div>

        {/* Passengers: Clean Pill Trigger Opening Bottom Sheet */}
        <div className="w-full">
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
            className="[&>button]:!min-h-[50px] [&>button]:!rounded-xl [&>button]:!py-1.5 [&>button]:!px-3.5"
          />
        </div>

        {/* Submit Flights CTA Button */}
        <button
          type="submit"
          className="w-full min-h-[50px] px-6 rounded-xl bg-action hover:bg-action-hover active:bg-action-active text-ink text-[15px] font-black shadow-elev-1 hover:shadow-elev-2 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Search size={18} strokeWidth={2.5} />
          <span>{t('btnFlights')}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. TABLET & DESKTOP SEARCH FORM (SM+)                                     */}
      {/* ========================================================================= */}
      {/* Origin */}
      <div className="hidden sm:block sm:col-span-6 xl:col-span-2 relative z-20 focus-within:z-30">
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
          className={`min-h-[44px] min-w-[44px] hidden sm:grid absolute top-1/2 -translate-y-1/2 -end-4 z-30 w-8 h-8 place-items-center rounded-full bg-surface border border-line shadow-elev-2 text-brand-dark hover:bg-mint hover:scale-110 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer ${
            swapped ? 'rotate-180' : ''
          }`}
        >
          <ArrowLeftRight size={13} aria-hidden="true" />
        </button>
      </div>

      {/* Destination */}
      <div className="hidden sm:block sm:col-span-6 xl:col-span-2 relative z-10 focus-within:z-30">
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
      <div className="hidden sm:block sm:col-span-6 xl:col-span-2 relative focus-within:z-30">
        <JalaliDatePicker
          value={date1}
          onChange={(d) => setDate1(d || '')}
          label={t('dateDepart')}
          id="search-date-depart"
        />
      </div>

      {/* Return Date (Enabled only for round-trip) */}
      <div className="hidden sm:block sm:col-span-6 xl:col-span-2 relative focus-within:z-30">
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
            aria-label={lt(locale, { fa: 'افزودن تاریخ برگشت', en: 'Add return date', ar: 'إضافة تاريخ العودة', zh: '添加返程日期', ru: 'Добавить дату возвраتا' })}
            className="w-full min-h-[58px] px-3.5 py-2 rounded-2xl bg-soft/60 border border-dashed border-line text-sub flex items-center justify-center cursor-pointer hover:border-brand/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition group select-none"
          >
            <span className="text-xs font-bold text-sub group-hover:text-brand-dark flex items-center gap-1.5">
              <Plus size={13} className="text-brand-dark" />
              <span>{lt(locale, { fa: 'افزودن تاریخ برگشت', en: 'Add return date', ar: 'إضافة تاريخ العودة', zh: '添加返程日期', ru: 'Добавить дату возвраتا' })}</span>
            </span>
          </div>
        )}
      </div>

      {/* Passengers */}
      <div className={`hidden sm:block sm:col-span-6 xl:col-span-2 relative ${guestOpen ? 'z-40' : 'focus-within:z-30'}`}>
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
        className="hidden sm:flex sm:col-span-12 xl:col-span-2 min-h-[58px] px-6 rounded-2xl bg-action hover:bg-action-hover text-ink text-[15px] font-black shadow-elev-1 hover:shadow-elev-2 active:scale-[0.98] transition-all items-center justify-center gap-2 cursor-pointer"
      >
        <Search size={18} />
        <span>{t('btnFlights')}</span>
      </button>
    </>
  );
}
